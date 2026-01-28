import type { BarcodeFormat } from '../types'

/**
 * Store data by country
 */
interface StoreData {
  name: string
  color: string
}

/**
 * Stores by country
 */
const STORES_BY_COUNTRY: Record<string, StoreData[]> = {
  FR: [
    // Supermarchés
    { name: 'Carrefour', color: '#005AA9' },
    { name: 'Auchan', color: '#ED1C24' },
    { name: 'Leclerc', color: '#005CAB' },
    { name: 'Intermarché', color: '#E30613' },
    { name: 'Super U', color: '#ED1C24' },
    { name: 'Lidl', color: '#0050AA' },
    { name: 'Casino', color: '#E30613' },
    { name: 'Monoprix', color: '#E30613' },
    { name: 'Franprix', color: '#00A650' },
    { name: 'Biocoop', color: '#6BB43F' },

    // Restaurants
    { name: 'McDonald\'s', color: '#FFC72C' },
    { name: 'Quick', color: '#ED1C24' },
    { name: 'KFC', color: '#E4002B' },
    { name: 'Subway', color: '#008C15' },
    { name: 'Burger King', color: '#EC1C24' },
    { name: 'Paul', color: '#8B4513' },
    { name: 'Starbucks', color: '#00704A' },

    // Mode & Beauté
    { name: 'Sephora', color: '#000000' },
    { name: 'Nocibé', color: '#E30613' },
    { name: 'Marionnaud', color: '#E4002B' },
    { name: 'H&M', color: '#E50010' },
    { name: 'Zara', color: '#000000' },
    { name: 'Décathlon', color: '#0082C3' },
    { name: 'Go Sport', color: '#ED1C24' },
    { name: 'Kiabi', color: '#E30613' },

    // Multimédia & Électronique
    { name: 'Fnac', color: '#F39200' },
    { name: 'Darty', color: '#E30613' },
    { name: 'Boulanger', color: '#E30613' },
    { name: 'Micromania', color: '#ED1C24' },

    // Bricolage & Maison
    { name: 'Leroy Merlin', color: '#78BE20' },
    { name: 'Castorama', color: '#0072BB' },
    { name: 'Bricomarché', color: '#E30613' },
    { name: 'Ikea', color: '#0051BA' },
    { name: 'BUT', color: '#E30613' },
    { name: 'Conforama', color: '#E30613' },

    // Pharmacie & Santé
    { name: 'Pharmacie', color: '#00A650' },
    { name: 'Parapharmacie Leclerc', color: '#005CAB' },

    // Carburant
    { name: 'Total', color: '#EE3124' },
    { name: 'BP', color: '#008A00' },
    { name: 'Esso', color: '#E31937' },
    { name: 'Shell', color: '#FFD100' },

    // Autres
    { name: 'Nature & Découvertes', color: '#6BB43F' },
    { name: 'Cultura', color: '#F39200' },
    { name: 'Action', color: '#E30613' },
  ],

  US: [
    { name: 'Starbucks', color: '#00704A' },
    { name: 'Target', color: '#CC0000' },
    { name: 'Walmart', color: '#0071CE' },
    { name: 'CVS', color: '#CC0000' },
    { name: 'Walgreens', color: '#E31837' },
    { name: 'Best Buy', color: '#0046BE' },
    { name: 'Home Depot', color: '#F96302' },
    { name: 'Whole Foods', color: '#00674E' },
    { name: 'Trader Joe\'s', color: '#CC1F27' },
    { name: 'Costco', color: '#0071CE' },
    { name: 'Sam\'s Club', color: '#0071CE' },
    { name: 'Kroger', color: '#0A3161' },
    { name: 'Safeway', color: '#E31837' },
    { name: 'Subway', color: '#008C15' },
    { name: 'McDonald\'s', color: '#FFC72C' },
    { name: 'Dunkin\'', color: '#FF6600' },
    { name: 'Panera Bread', color: '#6F4E37' },
    { name: 'Chipotle', color: '#A81612' },
    { name: 'Sephora', color: '#000000' },
    { name: 'Ulta', color: '#FF6EB4' },
    { name: 'Petco', color: '#001489' },
    { name: 'PetSmart', color: '#003DA5' },
    { name: 'GameStop', color: '#CC0000' },
    { name: 'Barnes & Noble', color: '#5C7F3A' },
    { name: 'AMC Theatres', color: '#CC0000' },
    { name: 'Regal Cinemas', color: '#00AEEF' },
    { name: 'Marriott', color: '#B71C1C' },
    { name: 'Hilton', color: '#0057A0' },
    { name: 'Delta', color: '#C8102E' },
    { name: 'United Airlines', color: '#0076A8' },
    { name: 'Southwest', color: '#F9B612' },
  ],

  // Magasins internationaux
  INTL: [
    { name: 'Apple Store', color: '#000000' },
    { name: 'Nike', color: '#111111' },
    { name: 'Adidas', color: '#000000' },
    { name: 'Zara', color: '#000000' },
    { name: 'H&M', color: '#E50010' },
    { name: 'IKEA', color: '#0051BA' },
    { name: 'McDonald\'s', color: '#FFC72C' },
    { name: 'Starbucks', color: '#00704A' },
    { name: 'Subway', color: '#008C15' },
    { name: 'KFC', color: '#E4002B' },
    { name: 'Pizza Hut', color: '#EE3124' },
    { name: 'Burger King', color: '#EC1C24' },
  ],
}

/**
 * Detect user's country from browser locale
 */
export function detectUserCountry(): 'FR' | 'US' | 'INTL' {
  const locale = navigator.language || 'en-US'

  if (locale.startsWith('fr')) return 'FR'
  if (locale.startsWith('en-US') || locale.startsWith('en-GB')) return 'US'

  return 'INTL'
}

/**
 * Get stores for user's country
 */
export function getStoresForCountry(country?: 'FR' | 'US' | 'INTL'): StoreData[] {
  const userCountry = country || detectUserCountry()
  const countryStores = STORES_BY_COUNTRY[userCountry] || []
  const intlStores = STORES_BY_COUNTRY.INTL || []

  // Merge country stores with international stores (remove duplicates)
  const allStores = [...countryStores, ...intlStores]
  const uniqueStores = allStores.filter((store, index, self) =>
    index === self.findIndex(s => s.name.toLowerCase() === store.name.toLowerCase())
  )

  return uniqueStores
}

/**
 * Get all store names for user's country
 */
export function getCommonStores(country?: 'FR' | 'US' | 'INTL'): string[] {
  return getStoresForCountry(country).map(store => store.name)
}

/**
 * Store-specific color associations (generated from store data)
 */
function buildStoreColorsMap(): Record<string, string> {
  const colorMap: Record<string, string> = {}

  Object.values(STORES_BY_COUNTRY).forEach(stores => {
    stores.forEach(store => {
      colorMap[store.name.toLowerCase()] = store.color
    })
  })

  return colorMap
}

export const STORE_COLORS: Record<string, string> = buildStoreColorsMap()

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
 * Suggest store names based on partial input
 */
export function suggestStoreNames(input: string, country?: 'FR' | 'US' | 'INTL'): string[] {
  if (!input || input.length < 2) return []

  const lowerInput = input.toLowerCase()
  const stores = getCommonStores(country)

  return stores
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
