import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import type { LoyaltyCard } from '../types'

const card = (id: string, barcodeData: string): LoyaltyCard => ({
  id,
  name: `Card ${id}`,
  barcodeData,
  barcodeFormat: 'EAN_13',
  color: '#123456',
  createdAt: 1,
  updatedAt: 1,
})

let storage: typeof import('./storage')
let backup: typeof import('./backup')

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
  storage = await import('./storage')
  backup = await import('./backup')
})

// jsdom's Blob has no text(): read it as a browser would, and hand importBackup what it uses.
const readText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
const fileOf = (text: string) => ({ text: async () => text }) as unknown as File
const asFile = async (blob: Blob) => fileOf(await readText(blob))

describe('backups', () => {
  it('exports an encrypted file that holds no card in clear', async () => {
    await storage.createVault('Secret123')
    await storage.saveCard(card('a', '4006381333931'))
    const text = await readText(await backup.exportBackup())
    const data = JSON.parse(text)
    expect(data.encrypted).toBe(true)
    expect(data.cards.iterations).toBe(600000)
    expect(text).not.toContain('4006381333931')
  })

  it('opens its own backups with the unlocked vault, and others with their password', async () => {
    await storage.createVault('Secret123')
    await storage.saveCard(card('a', '111'))
    const file = await asFile(await backup.exportBackup())

    await storage.clearAllData()
    await storage.createVault('Other4567')
    // Another vault: the backup's password is needed
    expect(await backup.importBackup(file)).toMatchObject({ success: false, needsPassword: true })
    expect(await backup.importBackup(file, 'Wrong1234')).toMatchObject({ success: false, needsPassword: true })
    expect(await backup.importBackup(file, 'Secret123')).toMatchObject({ success: true, cardCount: 1 })
    expect((await storage.getAllCards()).map(c => c.id)).toEqual(['a'])
  })

  it('still imports the unencrypted backups of earlier versions, and seals them', async () => {
    await storage.createVault('Secret123')
    const old = { version: 1, exportedAt: 1, encrypted: false, cards: [card('x', '5012345678900')] }
    const file = fileOf(JSON.stringify(old))
    expect(await backup.importBackup(file)).toMatchObject({ success: true, cardCount: 1 })
    expect((await storage.getAllCards()).map(c => c.id)).toEqual(['x'])
  })
})
