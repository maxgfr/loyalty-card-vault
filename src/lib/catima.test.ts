import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } from '@zip.js/zip.js'
import {
  parseCSV,
  parseCatimaCSV,
  catimaColorToHex,
  readCatimaFile,
  importCatima,
  CatimaPasswordError,
} from './catima'
import { getAllCards, importCardsRaw } from './storage'
import type { LoyaltyCard } from '../types'

vi.mock('./storage', () => ({
  getAllCards: vi.fn(),
  importCardsRaw: vi.fn(),
}))

const CARDS_HEADER =
  '_id,store,note,validfrom,expiry,balance,balancetype,cardid,barcodeid,barcodetype,barcodeencoding,headercolor,starstatus,lastused,archive'

const CATIMA_V2 = [
  '2',
  '',
  '_id',
  'Groceries',
  'Travel',
  '',
  CARDS_HEADER,
  '1,Carrefour,"Family card, shared",,,0,,3560070000001,,EAN_13,,-16776961,1,1700000000,0',
  '2,SNCF,"Line one',
  'line two",,1767225600000,12.5,EUR,ABC123,XYZ-789,AZTEC,ISO-8859-1,-65536,0,0,0',
  '3,Library,,,,,,4242,,,,,0,0,0',
  '4,Broken EAN,,,,,,1234,,EAN_13,,,0,0,0',
  '',
  'cardId,groupId',
  '1,Groceries',
  '2,Travel',
  '2,Groceries',
  '',
].join('\n')

async function makeZip(csv: string, password?: string, zipCrypto = true): Promise<Blob> {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false })
  const data = new Uint8ArrayReader(new TextEncoder().encode(csv))
  await writer.add('catima.csv', data, password ? { password, zipCrypto } : undefined)
  return new Blob([await writer.close()], { type: 'application/zip' })
}

describe('catima', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseCSV', () => {
    it('handles quoted fields, escaped quotes, newlines and blank lines', () => {
      expect(parseCSV('a,"b,""c"""\r\n\r\n"multi\nline",d')).toEqual([
        ['a', 'b,"c"'],
        [],
        ['multi\nline', 'd'],
      ])
    })

    it('strips a UTF-8 BOM', () => {
      expect(parseCSV('﻿a,b')).toEqual([['a', 'b']])
    })
  })

  describe('catimaColorToHex', () => {
    it('converts signed ARGB integers to hex', () => {
      expect(catimaColorToHex('-16776961')).toBe('#0000ff')
      expect(catimaColorToHex('-65536')).toBe('#ff0000')
      expect(catimaColorToHex('-16777216')).toBe('#000000')
    })

    it('returns null for empty or invalid values', () => {
      expect(catimaColorToHex('')).toBeNull()
      expect(catimaColorToHex('abc')).toBeNull()
    })
  })

  describe('parseCatimaCSV', () => {
    it('parses a version 2 export', () => {
      const cards = parseCatimaCSV(CATIMA_V2)
      expect(cards).toHaveLength(4)

      expect(cards[0]).toEqual({
        name: 'Carrefour',
        storeName: 'Carrefour',
        barcodeData: '3560070000001',
        barcodeFormat: 'EAN_13',
        color: '#0000ff',
        notes: 'Family card, shared',
        tags: ['Groceries'],
      })
    })

    it('prefers barcodeid and keeps extra fields in notes', () => {
      const [, sncf] = parseCatimaCSV(CATIMA_V2)
      expect(sncf.barcodeData).toBe('XYZ-789')
      expect(sncf.barcodeFormat).toBe('AZTEC')
      expect(sncf.color).toBe('#ff0000')
      expect(sncf.tags).toEqual(['Travel', 'Groceries'])
      expect(sncf.notes).toBe(
        'Line one\nline two\nCard ID: ABC123\nBalance: 12.5 EUR\nExpires: 2026-01-01'
      )
    })

    it('falls back to CODE_128 when there is no or an invalid barcode type', () => {
      const [, , library, broken] = parseCatimaCSV(CATIMA_V2)
      expect(library.barcodeFormat).toBe('CODE_128')
      expect(library.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(library.tags).toBeUndefined()
      expect(broken.barcodeFormat).toBe('CODE_128')
    })

    it('parses a version 1 export (cards section only)', () => {
      const cards = parseCatimaCSV(
        '_id,store,note,cardid,headercolor,barcodetype\n1,Shop,,12345678,,EAN_8\n'
      )
      expect(cards).toHaveLength(1)
      expect(cards[0]).toMatchObject({ name: 'Shop', barcodeData: '12345678', barcodeFormat: 'EAN_8' })
    })

    it('skips cards without a card id', () => {
      const cards = parseCatimaCSV(`${CARDS_HEADER}\n1,Empty,,,,,,,,,,,0,0,0\n`)
      expect(cards).toEqual([])
    })

    it('rejects files that are not Catima exports', () => {
      expect(() => parseCatimaCSV('foo,bar\n1,2')).toThrow('Not a valid Catima export')
    })
  })

  describe('readCatimaFile', () => {
    it('reads a plain CSV file', async () => {
      const cards = await readCatimaFile(new Blob([CATIMA_V2], { type: 'text/csv' }))
      expect(cards).toHaveLength(4)
    })

    it('reads a ZIP export', async () => {
      const cards = await readCatimaFile(await makeZip(CATIMA_V2))
      expect(cards).toHaveLength(4)
    })

    it.each([
      ['ZipCrypto', true],
      ['AES', false],
    ])('reads a password-protected (%s) ZIP export', async (_, zipCrypto) => {
      const zip = await makeZip(CATIMA_V2, 'secret', zipCrypto)
      await expect(readCatimaFile(zip)).rejects.toBeInstanceOf(CatimaPasswordError)
      await expect(readCatimaFile(zip, 'wrong')).rejects.toThrow('Incorrect password')
      expect(await readCatimaFile(zip, 'secret')).toHaveLength(4)
    })
  })

  describe('importCatima', () => {
    it('imports new cards and skips duplicates', async () => {
      vi.mocked(getAllCards).mockResolvedValue([
        { barcodeData: '3560070000001', barcodeFormat: 'EAN_13' } as LoyaltyCard,
      ])
      vi.mocked(importCardsRaw).mockImplementation(async cards => cards.length)

      const result = await importCatima(new Blob([CATIMA_V2]))

      expect(result).toEqual({ success: true, cardCount: 3, skippedCount: 1 })
      const imported = vi.mocked(importCardsRaw).mock.calls[0][0] as LoyaltyCard[]
      expect(imported.map(c => c.name)).toEqual(['SNCF', 'Library', 'Broken EAN'])
      expect(imported.every(c => c.id && c.createdAt && c.updatedAt)).toBe(true)
    })

    it('reports when a password is required', async () => {
      const result = await importCatima(await makeZip(CATIMA_V2, 'secret'))
      expect(result.success).toBe(false)
      expect(result.needsPassword).toBe(true)
      expect(importCardsRaw).not.toHaveBeenCalled()
    })

    it('reports invalid files', async () => {
      const result = await importCatima(new Blob(['hello']))
      expect(result).toMatchObject({ success: false, needsPassword: false })
      expect(result.error).toContain('Not a valid Catima export')
    })
  })
})
