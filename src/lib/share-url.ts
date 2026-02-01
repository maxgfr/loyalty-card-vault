import type { LoyaltyCard } from '../types'
import { encrypt, decrypt, generatePassword } from './crypto'

/**
 * Share URL format: #share/{base64-encrypted-data}
 * The password is shown separately to the user
 */

interface ShareData {
  cards: LoyaltyCard[]
  exportedAt: number
}

/**
 * Create a shareable URL with encrypted card data
 * Returns both the URL and the password (to be shared separately)
 */
export async function createShareURL(cards: LoyaltyCard[]): Promise<{ url: string; password: string }> {
  // Generate a random password (6 characters, easy to type)
  const password = generatePassword(6)

  // Prepare data
  const shareData: ShareData = {
    cards,
    exportedAt: Date.now(),
  }

  // Encrypt
  const encrypted = await encrypt(JSON.stringify(shareData), password)

  // Encode as base64
  const encoded = btoa(JSON.stringify(encrypted))

  // Create URL
  const url = `${window.location.origin}${window.location.pathname}#share/${encoded}`

  return { url, password }
}

/**
 * Decode and decrypt a share URL
 */
export async function decodeShareURL(encodedData: string, password: string): Promise<LoyaltyCard[]> {
  try {
    // Decode from base64
    const decoded = JSON.parse(atob(encodedData))

    // Decrypt
    const decrypted = await decrypt(decoded, password)

    // Parse
    const shareData: ShareData = JSON.parse(decrypted)

    return shareData.cards
  } catch (error) {
    throw new Error('Invalid share URL or incorrect password')
  }
}

/**
 * Generate a QR code data URL for sharing
 */
export async function createShareQRCode(url: string): Promise<string> {
  const QRCode = await import('qrcode')
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'L',
    margin: 1,
    width: 400,
  })
}
