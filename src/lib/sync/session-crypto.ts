/**
 * Optional session-level encryption for sync messages
 * Separate from storage encryption - used to encrypt data in transit
 */

import { encrypt as storageEncrypt, decrypt as storageDecrypt } from '../crypto'

/**
 * Session crypto interface
 */
export interface SessionCrypto {
  encrypt(data: string): Promise<string>
  decrypt(data: string): Promise<string>
}

/**
 * Create session crypto with password
 * Uses same encryption as storage but for session-level protection
 */
export function createSessionCrypto(password: string): SessionCrypto {
  return {
    async encrypt(data: string): Promise<string> {
      const encrypted = await storageEncrypt(data, password)
      return JSON.stringify(encrypted)
    },

    async decrypt(data: string): Promise<string> {
      const encrypted = JSON.parse(data)
      return storageDecrypt(encrypted, password)
    },
  }
}

/**
 * Create no-op crypto for unencrypted sessions
 * Data passes through unchanged
 */
export function createNoOpCrypto(): SessionCrypto {
  return {
    async encrypt(data: string): Promise<string> {
      return data
    },

    async decrypt(data: string): Promise<string> {
      return data
    },
  }
}
