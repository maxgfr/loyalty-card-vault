import type { BarcodeFormat } from '../types'
import { getStoreColorsMap } from './stores'

/**
 * Store-specific color associations (generated from store data)
 */
const STORE_COLORS: Record<string, string> = getStoreColorsMap()

/**
 * Auto-detect barcode format from data
 */
export function detectBarcodeFormat(data: string): BarcodeFormat | null {
  if (!data) return null

  // EAN-13: exactly 13 digits
  if (/^\d{13}$/.test(data)) return 'EAN_13'

  // EAN-8: exactly 8 digits
  if (/^\d{8}$/.test(data)) return 'EAN_8'

  // UPC-A: exactly 12 digits
  if (/^\d{12}$/.test(data)) return 'UPC_A'

  // UPC-E: 6-8 digits starting with 0
  if (/^0\d{5,7}$/.test(data)) return 'UPC_E'

  // ITF: even number of digits
  if (/^\d+$/.test(data) && data.length % 2 === 0 && data.length >= 6) return 'ITF'

  // CODABAR: starts and ends with A-D, contains digits and special chars
  if (/^[A-D][0-9\-$:/.+]+[A-D]$/.test(data)) return 'CODABAR'

  // CODE-39: uppercase alphanumeric with special chars
  if (/^[0-9A-Z\-. $/+%]+$/.test(data) && data.length <= 43) return 'CODE_39'

  // Default to QR_CODE or CODE_128 for other patterns
  if (data.length > 80) return 'QR_CODE'
  return 'CODE_128'
}

/**
 * Get color for a store name
 */
export function getStoreColor(storeName: string): string | null {
  if (!storeName) return null

  const lowerName = storeName.toLowerCase()
  for (const [key, color] of Object.entries(STORE_COLORS)) {
    if (lowerName.includes(key)) {
      return color
    }
  }

  return null
}

/**
 * Generate a color hash from string (for unknown stores)
 */
export function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const h = hash % 360
  const s = 65 + (hash % 20) // 65-85%
  const l = 45 + (hash % 15) // 45-60%

  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Smart defaults for new card
 */
export function getSmartDefaults(barcodeData: string, storeName?: string) {
  const format = detectBarcodeFormat(barcodeData)
  const color = storeName ? getStoreColor(storeName) || generateColorFromString(storeName) : '#6366f1'

  return {
    barcodeFormat: format || 'QR_CODE',
    color,
  }
}
