import { describe, it, expect } from 'vitest'
import { mapZXingFormat } from './scanner'
import type { BarcodeFormat } from '../types'

describe('scanner utilities', () => {
  describe('mapZXingFormat', () => {
    it('should map QR_CODE format', () => {
      expect(mapZXingFormat('QR_CODE')).toBe('QR_CODE')
    })

    it('should map EAN_13 format', () => {
      expect(mapZXingFormat('EAN_13')).toBe('EAN_13')
    })

    it('should map EAN_8 format', () => {
      expect(mapZXingFormat('EAN_8')).toBe('EAN_8')
    })

    it('should map CODE_128 format', () => {
      expect(mapZXingFormat('CODE_128')).toBe('CODE_128')
    })

    it('should map CODE_39 format', () => {
      expect(mapZXingFormat('CODE_39')).toBe('CODE_39')
    })

    it('should map UPC_A format', () => {
      expect(mapZXingFormat('UPC_A')).toBe('UPC_A')
    })

    it('should map UPC_E format', () => {
      expect(mapZXingFormat('UPC_E')).toBe('UPC_E')
    })

    it('should map ITF format', () => {
      expect(mapZXingFormat('ITF')).toBe('ITF')
    })

    it('should map CODABAR format', () => {
      expect(mapZXingFormat('CODABAR')).toBe('CODABAR')
    })

    it('should map DATA_MATRIX format', () => {
      expect(mapZXingFormat('DATA_MATRIX')).toBe('DATA_MATRIX')
    })

    it('should return QR_CODE for unknown formats', () => {
      expect(mapZXingFormat('UNKNOWN_FORMAT')).toBe('QR_CODE')
      expect(mapZXingFormat('INVALID')).toBe('QR_CODE')
      expect(mapZXingFormat('')).toBe('QR_CODE')
    })

    it('should handle all supported ZXing format names', () => {
      const supportedFormats: Array<[string, BarcodeFormat]> = [
        ['QR_CODE', 'QR_CODE'],
        ['EAN_13', 'EAN_13'],
        ['EAN_8', 'EAN_8'],
        ['CODE_128', 'CODE_128'],
        ['CODE_39', 'CODE_39'],
        ['UPC_A', 'UPC_A'],
        ['UPC_E', 'UPC_E'],
        ['ITF', 'ITF'],
        ['CODABAR', 'CODABAR'],
        ['DATA_MATRIX', 'DATA_MATRIX'],
      ]

      supportedFormats.forEach(([zxingFormat, expectedFormat]) => {
        expect(mapZXingFormat(zxingFormat)).toBe(expectedFormat)
      })
    })

    it('should be case sensitive', () => {
      expect(mapZXingFormat('qr_code')).toBe('QR_CODE') // Falls back to default
      expect(mapZXingFormat('Qr_Code')).toBe('QR_CODE') // Falls back to default
    })
  })

  describe('barcode format coverage', () => {
    it('should support all common retail barcode formats', () => {
      const retailFormats = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']
      retailFormats.forEach(format => {
        const mapped = mapZXingFormat(format)
        expect(mapped).toBeTruthy()
        expect(mapped).not.toBe('QR_CODE') // Should not fall back
      })
    })

    it('should support industrial barcode formats', () => {
      const industrialFormats = ['CODE_128', 'CODE_39', 'ITF', 'CODABAR']
      industrialFormats.forEach(format => {
        const mapped = mapZXingFormat(format)
        expect(mapped).toBeTruthy()
        expect(mapped).not.toBe('QR_CODE') // Should not fall back
      })
    })

    it('should support 2D barcode formats', () => {
      const twoDFormats = ['QR_CODE', 'DATA_MATRIX']
      twoDFormats.forEach(format => {
        const mapped = mapZXingFormat(format)
        expect(mapped).toBeTruthy()
      })
    })
  })
})
