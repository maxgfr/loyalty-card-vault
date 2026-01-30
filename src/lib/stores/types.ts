/**
 * Store configuration with pre-filled parameters
 */
export interface StoreConfig {
  name: string
  color: string
  defaultTags?: string[]
  defaultNotes?: string
  barcodeFormat?: string
}

/**
 * Country code type
 */
export type CountryCode = 'FR' | 'US' | 'INTL' | 'DE' | 'UK' | 'ES' | 'IT'
