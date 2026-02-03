import { describe, it, expect } from 'vitest'
import {
  cardSchema,
  barcodeFormatSchema,
  colorSchema,
  passwordSchema,
  barcodeDataValidators,
} from './validation'

describe('validation schemas', () => {
  describe('barcodeFormatSchema', () => {
    it('should validate correct barcode formats', () => {
      expect(() => barcodeFormatSchema.parse('QR_CODE')).not.toThrow()
      expect(() => barcodeFormatSchema.parse('EAN_13')).not.toThrow()
      expect(() => barcodeFormatSchema.parse('CODE_128')).not.toThrow()
    })

    it('should reject invalid formats', () => {
      expect(() => barcodeFormatSchema.parse('INVALID')).toThrow()
      expect(() => barcodeFormatSchema.parse('')).toThrow()
    })
  })

  describe('colorSchema', () => {
    it('should validate correct hex colors', () => {
      expect(() => colorSchema.parse('#000000')).not.toThrow()
      expect(() => colorSchema.parse('#FFFFFF')).not.toThrow()
      expect(() => colorSchema.parse('#6366f1')).not.toThrow()
    })

    it('should reject invalid colors', () => {
      expect(() => colorSchema.parse('000000')).toThrow() // Missing #
      expect(() => colorSchema.parse('#00')).toThrow() // Too short
      expect(() => colorSchema.parse('#GGGGGG')).toThrow() // Invalid hex
    })
  })

  describe('cardSchema', () => {
    it('should validate a valid card', () => {
      const validCard = {
        name: 'My Card',
        storeName: '',
        barcodeData: '1234567890123',
        barcodeFormat: 'EAN_13',
        color: '#6366f1',
      }

      expect(() => cardSchema.parse(validCard)).not.toThrow()
    })

    it('should allow optional store name', () => {
      const cardWithoutStore = {
        name: 'My Card',
        storeName: '',
        barcodeData: '1234567890',
        barcodeFormat: 'QR_CODE',
        color: '#6366f1',
      }

      expect(() => cardSchema.parse(cardWithoutStore)).not.toThrow()
    })

    it('should reject invalid card data', () => {
      const invalidCard = {
        name: '',
        storeName: 'Store',
        barcodeData: '123',
        barcodeFormat: 'EAN_13',
        color: '#6366f1',
      }

      expect(() => cardSchema.parse(invalidCard)).toThrow() // Empty name
    })
  })

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      expect(() => passwordSchema.parse('Pass1234')).not.toThrow()
      expect(() => passwordSchema.parse('MySecure123')).not.toThrow()
    })

    it('should reject weak passwords', () => {
      expect(() => passwordSchema.parse('short')).toThrow() // Too short
      expect(() => passwordSchema.parse('nodigits')).toThrow() // No digits
      expect(() => passwordSchema.parse('12345678')).toThrow() // No letters
    })
  })

  describe('barcodeDataValidators', () => {
    it('should validate EAN-13 format', () => {
      const validator = barcodeDataValidators.EAN_13
      expect(validator.safeParse('1234567890123').success).toBe(true)
      expect(validator.safeParse('123').success).toBe(false)
      expect(validator.safeParse('12345678901234').success).toBe(false)
    })

    it('should validate UPC-A format', () => {
      const validator = barcodeDataValidators.UPC_A
      expect(validator.safeParse('123456789012').success).toBe(true)
      expect(validator.safeParse('12345678901').success).toBe(false)
    })

    it('should validate QR_CODE format', () => {
      const validator = barcodeDataValidators.QR_CODE
      expect(validator.safeParse('Any text here').success).toBe(true)
      expect(validator.safeParse('').success).toBe(false)
    })

    it('should validate CODE_39 format', () => {
      const validator = barcodeDataValidators.CODE_39
      expect(validator.safeParse('ABC-123').success).toBe(true)
      expect(validator.safeParse('abc123').success).toBe(false) // Lowercase not allowed
    })

    it('should validate EAN-8 format', () => {
      const validator = barcodeDataValidators.EAN_8
      expect(validator.safeParse('12345678').success).toBe(true)
      expect(validator.safeParse('1234567').success).toBe(false) // Too short
      expect(validator.safeParse('123456789').success).toBe(false) // Too long
      expect(validator.safeParse('1234567a').success).toBe(false) // Non-numeric
    })

    it('should validate UPC-E format', () => {
      const validator = barcodeDataValidators.UPC_E
      expect(validator.safeParse('12345678').success).toBe(true)
      expect(validator.safeParse('1234567').success).toBe(false) // Too short
      expect(validator.safeParse('123456789').success).toBe(false) // Too long
    })

    it('should validate CODE_128 format', () => {
      const validator = barcodeDataValidators.CODE_128
      expect(validator.safeParse('ABC123').success).toBe(true)
      expect(validator.safeParse('abc123').success).toBe(true) // Case insensitive
      expect(validator.safeParse('ABC-123 xyz').success).toBe(true) // Allows spaces and special chars
      expect(validator.safeParse('').success).toBe(false) // Empty not allowed
    })

    it('should validate ITF format', () => {
      const validator = barcodeDataValidators.ITF
      expect(validator.safeParse('12345678901234').success).toBe(true) // Even length
      expect(validator.safeParse('1234567890').success).toBe(true) // Even length
      expect(validator.safeParse('123').success).toBe(false) // Odd length
      expect(validator.safeParse('12345').success).toBe(false) // Odd length
      expect(validator.safeParse('1234a678').success).toBe(false) // Non-numeric
    })

    it('should validate CODABAR format', () => {
      const validator = barcodeDataValidators.CODABAR
      expect(validator.safeParse('A123456B').success).toBe(true)
      expect(validator.safeParse('C12-34.56D').success).toBe(true)
      expect(validator.safeParse('A$123:45/B').success).toBe(true)
      expect(validator.safeParse('a123456b').success).toBe(false) // Must be uppercase
      expect(validator.safeParse('123456').success).toBe(false) // Must start/end with A-D
      expect(validator.safeParse('').success).toBe(false) // Empty not allowed
    })

    it('should validate DATA_MATRIX format', () => {
      const validator = barcodeDataValidators.DATA_MATRIX
      expect(validator.safeParse('Any data here').success).toBe(true)
      expect(validator.safeParse('123').success).toBe(true)
      expect(validator.safeParse('ABC-xyz-123').success).toBe(true)
      expect(validator.safeParse('').success).toBe(false) // Empty not allowed
    })

    it('should have validators for all supported formats', () => {
      const supportedFormats = [
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
      ]

      supportedFormats.forEach(format => {
        expect(barcodeDataValidators[format as keyof typeof barcodeDataValidators]).toBeDefined()
      })
    })
  })
})
