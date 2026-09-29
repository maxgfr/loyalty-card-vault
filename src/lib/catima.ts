import type { BarcodeFormat, LoyaltyCard } from '../types'
import { generateId } from './crypto'
import { generateColorFromString } from './smart-detection'
import { getAllCards, importCardsRaw } from './storage'
import { barcodeDataValidators } from './validation'

/**
 * Import from Catima (https://catima.app) exports.
 *
 * Catima exports a ZIP (optionally password-protected) containing `catima.csv`.
 * The CSV (format version 2) is made of blank-line separated sections:
 *
 *   2                                   <- format version
 *
 *   _id                                 <- groups
 *   Groceries
 *
 *   _id,store,note,validfrom,expiry,... <- cards
 *   1,Store,Note,,,0,,123456,,EAN_13,,-16777216,0,1700000000,0
 *
 *   cardId,groupId                      <- card <-> group links
 *   1,Groceries
 *
 * Older (version 1) exports are a single CSV with the cards section only.
 */

export class CatimaPasswordError extends Error {
  constructor(message = 'This Catima export is password-protected') {
    super(message)
    this.name = 'CatimaPasswordError'
  }
}

type CardInput = Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>

const MAX_NAME = 100
const MAX_NOTES = 500
const MAX_TAG = 30
const MAX_TAGS = 10

/** Catima (ZXing) barcode type names we can render */
const CATIMA_FORMATS: Record<string, BarcodeFormat> = {
  AZTEC: 'AZTEC',
  CODABAR: 'CODABAR',
  CODE_39: 'CODE_39',
  CODE_93: 'CODE_93',
  CODE_128: 'CODE_128',
  DATA_MATRIX: 'DATA_MATRIX',
  EAN_8: 'EAN_8',
  EAN_13: 'EAN_13',
  ITF: 'ITF',
  PDF_417: 'PDF_417',
  QR_CODE: 'QR_CODE',
  UPC_A: 'UPC_A',
  UPC_E: 'UPC_E',
}

/**
 * RFC 4180 CSV parser. Quoted fields may contain commas, quotes and newlines.
 * A blank line yields an empty row (`[]`), which Catima uses as a section separator.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let rowHasContent = false

  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const endRow = () => {
    row.push(field)
    rows.push(rowHasContent ? row : [])
    row = []
    field = ''
    rowHasContent = false
  }

  for (let i = 0; i < src.length; i++) {
    const c = src[i]

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
      rowHasContent = true
    } else if (c === ',') {
      row.push(field)
      field = ''
      rowHasContent = true
    } else if (c === '\r') {
      if (src[i + 1] === '\n') i++
      endRow()
    } else if (c === '\n') {
      endRow()
    } else {
      field += c
      rowHasContent = true
    }
  }

  if (rowHasContent || field) {
    endRow()
  }

  return rows
}

/** Split rows into sections separated by blank rows */
function splitSections(rows: string[][]): string[][][] {
  const sections: string[][][] = []
  let current: string[][] = []
  for (const row of rows) {
    if (row.length === 0) {
      if (current.length) sections.push(current)
      current = []
    } else {
      current.push(row)
    }
  }
  if (current.length) sections.push(current)
  return sections
}

function toRecords(section: string[][]): Record<string, string>[] {
  const [header, ...rows] = section
  const keys = header.map(h => h.trim().toLowerCase())
  return rows.map(row => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])))
}

/** Convert a signed 32-bit ARGB integer (Android color) to `#rrggbb` */
export function catimaColorToHex(value: string): string | null {
  if (!value.trim()) return null
  const n = Number(value)
  if (!Number.isInteger(n)) return null
  return `#${((n >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`
}

function isValidBarcode(data: string, format: BarcodeFormat): boolean {
  return barcodeDataValidators[format]?.safeParse(data).success ?? true
}

function resolveFormat(type: string, data: string): BarcodeFormat {
  const mapped = CATIMA_FORMATS[type.trim().toUpperCase()]
  if (mapped && isValidBarcode(data, mapped)) return mapped
  // No barcode in Catima, an unsupported type, or data that doesn't fit the format
  return isValidBarcode(data, 'CODE_128') ? 'CODE_128' : 'QR_CODE'
}

function formatDate(value: string): string | null {
  const ms = Number(value)
  if (!value.trim() || !Number.isFinite(ms) || ms <= 0) return null
  return new Date(ms).toISOString().slice(0, 10)
}

function toCard(record: Record<string, string>, groups: string[]): CardInput | null {
  const cardId = (record.cardid ?? '').trim()
  const barcodeId = (record.barcodeid ?? '').trim()
  const barcodeData = barcodeId || cardId
  if (!barcodeData) return null

  const name = (record.store ?? '').trim().slice(0, MAX_NAME) || 'Catima card'

  const extras: string[] = []
  if (barcodeId && cardId && barcodeId !== cardId) extras.push(`Card ID: ${cardId}`)
  const balance = Number(record.balance)
  if (record.balance?.trim() && Number.isFinite(balance) && balance !== 0) {
    extras.push(`Balance: ${record.balance.trim()}${record.balancetype?.trim() ? ` ${record.balancetype.trim()}` : ''}`)
  }
  const validFrom = formatDate(record.validfrom ?? '')
  if (validFrom) extras.push(`Valid from: ${validFrom}`)
  const expiry = formatDate(record.expiry ?? '')
  if (expiry) extras.push(`Expires: ${expiry}`)

  const notes = [(record.note ?? '').trim(), ...extras].filter(Boolean).join('\n').slice(0, MAX_NOTES)

  const tags = [...new Set(groups.map(g => g.trim().slice(0, MAX_TAG)).filter(Boolean))].slice(0, MAX_TAGS)

  return {
    name,
    storeName: name,
    barcodeData,
    barcodeFormat: resolveFormat(record.barcodetype ?? '', barcodeData),
    color: catimaColorToHex(record.headercolor ?? '') ?? generateColorFromString(name),
    ...(notes ? { notes } : {}),
    ...(tags.length ? { tags } : {}),
  }
}

/**
 * Parse the content of a Catima `catima.csv` export into cards (without id/timestamps)
 */
export function parseCatimaCSV(text: string): CardInput[] {
  const sections = splitSections(parseCSV(text))

  let cardRecords: Record<string, string>[] | null = null
  const links: Record<string, string>[] = []

  for (const section of sections) {
    const header = section[0].map(h => h.trim().toLowerCase())
    if (header.includes('store') && header.includes('cardid')) {
      cardRecords = toRecords(section)
    } else if (header.includes('cardid') && header.includes('groupid')) {
      links.push(...toRecords(section))
    }
  }

  if (!cardRecords) {
    throw new Error('Not a valid Catima export: no cards found')
  }

  const groupsByCard = new Map<string, string[]>()
  for (const link of links) {
    const list = groupsByCard.get(link.cardid) ?? []
    list.push(link.groupid)
    groupsByCard.set(link.cardid, list)
  }

  return cardRecords
    .map(record => toCard(record, groupsByCard.get(record._id) ?? []))
    .filter((card): card is CardInput => card !== null)
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/**
 * Extract `catima.csv` from a Catima ZIP export
 * @throws CatimaPasswordError when the archive is encrypted and the password is missing or wrong
 */
async function readCatimaZip(bytes: Uint8Array, password?: string): Promise<string> {
  const { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { useWebWorkers: false })
  try {
    const entries = await reader.getEntries()
    const files = entries.filter(e => !e.directory)
    const entry =
      files.find(e => e.filename.split('/').pop()?.toLowerCase() === 'catima.csv') ??
      files.find(e => e.filename.toLowerCase().endsWith('.csv'))
    if (!entry || entry.directory) {
      throw new Error('Not a valid Catima export: catima.csv not found in archive')
    }

    if (entry.encrypted && !password) {
      throw new CatimaPasswordError()
    }

    try {
      return new TextDecoder().decode(await entry.getData(new Uint8ArrayWriter(), { password }))
    } catch (error) {
      if (entry.encrypted && error instanceof Error && /password|signature/i.test(error.message)) {
        throw new CatimaPasswordError('Incorrect password for this Catima export')
      }
      throw error
    }
  } finally {
    await reader.close()
  }
}

/**
 * Read a Catima export (`.zip` or `.csv`) and return the parsed cards
 */
export async function readCatimaFile(file: Blob, password?: string): Promise<CardInput[]> {
  const bytes = await readBytes(file)
  const text = isZip(bytes) ? await readCatimaZip(bytes, password) : new TextDecoder().decode(bytes)
  return parseCatimaCSV(text)
}

function readBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().then(buffer => new Uint8Array(buffer))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export interface CatimaImportResult {
  success: boolean
  cardCount: number
  skippedCount: number
  needsPassword?: boolean
  error?: string
}

/**
 * Import a Catima export into the vault. Cards already present (same barcode) are skipped.
 */
export async function importCatima(file: Blob, password?: string): Promise<CatimaImportResult> {
  try {
    const parsed = await readCatimaFile(file, password)
    const existing = await getAllCards()
    const seen = new Set(existing.map(c => `${c.barcodeFormat}|${c.barcodeData}`))

    const now = Date.now()
    const cards: LoyaltyCard[] = []
    for (const card of parsed) {
      const key = `${card.barcodeFormat}|${card.barcodeData}`
      if (seen.has(key)) continue
      seen.add(key)
      cards.push({ ...card, id: generateId(), createdAt: now, updatedAt: now })
    }

    const cardCount = await importCardsRaw(cards)
    return { success: true, cardCount, skippedCount: parsed.length - cardCount }
  } catch (error) {
    return {
      success: false,
      cardCount: 0,
      skippedCount: 0,
      needsPassword: error instanceof CatimaPasswordError,
      error: error instanceof Error ? error.message : 'Failed to import Catima export',
    }
  }
}
