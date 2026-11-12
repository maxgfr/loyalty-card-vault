import { openDB, type IDBPDatabase } from 'idb'
import type { LoyaltyCard, AppSettings, EncryptedPayload } from '../types'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  deriveVaultKey,
  deriveVaultKeyBits,
  importVaultKey,
  ITERATIONS,
  keyFromPrf,
  newSalt,
  seal,
  unseal,
  type SealedData,
} from './crypto'
import { createPasskey, getPrfOutput } from './passkey'
import { sortByRecentUse } from './card-order'

/**
 * The vault, in IndexedDB. Every card is sealed with AES-256-GCM under a key derived from the
 * master password (PBKDF2-SHA256, 600,000 rounds). The key exists only in memory while the vault
 * is unlocked; it is never stored, nor is the password. IndexedDB belongs to the origin, which
 * every maxgfr.github.io app shares: without the password, what they can read is ciphertext.
 *
 * A vault can also have no password at all: its key is then random, and only its passkey opens it,
 * or no lock at all: the key is then kept on the device from the start ("don't ask on this device").
 * Whatever the vault has, the last way in (password, passkey or device key) can never be removed.
 *
 * Two opt-in shortcuts open the vault without typing the password:
 * - a passkey (Touch ID, Face ID, fingerprint): the key's raw bytes, sealed under a key derived from
 *   the passkey's PRF output, which only the authenticator gives back, after user verification;
 * - "don't ask on this device": the key itself (a non-extractable CryptoKey) kept in IndexedDB.
 *   Anyone holding the device, and any script of the origin, can then use it.
 */

const DB_NAME = 'loyalty-card-vault'
const DB_VERSION = 1
const CARDS_STORE = 'cards'
const SETTINGS_STORE = 'settings'
const VAULT_KEY = 'vault'
/** Sealed under the vault key to recognise the right password, even with no cards. */
const CHECK_TEXT = 'loyalty-card-vault'
const CHECK_CONTEXT = 'vault-check'
const PASSKEY_KEY = 'passkey'
const PASSKEY_CONTEXT = 'vault-passkey'
const DEVICE_KEY = 'deviceKey'

/** What the settings store keeps about the vault: never the password or the key. */
export type VaultMeta = PasswordVaultMeta | PasskeyVaultMeta

/** The key is PBKDF2-SHA256(password, salt, iterations). */
export interface PasswordVaultMeta {
  version: 1
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string
  check: SealedData
}

/** No password: the key is random, and only the passkey record opens it. */
export interface PasskeyVaultMeta {
  version: 1
  kdf: 'none'
  check: SealedData
}

/** A passkey that opens the vault: the vault key's raw bytes, sealed under its PRF output. */
export interface PasskeyRecord {
  version: 1
  /** Base64 of the credential's raw id */
  credentialId: string
  /** Base64 of the salt the PRF is evaluated with */
  prfSalt: string
  wrapped: SealedData
}

/** A card as stored: sealed under the vault key, its id authenticated with it. */
export interface SealedCard extends SealedData {
  v: 1
}

type StoredCard = SealedCard | LoyaltyCard | EncryptedPayload

interface CardVaultDB {
  cards: {
    key: string
    value: StoredCard
  }
  settings: {
    key: string
    value: AppSettings | string | boolean | number | VaultMeta | PasskeyRecord | CryptoKey
  }
}

export type VaultState = 'none' | 'locked' | 'unlocked'

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password')
    this.name = 'WrongPasswordError'
  }
}

export class VaultLockedError extends Error {
  constructor() {
    super('The vault is locked')
    this.name = 'VaultLockedError'
  }
}

/** The passkey was found, but what it unseals is not this vault's key (vault erased and set up again). */
export class PasskeyMismatchError extends Error {
  constructor() {
    super('This passkey does not open the vault')
    this.name = 'PasskeyMismatchError'
  }
}

let dbInstance: IDBPDatabase<CardVaultDB> | null = null
/**
 * The unlocked vault: its key (memory only) and metadata, and the key from the passkey's PRF output
 * once the passkey was used, to seal the vault key again without a second prompt.
 */
interface Session {
  key: CryptoKey
  meta: VaultMeta
  prfKey?: CryptoKey
}
let session: Session | null = null

async function initDB(): Promise<IDBPDatabase<CardVaultDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<CardVaultDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CARDS_STORE)) {
        db.createObjectStore(CARDS_STORE)
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE)
      }
    },
    // Another tab deleting the database (reset): let it, and reopen next time.
    blocking() {
      dbInstance?.close()
      dbInstance = null
    },
  })

  return dbInstance
}

function isSealed(value: StoredCard): value is SealedCard {
  return 'v' in value && value.v === 1 && 'iv' in value && 'data' in value
}

function isPlainCard(value: StoredCard): value is LoyaltyCard {
  return 'id' in value && 'barcodeData' in value
}

function cardContext(id: string): string {
  return `card:${id}`
}

function unlocked(): Session {
  if (!session) throw new VaultLockedError()
  return session
}

async function sealCard(key: CryptoKey, card: LoyaltyCard): Promise<SealedCard> {
  return { v: 1, ...(await seal(key, JSON.stringify(card), cardContext(card.id))) }
}

function hasPasswordMeta(meta: VaultMeta): meta is PasswordVaultMeta {
  return meta.kdf === 'PBKDF2-SHA256'
}

type Write =
  | { store: typeof CARDS_STORE; key: string; value: StoredCard }
  /** `undefined` deletes the key */
  | { store: typeof SETTINGS_STORE; key: string; value: CardVaultDB['settings']['value'] | undefined }

/**
 * Applies every write in one transaction: all or nothing. Encrypt before calling: a transaction
 * cannot wait on WebCrypto without committing early.
 * @throws the first refused write (nothing is changed then)
 */
async function writeAll(writes: Write[]): Promise<void> {
  const db = await initDB()
  const tx = db.transaction([CARDS_STORE, SETTINGS_STORE], 'readwrite')
  // Its failure is handled below, once every write has settled.
  tx.done.catch(() => {})
  const cards = tx.objectStore(CARDS_STORE)
  const settings = tx.objectStore(SETTINGS_STORE)
  // A put can also throw at once (e.g. DataCloneError): count that as a refused write too.
  const attempt = (write: Write): Promise<unknown> => {
    try {
      if (write.store === CARDS_STORE) return cards.put(write.value, write.key)
      return write.value === undefined ? settings.delete(write.key) : settings.put(write.value, write.key)
    } catch (error) {
      return Promise.reject(error)
    }
  }
  const results = await Promise.allSettled(writes.map(attempt))
  const refused = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (refused) {
    // Any write refused: roll every one back.
    try {
      tx.abort()
    } catch {
      // Already aborted by the browser
    }
    throw refused.reason
  }
  await tx.done
}

/** The writes that replace the cards an earlier version left in clear text with sealed ones. */
async function sealPlainCards(key: CryptoKey): Promise<Write[]> {
  const db = await initDB()
  const plain = (await db.getAll(CARDS_STORE)).filter(isPlainCard)
  return Promise.all(
    plain.map(async card => ({ store: CARDS_STORE, key: card.id, value: await sealCard(key, card) }) as const)
  )
}

/** A new passkey, and the record that seals the vault key's raw bytes under its PRF output. */
async function registerPasskey(raw: ArrayBuffer): Promise<{ record: PasskeyRecord; prfKey: CryptoKey }> {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32)).buffer
  const { credentialId, prfOutput } = await createPasskey(prfSalt)
  const prfKey = await keyFromPrf(prfOutput)
  const record: PasskeyRecord = {
    version: 1,
    credentialId,
    prfSalt: arrayBufferToBase64(prfSalt),
    wrapped: await seal(prfKey, arrayBufferToBase64(raw), PASSKEY_CONTEXT),
  }
  return { record, prfKey }
}

/** Asks for the passkey and returns the key from its PRF output, checked against `record`. */
async function promptPasskey(record: PasskeyRecord): Promise<{ prfKey: CryptoKey; raw: ArrayBuffer }> {
  const prfOutput = await getPrfOutput(record.credentialId, base64ToArrayBuffer(record.prfSalt))
  const prfKey = await keyFromPrf(prfOutput)
  try {
    return { prfKey, raw: base64ToArrayBuffer(await unseal(prfKey, record.wrapped, PASSKEY_CONTEXT)) }
  } catch {
    throw new PasskeyMismatchError()
  }
}

async function getVaultMeta(): Promise<VaultMeta | undefined> {
  const db = await initDB()
  return (await db.get(SETTINGS_STORE, VAULT_KEY)) as VaultMeta | undefined
}

/** Whether `key` is the vault's key. */
async function opensVault(key: CryptoKey, meta: VaultMeta): Promise<boolean> {
  try {
    return (await unseal(key, meta.check, CHECK_CONTEXT)) === CHECK_TEXT
  } catch {
    return false
  }
}

function isCryptoKey(value: unknown): value is CryptoKey {
  return typeof value === 'object' && value !== null && 'algorithm' in value && 'usages' in value
}

/**
 * Whether a vault exists, and whether this page holds its key. A key kept on this device
 * ("don't ask on this device") unlocks the vault here.
 */
export async function getVaultState(): Promise<VaultState> {
  if (session) return 'unlocked'
  const meta = await getVaultMeta()
  if (!meta) return 'none'

  const db = await initDB()
  const deviceKey = await db.get(SETTINGS_STORE, DEVICE_KEY)
  if (deviceKey !== undefined) {
    if (isCryptoKey(deviceKey) && (await opensVault(deviceKey, meta))) {
      session = { key: deviceKey, meta }
      return 'unlocked'
    }
    // Not this vault's key (or not a key at all): forget it.
    await db.delete(SETTINGS_STORE, DEVICE_KEY)
  }
  return 'locked'
}

/** Cards an earlier version left in clear text, to be sealed when the vault is created. */
export async function countPlainCards(): Promise<number> {
  const db = await initDB()
  const values = await db.getAll(CARDS_STORE)
  return values.filter(isPlainCard).length
}

/**
 * Creates the vault with this password, sealing every card left in clear text by an earlier
 * version. The sealed cards replace the plain ones and the vault is recorded in one transaction:
 * if it fails, nothing changes (the plain cards stay) and this throws.
 */
export async function createVault(password: string): Promise<void> {
  if (await getVaultMeta()) throw new Error('A vault already exists')
  const salt = newSalt()
  const key = await deriveVaultKey(password, salt, ITERATIONS)
  const meta: PasswordVaultMeta = {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt,
    check: await seal(key, CHECK_TEXT, CHECK_CONTEXT),
  }
  await writeAll([
    ...(await sealPlainCards(key)),
    { store: SETTINGS_STORE, key: VAULT_KEY, value: meta },
    { store: SETTINGS_STORE, key: 'useEncryption', value: true },
  ])
  session = { key, meta }
}

/**
 * Creates the vault with no password: a random key, sealed under a new passkey's PRF output (the
 * system prompt shows). Like `createVault`, plain cards are sealed in the same transaction.
 * @throws PasskeyUnsupportedError, PasskeyCancelledError (nothing is created then)
 */
export async function createVaultWithPasskey(): Promise<void> {
  if (await getVaultMeta()) throw new Error('A vault already exists')
  const raw = crypto.getRandomValues(new Uint8Array(32)).buffer
  const key = await importVaultKey(raw)
  const meta: PasskeyVaultMeta = { version: 1, kdf: 'none', check: await seal(key, CHECK_TEXT, CHECK_CONTEXT) }
  const { record, prfKey } = await registerPasskey(raw)
  await writeAll([
    ...(await sealPlainCards(key)),
    { store: SETTINGS_STORE, key: VAULT_KEY, value: meta },
    { store: SETTINGS_STORE, key: PASSKEY_KEY, value: record },
    { store: SETTINGS_STORE, key: 'useEncryption', value: true },
  ])
  session = { key, meta, prfKey }
}

/**
 * Creates the vault with no lock: a random key, kept on this device as with "don't ask on this
 * device", so that the app opens straight away. A password or a passkey can be added later.
 */
export async function createVaultWithoutLock(): Promise<void> {
  if (await getVaultMeta()) throw new Error('A vault already exists')
  const key = await importVaultKey(crypto.getRandomValues(new Uint8Array(32)).buffer)
  const meta: PasskeyVaultMeta = { version: 1, kdf: 'none', check: await seal(key, CHECK_TEXT, CHECK_CONTEXT) }
  await writeAll([
    ...(await sealPlainCards(key)),
    { store: SETTINGS_STORE, key: VAULT_KEY, value: meta },
    { store: SETTINGS_STORE, key: DEVICE_KEY, value: key },
    { store: SETTINGS_STORE, key: 'useEncryption', value: true },
  ])
  session = { key, meta }
}

/** Whether the key kept on this device is the only way into the vault (no password, no passkey). */
async function deviceKeyIsOnlyWayIn(): Promise<boolean> {
  const meta = await getVaultMeta()
  return meta !== undefined && !hasPasswordMeta(meta) && (await getPasskeyRecord()) === undefined
}

/** Whether the vault has a master password (a vault created with a passkey only has none). */
export async function hasPassword(): Promise<boolean> {
  const meta = await getVaultMeta()
  return meta !== undefined && hasPasswordMeta(meta)
}

/** @throws WrongPasswordError */
export async function unlockVault(password: string): Promise<void> {
  const meta = await getVaultMeta()
  if (!meta) throw new Error('No vault to unlock')
  if (!hasPasswordMeta(meta)) throw new Error('This vault has no password')
  const key = await deriveVaultKey(password, meta.salt, meta.iterations)
  if (!(await opensVault(key, meta))) throw new WrongPasswordError()
  session = { key, meta }
}

/**
 * Forgets the key, here and on this device ("don't ask on this device" is turned off): the cards
 * stay sealed until the vault is unlocked again. A vault without a lock keeps its device key, its
 * only way in: it opens again on the next launch.
 */
export async function lockVault(): Promise<void> {
  const keep = await deviceKeyIsOnlyWayIn()
  session = null
  if (keep) return
  const db = await initDB()
  await db.delete(SETTINGS_STORE, DEVICE_KEY)
}

async function getPasskeyRecord(): Promise<PasskeyRecord | undefined> {
  const db = await initDB()
  return (await db.get(SETTINGS_STORE, PASSKEY_KEY)) as PasskeyRecord | undefined
}

/** Whether a passkey can unlock the vault. */
export async function hasPasskeyUnlock(): Promise<boolean> {
  return (await getPasskeyRecord()) !== undefined
}

/**
 * Registers a passkey that unlocks the vault. With a password, it is asked again: the key in memory
 * is non-extractable, so its raw bytes are derived from the password once more, to be sealed.
 * Without a password (a vault without a lock), the vault gets a new random key instead: every card
 * is sealed again under it, with the device key, in one transaction.
 * @throws VaultLockedError, WrongPasswordError, PasskeyUnsupportedError, PasskeyCancelledError
 */
export async function enablePasskeyUnlock(password?: string): Promise<void> {
  const current = unlocked()
  const db = await initDB()
  if (!hasPasswordMeta(current.meta)) {
    if (await getPasskeyRecord()) throw new Error('This vault already opens with its passkey')
    const raw = crypto.getRandomValues(new Uint8Array(32)).buffer
    const key = await importVaultKey(raw)
    const meta: PasskeyVaultMeta = { version: 1, kdf: 'none', check: await seal(key, CHECK_TEXT, CHECK_CONTEXT) }
    const writes = await resealCards(current.key, key)
    const { record, prfKey } = await registerPasskey(raw)
    writes.push({ store: SETTINGS_STORE, key: VAULT_KEY, value: meta })
    writes.push({ store: SETTINGS_STORE, key: PASSKEY_KEY, value: record })
    if ((await db.get(SETTINGS_STORE, DEVICE_KEY)) !== undefined) {
      writes.push({ store: SETTINGS_STORE, key: DEVICE_KEY, value: key })
    }
    await writeAll(writes)
    session = { key, meta, prfKey }
    return
  }

  const raw = await deriveVaultKeyBits(password ?? '', current.meta.salt, current.meta.iterations)
  if (!(await opensVault(await importVaultKey(raw), current.meta))) throw new WrongPasswordError()

  const { record, prfKey } = await registerPasskey(raw)
  await db.put(SETTINGS_STORE, record, PASSKEY_KEY)
  session = { ...current, prfKey }
}

/** The writes that seal every card readable under `oldKey` again under `newKey`. */
async function resealCards(oldKey: CryptoKey, newKey: CryptoKey): Promise<Write[]> {
  const db = await initDB()
  const writes: Write[] = []
  for (const id of await db.getAllKeys(CARDS_STORE)) {
    const value = await db.get(CARDS_STORE, id)
    if (!value) continue
    let card: LoyaltyCard | null = null
    if (isSealed(value)) {
      try {
        card = JSON.parse(await unseal(oldKey, value, cardContext(String(id)))) as LoyaltyCard
      } catch {
        // Unreadable under the current key already: left as is
      }
    } else if (isPlainCard(value)) {
      card = value
    }
    if (card) writes.push({ store: CARDS_STORE, key: String(id), value: await sealCard(newKey, card) })
  }
  return writes
}

/**
 * Unlocks the vault with its passkey (the system prompt shows).
 * @throws PasskeyMismatchError, PasskeyUnsupportedError, PasskeyCancelledError
 */
export async function unlockWithPasskey(): Promise<void> {
  const meta = await getVaultMeta()
  const record = await getPasskeyRecord()
  if (!meta || !record) throw new Error('No passkey to unlock with')

  const { prfKey, raw } = await promptPasskey(record)
  let key: CryptoKey
  try {
    key = await importVaultKey(raw)
  } catch {
    throw new PasskeyMismatchError()
  }
  if (!(await opensVault(key, meta))) throw new PasskeyMismatchError()
  session = { key, meta, prfKey }
}

/**
 * Stops unlocking with the passkey. The passkey itself stays in the device's password manager.
 * @throws Error when the passkey is the only way in (no password, no device key)
 */
export async function disablePasskeyUnlock(): Promise<void> {
  const meta = await getVaultMeta()
  const db = await initDB()
  if (meta && !hasPasswordMeta(meta) && (await db.get(SETTINGS_STORE, DEVICE_KEY)) === undefined) {
    throw new Error('Set a password before turning off the passkey')
  }
  await db.delete(SETTINGS_STORE, PASSKEY_KEY)
}

/**
 * Sets the master password (a vault without one) or changes it, a forgotten one included: every
 * card is sealed again under the key the new password derives, with the passkey record and the
 * device key, in one transaction (all or nothing). Who asks is confirmed first: with the passkey
 * when there is one (no prompt if it just unlocked the vault), otherwise with the current password.
 * @throws VaultLockedError, WrongPasswordError, PasskeyCancelledError, PasskeyMismatchError
 */
export async function setVaultPassword(newPassword: string, currentPassword?: string): Promise<void> {
  const current = unlocked()
  const db = await initDB()
  const record = await getPasskeyRecord()
  let prfKey = current.prfKey
  if (record) {
    if (!prfKey) {
      prfKey = (await promptPasskey(record)).prfKey
    } else {
      try {
        await unseal(prfKey, record.wrapped, PASSKEY_CONTEXT)
      } catch {
        throw new PasskeyMismatchError()
      }
    }
  } else if (hasPasswordMeta(current.meta)) {
    const confirmed =
      currentPassword !== undefined &&
      (await opensVault(
        await deriveVaultKey(currentPassword, current.meta.salt, current.meta.iterations),
        current.meta
      ))
    if (!confirmed) throw new WrongPasswordError()
  }

  const salt = newSalt()
  const raw = await deriveVaultKeyBits(newPassword, salt, ITERATIONS)
  const key = await importVaultKey(raw)
  const meta: PasswordVaultMeta = {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt,
    check: await seal(key, CHECK_TEXT, CHECK_CONTEXT),
  }

  const writes = await resealCards(current.key, key)
  writes.push({ store: SETTINGS_STORE, key: VAULT_KEY, value: meta })
  if (record && prfKey) {
    writes.push({
      store: SETTINGS_STORE,
      key: PASSKEY_KEY,
      value: { ...record, wrapped: await seal(prfKey, arrayBufferToBase64(raw), PASSKEY_CONTEXT) },
    })
  }
  if ((await db.get(SETTINGS_STORE, DEVICE_KEY)) !== undefined) {
    writes.push({ store: SETTINGS_STORE, key: DEVICE_KEY, value: key })
  }
  await writeAll(writes)
  session = { key, meta, prfKey }
}

/** Whether the vault key is kept on this device ("don't ask on this device"). */
export async function isDeviceRemembered(): Promise<boolean> {
  const db = await initDB()
  return (await db.get(SETTINGS_STORE, DEVICE_KEY)) !== undefined
}

/**
 * "Don't ask on this device": keeps the vault key (non-extractable) in IndexedDB, so that the app
 * opens unlocked. Off forgets it.
 * @throws VaultLockedError (to turn it on), Error to turn it off when it is the only way in
 */
export async function setRememberDevice(remember: boolean): Promise<void> {
  const db = await initDB()
  if (remember) {
    await db.put(SETTINGS_STORE, unlocked().key, DEVICE_KEY)
  } else {
    if (await deviceKeyIsOnlyWayIn()) throw new Error('Add a password or a passkey before locking the app')
    await db.delete(SETTINGS_STORE, DEVICE_KEY)
  }
}

/**
 * The vault's salt and rounds, to write backups the master password opens; null for a vault
 * without a password (a backup then needs one of its own).
 */
export function vaultKdf(): { key: CryptoKey; salt: string; iterations: number } | null {
  const { key, meta } = unlocked()
  return hasPasswordMeta(meta) ? { key, salt: meta.salt, iterations: meta.iterations } : null
}

/**
 * Check if encryption is enabled (a vault exists)
 */
export async function isEncryptionEnabled(): Promise<boolean> {
  return (await getVaultMeta()) !== undefined
}

/**
 * Save app settings
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await initDB()
  await db.put(SETTINGS_STORE, settings.useEncryption, 'useEncryption')
  await db.put(SETTINGS_STORE, settings.theme, 'theme')
  await db.put(SETTINGS_STORE, settings.defaultBarcodeFormat, 'defaultBarcodeFormat')
  if (settings.lastBackupAt) {
    await db.put(SETTINGS_STORE, settings.lastBackupAt, 'lastBackupAt')
  }
}

/**
 * Get app settings
 * @throws Error if settings don't exist (database is empty)
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await initDB()

  // Check if settings exist by trying to get the useEncryption setting
  const useEncryption = await db.get(SETTINGS_STORE, 'useEncryption')

  // If useEncryption is undefined, settings don't exist - throw error
  if (useEncryption === undefined) {
    throw new Error('Settings not found - database is empty')
  }

  const theme = (await db.get(SETTINGS_STORE, 'theme')) ?? 'auto'
  const defaultBarcodeFormat = (await db.get(SETTINGS_STORE, 'defaultBarcodeFormat')) ?? 'QR_CODE'
  const lastBackupAt = (await db.get(SETTINGS_STORE, 'lastBackupAt')) ?? undefined

  return {
    useEncryption: useEncryption as boolean,
    theme: theme as 'light' | 'dark' | 'auto',
    defaultBarcodeFormat: defaultBarcodeFormat as AppSettings['defaultBarcodeFormat'],
    lastBackupAt: lastBackupAt as number | undefined,
  }
}

/**
 * Save a loyalty card, sealed under the vault key
 * @throws VaultLockedError
 */
export async function saveCard(card: LoyaltyCard): Promise<void> {
  const { key } = unlocked()
  const db = await initDB()
  await db.put(CARDS_STORE, await sealCard(key, card), card.id)
}

/**
 * Get all loyalty cards (most recently used first)
 * @throws VaultLockedError
 */
export async function getAllCards(): Promise<LoyaltyCard[]> {
  const { key } = unlocked()
  try {
    const db = await initDB()
    const ids = await db.getAllKeys(CARDS_STORE)
    const cards: LoyaltyCard[] = []
    const strays: LoyaltyCard[] = []

    for (const id of ids) {
      const value = await db.get(CARDS_STORE, id)
      if (!value) continue
      if (isSealed(value)) {
        try {
          cards.push(JSON.parse(await unseal(key, value, cardContext(String(id)))) as LoyaltyCard)
        } catch {
          // Tampered with, or moved from another id: never shown, left for a backup to recover.
          console.error(`Card ${id} could not be decrypted`)
        }
      } else if (isPlainCard(value)) {
        // Written in clear by an older version still open in another tab: seal it now.
        cards.push(value)
        strays.push(value)
      }
      // A payload sealed under another password by an early version cannot be opened: left as is.
    }

    for (const card of strays) await saveCard(card)

    return sortByRecentUse(cards)
  } catch (error) {
    throw new Error(`Failed to retrieve cards: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a loyalty card
 */
export async function deleteCard(id: string): Promise<void> {
  const db = await initDB()
  await db.delete(CARDS_STORE, id)
}

/**
 * Store cards (restore, Catima or shared import), sealed under the vault key
 * @returns the number of cards stored
 */
export async function importCardsRaw(cards: LoyaltyCard[]): Promise<number> {
  let importedCount = 0
  for (const card of cards) {
    try {
      await saveCard(card)
      importedCount++
    } catch (error) {
      if (error instanceof VaultLockedError) throw error
      console.error('Failed to import card:', error)
    }
  }
  return importedCount
}

/**
 * Update theme setting
 */
export async function updateTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
  const db = await initDB()
  await db.put(SETTINGS_STORE, theme, 'theme')
}

const LAST_OPEN_CARD_KEY = 'lastOpenCardId'

/**
 * Remember which card is open (null: the list is), to reopen it on the next launch.
 * Only the id is kept, in clear like the theme: it says nothing about the card.
 */
export async function saveLastOpenCard(id: string | null): Promise<void> {
  const db = await initDB()
  if (id) {
    await db.put(SETTINGS_STORE, id, LAST_OPEN_CARD_KEY)
  } else {
    await db.delete(SETTINGS_STORE, LAST_OPEN_CARD_KEY)
  }
}

/** The card that was open when the app was last closed, if any. */
export async function getLastOpenCard(): Promise<string | null> {
  const db = await initDB()
  const id = await db.get(SETTINGS_STORE, LAST_OPEN_CARD_KEY)
  return typeof id === 'string' ? id : null
}

/**
 * Clear all data (cards, settings and the vault itself), then lock
 * Use with caution - this will delete everything!
 */
export async function clearAllData(): Promise<void> {
  const db = await initDB()
  const tx = db.transaction([CARDS_STORE, SETTINGS_STORE], 'readwrite')
  await Promise.all([tx.objectStore(CARDS_STORE).clear(), tx.objectStore(SETTINGS_STORE).clear(), tx.done])
  session = null
}
