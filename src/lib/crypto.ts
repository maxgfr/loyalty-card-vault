import type { EncryptedPayload } from '../types'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12
const SALT_LENGTH = 16
const ITERATIONS = 100000

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
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
function base64ToArrayBuffer(base64: string): ArrayBuffer {
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
 * Convert Uint8Array to BufferSource for Web Crypto API
 * Creates a new Uint8Array to ensure proper ArrayBuffer type
 * This ensures compatibility across browsers and Node.js environments
 */
function toBufferSource(arr: Uint8Array): BufferSource {
  // Create a new Uint8Array from the data to ensure clean ArrayBuffer
  // The cast is needed due to TypeScript's strict ArrayBufferLike vs ArrayBuffer typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Uint8Array(arr) as any as BufferSource
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: toBufferSource(salt),
      iterations: ITERATIONS,
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
      iv: toBufferSource(iv),
    },
    key,
    encoder.encode(data)
  )

  return {
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    data: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
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
    const key = await deriveKey(password, salt)

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
