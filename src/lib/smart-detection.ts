import type { BarcodeFormat } from '../types'

/**
 * Common store names for suggestions
 */
export const COMMON_STORES = [
  'Starbucks',
  'Target',
  'Walmart',
  'CVS',
  'Walgreens',
  'Best Buy',
  'Home Depot',
  'Whole Foods',
  'Trader Joe\'s',
  'Costco',
  'Sam\'s Club',
  'Kroger',
  'Safeway',
  'Subway',
  'McDonald\'s',
  'Dunkin\'',
  'Panera Bread',
  'Chipotle',
  'Sephora',
  'Ulta',
  'Petco',
  'PetSmart',
  'GameStop',
  'Barnes & Noble',
  'AMC Theatres',
  'Regal Cinemas',
  'Marriott',
  'Hilton',
  'Delta',
  'United Airlines',
  'Southwest',
]

/**
 * Store-specific color associations
 */
export const STORE_COLORS: Record<string, string> = {
  'starbucks': '#00704A',
  'target': '#CC0000',
  'walmart': '#0071CE',
  'cvs': '#CC0000',
  'walgreens': '#E31837',
  'best buy': '#0046BE',
  'home depot': '#F96302',
  'whole foods': '#00674E',
  'trader joe\'s': '#CC1F27',
  'costco': '#0071CE',
  'sam\'s club': '#0071CE',
  'subway': '#008C15',
  'mcdonald\'s': '#FFC72C',
  'dunkin\'': '#FF6600',
  'panera bread': '#6F4E37',
  'chipotle': '#A81612',
  'sephora': '#000000',
}

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
  if (/^[0-9A-Z\-. $\/+%]+$/.test(data) && data.length <= 43) return 'CODE_39'

  // Default to QR_CODE or CODE_128 for other patterns
  if (data.length > 80) return 'QR_CODE'
  return 'CODE_128'
}

/**
 * Suggest store names based on partial input
 */
export function suggestStoreNames(input: string): string[] {
  if (!input || input.length < 2) return []

  const lowerInput = input.toLowerCase()
  return COMMON_STORES
    .filter(store => store.toLowerCase().includes(lowerInput))
    .slice(0, 5)
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
