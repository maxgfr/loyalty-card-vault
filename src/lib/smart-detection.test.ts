import { describe, it, expect } from 'vitest'
import {
  detectBarcodeFormat,
  suggestStoreNames,
  getStoreColor,
  generateColorFromString,
  getSmartDefaults,
} from './smart-detection'

describe('smart detection utilities', () => {
  describe('detectBarcodeFormat', () => {
    it('should detect EAN-13', () => {
      expect(detectBarcodeFormat('1234567890123')).toBe('EAN_13')
    })

    it('should detect EAN-8', () => {
      expect(detectBarcodeFormat('12345678')).toBe('EAN_8')
    })

    it('should detect UPC-A', () => {
      expect(detectBarcodeFormat('123456789012')).toBe('UPC_A')
    })

    it('should detect QR_CODE for long strings', () => {
      const longString = 'a'.repeat(100)
      expect(detectBarcodeFormat(longString)).toBe('QR_CODE')
    })

    it('should detect CODE_128 for alphanumeric', () => {
      expect(detectBarcodeFormat('ABC123xyz')).toBe('CODE_128')
    })

    it('should return null for empty string', () => {
      expect(detectBarcodeFormat('')).toBeNull()
    })
  })

  describe('suggestStoreNames', () => {
    it('should return suggestions for partial input', () => {
      const suggestions = suggestStoreNames('star')
      expect(suggestions).toContain('Starbucks')
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should be case insensitive', () => {
      const suggestions = suggestStoreNames('STAR')
      expect(suggestions).toContain('Starbucks')
    })

    it('should return empty for short input', () => {
      const suggestions = suggestStoreNames('a')
      expect(suggestions).toEqual([])
    })

    it('should return empty for no matches', () => {
      const suggestions = suggestStoreNames('xyz123')
      expect(suggestions).toEqual([])
    })
  })

  describe('getStoreColor', () => {
    it('should return color for known stores', () => {
      expect(getStoreColor('Starbucks')).toBe('#00704A')
      expect(getStoreColor('Target')).toBe('#CC0000')
    })

    it('should be case insensitive', () => {
      expect(getStoreColor('starbucks')).toBe('#00704A')
      expect(getStoreColor('STARBUCKS')).toBe('#00704A')
    })

    it('should return null for unknown stores', () => {
      expect(getStoreColor('Unknown Store')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(getStoreColor('')).toBeNull()
    })
  })

  describe('generateColorFromString', () => {
    it('should generate consistent colors for same input', () => {
      const color1 = generateColorFromString('Test Store')
      const color2 = generateColorFromString('Test Store')
      expect(color1).toBe(color2)
    })

    it('should generate different colors for different inputs', () => {
      const color1 = generateColorFromString('Store A')
      const color2 = generateColorFromString('Store B')
      expect(color1).not.toBe(color2)
    })

    it('should generate valid hex colors', () => {
      const color = generateColorFromString('Any Store')
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  describe('getSmartDefaults', () => {
    it('should detect format and generate color', () => {
      const defaults = getSmartDefaults('1234567890123', 'Starbucks')
      expect(defaults.barcodeFormat).toBe('EAN_13')
      expect(defaults.color).toBe('#00704A')
    })

    it('should handle unknown stores', () => {
      const defaults = getSmartDefaults('123456', 'My Store')
      expect(defaults.barcodeFormat).toBeTruthy()
      expect(defaults.color).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('should use default color when no store', () => {
      const defaults = getSmartDefaults('123456')
      expect(defaults.color).toBe('#6366f1')
    })
  })
})
