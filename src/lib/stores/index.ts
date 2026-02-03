import type { StoreConfig, CountryCode } from './types'
import { FR_STORES } from './fr'
import { US_STORES } from './us'
import { INTL_STORES } from './intl'
import { DE_STORES } from './de'

export type { StoreConfig, CountryCode } from './types'

/**
 * All stores by country
 */
const STORES_BY_COUNTRY: Record<CountryCode, StoreConfig[]> = {
  FR: FR_STORES,
  US: US_STORES,
  INTL: INTL_STORES,
  DE: DE_STORES,
  UK: INTL_STORES, // Use INTL for UK for now
  ES: INTL_STORES, // Use INTL for ES for now
  IT: INTL_STORES, // Use INTL for IT for now
}

/**
 * Detect user's country from browser locale
 */
function detectUserCountry(): CountryCode {
  const locale = navigator.language || 'en-US'

  if (locale.startsWith('fr')) return 'FR'
  if (locale.startsWith('de')) return 'DE'
  if (locale.startsWith('en-US')) return 'US'
  if (locale.startsWith('en-GB')) return 'UK'
  if (locale.startsWith('es')) return 'ES'
  if (locale.startsWith('it')) return 'IT'

  return 'INTL'
}

/**
 * Get stores for a specific country
 */
export function getStoresForCountry(country?: CountryCode): StoreConfig[] {
  const userCountry = country || detectUserCountry()
  const countryStores = STORES_BY_COUNTRY[userCountry] || []
  const intlStores = STORES_BY_COUNTRY.INTL || []

  // Merge country stores with international stores (remove duplicates by name)
  const allStores = [...countryStores, ...intlStores]
  const uniqueStores = allStores.filter(
    (store, index, self) =>
      index === self.findIndex((s) => s.name.toLowerCase() === store.name.toLowerCase())
  )

  return uniqueStores
}

/**
 * Find a store by exact or partial name match
 */
export function findStoreByName(name: string, country?: CountryCode): StoreConfig | null {
  if (!name) return null

  const stores = getStoresForCountry(country)
  const lowerName = name.toLowerCase()

  // First try exact match
  const exactMatch = stores.find((s) => s.name.toLowerCase() === lowerName)
  if (exactMatch) return exactMatch

  // Then try partial match
  const partialMatch = stores.find((s) => s.name.toLowerCase().includes(lowerName))
  if (partialMatch) return partialMatch

  return null
}

/**
 * Suggest stores based on partial input
 */
export function suggestStores(input: string, country?: CountryCode): StoreConfig[] {
  if (!input || input.length < 2) return []

  const lowerInput = input.toLowerCase()
  const stores = getStoresForCountry(country)

  return stores
    .filter((store) => store.name.toLowerCase().includes(lowerInput))
    .slice(0, 8) // Limit to 8 suggestions
}

/**
 * Get all store colors as a map
 */
export function getStoreColorsMap(): Record<string, string> {
  const colorMap: Record<string, string> = {}

  Object.values(STORES_BY_COUNTRY).forEach((stores) => {
    stores.forEach((store) => {
      colorMap[store.name.toLowerCase()] = store.color
    })
  })

  return colorMap
}

/**
 * Get preset colors from all stores (unique)
 */
export function getPresetColors(): string[] {
  const uniqueColors = new Set<string>()

  Object.values(STORES_BY_COUNTRY).forEach((stores) => {
    stores.forEach((store) => {
      if (store.color) uniqueColors.add(store.color.toUpperCase())
    })
  })

  // Add some default colors if not enough store colors
  const defaultColors = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F59E0B',
    '#10B981',
    '#06B6D4',
    '#3B82F6',
    '#14B8A6',
    '#F97316',
    '#84CC16',
    '#A855F7',
  ]

  defaultColors.forEach((color) => uniqueColors.add(color))

  return Array.from(uniqueColors).slice(0, 24) // Limit to 24 colors
}
