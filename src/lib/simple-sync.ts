/**
 * Ultra-simple sync via URL sharing
 * No WebRTC, no double QR - just a link!
 */

import type { LoyaltyCard } from '../types'
import pako from 'pako'

/**
 * Encode cards to base64 URL-safe string
 */
export async function encodeCardsToUrl(cards: LoyaltyCard[]): Promise<string> {
  // Convert cards to JSON
  const json = JSON.stringify(cards)

  // Compress with gzip
  const compressed = pako.gzip(json)

  // Convert to base64 URL-safe
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return base64
}

/**
 * Decode cards from base64 URL-safe string
 */
export async function decodeCardsFromUrl(encoded: string): Promise<LoyaltyCard[]> {
  try {
    // Restore base64 padding
    const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4)

    // Convert from URL-safe base64
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')

    // Decode base64 to binary
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Decompress
    const decompressed = pako.ungzip(bytes, { to: 'string' })

    // Parse JSON
    const cards = JSON.parse(decompressed) as LoyaltyCard[]

    return cards
  } catch (error) {
    throw new Error('Invalid sync link: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

/**
 * Generate full sync URL
 */
export async function generateSyncUrl(cards: LoyaltyCard[]): Promise<string> {
  const encoded = await encodeCardsToUrl(cards)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#sync-import/${encoded}`
}

/**
 * Check if current URL is a sync import link
 */
export function isSyncImportUrl(): { isSync: boolean; encoded?: string } {
  const hash = window.location.hash

  if (hash.startsWith('#sync-import/')) {
    const encoded = hash.substring('#sync-import/'.length)
    return { isSync: true, encoded }
  }

  return { isSync: false }
}
