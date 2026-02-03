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
 * Barcode data validation by format
 */
export const barcodeDataValidators: Record<string, z.ZodString> = {
  QR_CODE: z.string().min(1, 'QR code cannot be empty').max(4296, 'QR code too long'),
  EAN_13: z.string().regex(/^\d{13}$/, 'EAN-13 must be exactly 13 digits'),
  EAN_8: z.string().regex(/^\d{8}$/, 'EAN-8 must be exactly 8 digits'),
  CODE_128: z.string().min(1, 'CODE-128 cannot be empty').max(80, 'CODE-128 too long'),
  CODE_39: z.string().regex(/^[0-9A-Z\-. $/+%%]+$/, 'CODE-39 contains invalid characters').max(43, 'CODE-39 too long'),
  UPC_A: z.string().regex(/^\d{12}$/, 'UPC-A must be exactly 12 digits'),
  UPC_E: z.string().regex(/^\d{8}$/, 'UPC-E must be exactly 8 digits'),
  ITF: z.string().regex(/^\d+$/, 'ITF must contain only digits').refine(data => data.length % 2 === 0, 'ITF must have even number of digits'),
  CODABAR: z.string().regex(/^[A-D][0-9\-$.:/.+]+[A-D]$/, 'CODABAR must start and end with A-D'),
  DATA_MATRIX: z.string().min(1, 'Data Matrix cannot be empty').max(2335, 'Data Matrix too long'),
}

/**
 * Loyalty card schema
 */
export const cardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  storeName: z.string().max(100, 'Store name too long').optional().or(z.literal('')),
  barcodeData: z.string().min(1, 'Barcode data is required').max(500, 'Barcode data too long'),
  barcodeFormat: barcodeFormatSchema,
  color: colorSchema,
  notes: z.string().max(500, 'Notes too long').optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
}).superRefine((data, ctx) => {
  const validator = barcodeDataValidators[data.barcodeFormat]
  if (validator) {
    const result = validator.safeParse(data.barcodeData)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error.issues[0].message,
        path: ['barcodeData'],
      })
    }
  }
})

/**
 * Encrypted payload schema
 */
const encryptedPayloadSchema = z.object({
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
