import { openDB, type IDBPDatabase } from 'idb'
import type { LoyaltyCard, AppSettings, EncryptedPayload } from '../types'
import { encrypt, decrypt } from './crypto'

const DB_NAME = 'loyalty-card-vault'
const DB_VERSION = 1
const CARDS_STORE = 'cards'
const SETTINGS_STORE = 'settings'

interface CardVaultDB {
  cards: {
    key: string
    value: LoyaltyCard | EncryptedPayload
  }
  settings: {
    key: string
    value: AppSettings | string | boolean
  }
}

let dbInstance: IDBPDatabase<CardVaultDB> | null = null

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<CardVaultDB>> {
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
  })

  return dbInstance
}

/**
 * Check if encryption is enabled in settings
 */
export async function isEncryptionEnabled(): Promise<boolean> {
  const db = await initDB()
  const useEncryption = await db.get(SETTINGS_STORE, 'useEncryption')
  return useEncryption === true
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
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await initDB()
  const useEncryption = (await db.get(SETTINGS_STORE, 'useEncryption')) ?? false
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
 * Save a loyalty card (encrypted or unencrypted based on settings)
 */
export async function saveCard(card: LoyaltyCard, password?: string): Promise<void> {
  const db = await initDB()
  const encrypted = await isEncryptionEnabled()

  if (encrypted && password) {
    const cardJson = JSON.stringify(card)
    const encryptedPayload = await encrypt(cardJson, password)
    await db.put(CARDS_STORE, encryptedPayload, card.id)
  } else {
    await db.put(CARDS_STORE, card, card.id)
  }
}

/**
 * Get a specific loyalty card by ID
 */
export async function getCard(id: string, password?: string): Promise<LoyaltyCard | null> {
  try {
    const db = await initDB()
    const data = await db.get(CARDS_STORE, id)

    if (!data) {
      return null
    }

    const encrypted = await isEncryptionEnabled()

    if (encrypted && password) {
      if ('iv' in data && 'data' in data && 'salt' in data) {
        const decryptedJson = await decrypt(data as EncryptedPayload, password)
        return JSON.parse(decryptedJson) as LoyaltyCard
      }
      throw new Error('Invalid encrypted data format')
    } else {
      return data as LoyaltyCard
    }
  } catch (error) {
    throw new Error(`Failed to retrieve card: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all loyalty cards
 */
export async function getAllCards(password?: string): Promise<LoyaltyCard[]> {
  try {
    const db = await initDB()
    const allKeys = await db.getAllKeys(CARDS_STORE)
    const cards: LoyaltyCard[] = []

    for (const key of allKeys) {
      const card = await getCard(key as string, password)
      if (card) {
        cards.push(card)
      }
    }

    return cards.sort((a, b) => b.updatedAt - a.updatedAt)
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
 * Delete all cards
 */
export async function deleteAllCards(): Promise<void> {
  const db = await initDB()
  const allKeys = await db.getAllKeys(CARDS_STORE)
  for (const key of allKeys) {
    await db.delete(CARDS_STORE, key)
  }
}

/**
 * Get raw encrypted or unencrypted data (for backup)
 */
export async function getAllCardsRaw(): Promise<Array<LoyaltyCard | EncryptedPayload>> {
  const db = await initDB()
  const allKeys = await db.getAllKeys(CARDS_STORE)
  const cards: Array<LoyaltyCard | EncryptedPayload> = []

  for (const key of allKeys) {
    const data = await db.get(CARDS_STORE, key)
    if (data) {
      cards.push(data)
    }
  }

  return cards
}

/**
 * Import cards from raw data (for restore)
 */
export async function importCardsRaw(
  cards: Array<LoyaltyCard | EncryptedPayload>,
  password?: string
): Promise<number> {
  const db = await initDB()
  const encrypted = await isEncryptionEnabled()
  let importedCount = 0

  for (const card of cards) {
    try {
      if ('id' in card) {
        // Unencrypted card
        if (encrypted && password) {
          // Re-encrypt for current storage mode
          await saveCard(card as LoyaltyCard, password)
        } else {
          await db.put(CARDS_STORE, card, card.id)
        }
        importedCount++
      } else if ('iv' in card && 'data' in card && 'salt' in card) {
        // Encrypted card
        if (encrypted && password) {
          await db.put(CARDS_STORE, card, (card as EncryptedPayload).data)
        } else if (password) {
          // Decrypt and store unencrypted
          const decryptedJson = await decrypt(card as EncryptedPayload, password)
          const loyaltyCard = JSON.parse(decryptedJson) as LoyaltyCard
          await db.put(CARDS_STORE, loyaltyCard, loyaltyCard.id)
        }
        importedCount++
      }
    } catch (error) {
      console.error('Failed to import card:', error)
    }
  }

  return importedCount
}
