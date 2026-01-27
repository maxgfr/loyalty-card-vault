/**
 * Barcode format types supported by the scanner
 */
export type BarcodeFormat =
  | 'QR_CODE'
  | 'EAN_13'
  | 'EAN_8'
  | 'CODE_128'
  | 'CODE_39'
  | 'UPC_A'
  | 'UPC_E'
  | 'ITF'
  | 'CODABAR'
  | 'DATA_MATRIX'

/**
 * Loyalty card data structure
 */
export interface LoyaltyCard {
  id: string
  name: string
  storeName: string
  barcodeData: string
  barcodeFormat: BarcodeFormat
  color: string
  notes?: string
  createdAt: number
  updatedAt: number
}

/**
 * Encrypted payload structure for secure storage
 */
export interface EncryptedPayload {
  iv: string // Base64 encoded initialization vector
  data: string // Base64 encoded encrypted data
  salt: string // Base64 encoded salt for key derivation
}

/**
 * Backup file structure
 */
export interface BackupData {
  version: number
  exportedAt: number
  encrypted: boolean
  cards: LoyaltyCard[] | EncryptedPayload
}

/**
 * Application settings
 */
export interface AppSettings {
  useEncryption: boolean
  theme: 'light' | 'dark' | 'auto'
  defaultBarcodeFormat: BarcodeFormat
  lastBackupAt?: number
}

/**
 * Scan result from barcode scanner
 */
export interface ScanResult {
  text: string
  format: BarcodeFormat
  timestamp: number
}

/**
 * Storage mode for the application
 */
export type StorageMode = 'encrypted' | 'unencrypted'

/**
 * Hash route types
 */
export type Route =
  | { page: 'home' }
  | { page: 'card'; cardId: string }
  | { page: 'scan' }
  | { page: 'add' }
  | { page: 'settings' }
  | { page: 'setup' }
