import type { EncryptedPayload } from '../types'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16
/** PBKDF2-SHA256 rounds for everything encrypted from now on (OWASP 2023 minimum: 600,000). */
export const ITERATIONS = 600000
/** What payloads written before the `iterations` field existed were derived with. */
const LEGACY_ITERATIONS = 100000

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Generate a random IV (Initialization Vector)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // TypeScript strict typing issue with ArrayBufferLike vs ArrayBuffer, runtime works fine in all environments
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(data: string, password: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder()
  const salt = generateSalt()
  const iv = generateIV()
  const key = await deriveKey(password, salt)

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      // TypeScript strict typing issue with ArrayBufferLike vs ArrayBuffer, runtime works fine in all environments
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    encoder.encode(data)
  )

  return {
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    data: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iterations: ITERATIONS,
  }
}

/**
 * Decrypt data using AES-GCM
 * @throws Error if decryption fails (wrong password or corrupted data)
 */
export async function decrypt(payload: EncryptedPayload, password: string): Promise<string> {
  try {
    const decoder = new TextDecoder()
    const saltBuffer = base64ToArrayBuffer(payload.salt)
    const salt = new Uint8Array(saltBuffer)
    const ivBuffer = base64ToArrayBuffer(payload.iv)
    const encryptedData = base64ToArrayBuffer(payload.data)
    const key = await deriveKey(password, salt, payload.iterations ?? LEGACY_ITERATIONS)

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: ivBuffer,
      },
      key,
      encryptedData
    )

    return decoder.decode(decryptedBuffer)
  } catch {
    throw new Error('Decryption failed. Wrong password or corrupted data.')
  }
}

// ---------------------------------------------------------------------------
// Vault key: derived once from the master password at unlock, kept in memory only
// (non-extractable), and used to seal every card with a fresh IV.

/** A string sealed with the vault key (AES-256-GCM). */
export interface SealedData {
  iv: string
  data: string
}

export function newSalt(): string {
  return arrayBufferToBase64(generateSalt().buffer as ArrayBuffer)
}

/** The vault key for a password, from the vault's salt and iteration count. */
export function deriveVaultKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  return deriveKey(password, new Uint8Array(base64ToArrayBuffer(salt)), iterations)
}

/**
 * The same key as `deriveVaultKey`, as raw bytes: what a passkey wraps. Meant to be imported
 * (`importVaultKey`) or sealed right away, never kept.
 */
export async function deriveVaultKeyBits(password: string, salt: string, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: base64ToArrayBuffer(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH
  )
}

/** The vault key from its raw bytes, non-extractable like `deriveVaultKey`'s. */
export function importVaultKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

/** The key a passkey's PRF output (WebAuthn `prf` extension) seals the vault key with. */
export async function keyFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('loyalty-card-vault/passkey'),
    },
    material,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Seals `text` under `key`. `context` (e.g. the card id) is authenticated, not encrypted. */
export async function seal(key: CryptoKey, text: string, context = ''): Promise<SealedData> {
  const iv = generateIV()
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      iv: iv.buffer as ArrayBuffer,
      ...(context ? { additionalData: new TextEncoder().encode(context) } : {}),
    },
    key,
    new TextEncoder().encode(text)
  )
  return { iv: arrayBufferToBase64(iv.buffer as ArrayBuffer), data: arrayBufferToBase64(encrypted) }
}

/** Opens what `seal` produced. @throws Error for another key, another context or tampered data */
export async function unseal(key: CryptoKey, sealed: SealedData, context = ''): Promise<string> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: base64ToArrayBuffer(sealed.iv),
        ...(context ? { additionalData: new TextEncoder().encode(context) } : {}),
      },
      key,
      base64ToArrayBuffer(sealed.data)
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error('Decryption failed. Wrong password or corrupted data.')
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a random password (alphanumeric, no ambiguous characters)
 */
export function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars like 0,O,1,I
  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)

  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }

  return password
}
