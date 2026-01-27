import { z } from 'zod'

/**
 * Barcode format enum
 */
export const barcodeFormatSchema = z.enum([
  'QR_CODE',
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'UPC_A',
  'UPC_E',
  'ITF',
  'CODABAR',
  'DATA_MATRIX',
])

/**
 * Card color validation (hex color)
 */
export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')

/**
 * Loyalty card schema
 */
export const cardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  storeName: z.string().min(1, 'Store name is required').max(100, 'Store name too long'),
  barcodeData: z.string().min(1, 'Barcode data is required').max(500, 'Barcode data too long'),
  barcodeFormat: barcodeFormatSchema,
  color: colorSchema,
  notes: z.string().max(500, 'Notes too long').optional(),
})

/**
 * Card creation schema (without id, timestamps)
 */
export const cardCreateSchema = cardSchema

/**
 * Card update schema (all fields optional)
 */
export const cardUpdateSchema = cardSchema.partial()

/**
 * Encrypted payload schema
 */
export const encryptedPayloadSchema = z.object({
  iv: z.string(),
  data: z.string(),
  salt: z.string(),
})

/**
 * Backup data schema
 */
export const backupSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.number().int().positive(),
  encrypted: z.boolean(),
  cards: z.union([z.array(z.any()), encryptedPayloadSchema]),
})

/**
 * App settings schema
 */
export const settingsSchema = z.object({
  useEncryption: z.boolean(),
  theme: z.enum(['light', 'dark', 'auto']),
  defaultBarcodeFormat: barcodeFormatSchema,
  lastBackupAt: z.number().int().positive().optional(),
})

/**
 * Password validation (min 8 chars, at least one letter and one number)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Validate card data
 */
export function validateCard(data: unknown): z.infer<typeof cardSchema> {
  return cardSchema.parse(data)
}

/**
 * Validate backup data
 */
export function validateBackup(data: unknown): z.infer<typeof backupSchema> {
  return backupSchema.parse(data)
}

/**
 * Validate settings
 */
export function validateSettings(data: unknown): z.infer<typeof settingsSchema> {
  return settingsSchema.parse(data)
}

/**
 * Validate password
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  try {
    passwordSchema.parse(password)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Invalid password' }
  }
}
