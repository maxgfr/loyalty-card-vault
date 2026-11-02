import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb'
import { openDB } from 'idb'
import type { LoyaltyCard } from '../types'

type Storage = typeof import('./storage')

const card = (id: string, barcodeData: string, name = `Card ${id}`): LoyaltyCard => ({
  id,
  name,
  barcodeData,
  barcodeFormat: 'EAN_13',
  color: '#123456',
  createdAt: 1,
  updatedAt: 1,
})

/** Everything IndexedDB holds, as another site of the origin would read it. */
async function rawDump(): Promise<string> {
  const db = await openDB('loyalty-card-vault', 1)
  const dump = JSON.stringify({ cards: await db.getAll('cards'), settings: await db.getAll('settings') })
  db.close()
  return dump
}

/** A database as earlier versions left it: settings and cards in clear text, no vault. */
async function seedPlain(cards: LoyaltyCard[]): Promise<void> {
  const db = await openDB('loyalty-card-vault', 1, {
    upgrade(d) {
      d.createObjectStore('cards')
      d.createObjectStore('settings')
    },
  })
  for (const c of cards) await db.put('cards', c, c.id)
  await db.put('settings', true, 'useEncryption')
  await db.put('settings', 'dark', 'theme')
  db.close()
}

let storage: Storage

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
  storage = await import('./storage')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('vault storage', () => {
  it('starts with no vault, then creates one and keeps cards sealed', async () => {
    expect(await storage.getVaultState()).toBe('none')
    await storage.createVault('Secret123')
    expect(await storage.getVaultState()).toBe('unlocked')

    await storage.saveCard(card('a', '4006381333931', 'Grocery Club'))
    expect(await storage.getAllCards()).toEqual([card('a', '4006381333931', 'Grocery Club')])

    const dump = await rawDump()
    expect(dump).not.toContain('4006381333931')
    expect(dump).not.toContain('Grocery Club')
    expect(dump).not.toContain('Secret123')
  })

  it('refuses everything while locked, and unlocks only with the right password', async () => {
    await storage.createVault('Secret123')
    await storage.saveCard(card('a', '111'))
    storage.lockVault()

    expect(await storage.getVaultState()).toBe('locked')
    await expect(storage.getAllCards()).rejects.toBeInstanceOf(storage.VaultLockedError)
    await expect(storage.saveCard(card('b', '222'))).rejects.toBeInstanceOf(storage.VaultLockedError)
    await expect(storage.unlockVault('Wrong1234')).rejects.toBeInstanceOf(storage.WrongPasswordError)
    expect(await storage.getVaultState()).toBe('locked')

    await storage.unlockVault('Secret123')
    expect((await storage.getAllCards()).map(c => c.id)).toEqual(['a'])
  })

  it('the key never reaches storage: a reload starts locked', async () => {
    await storage.createVault('Secret123')
    vi.resetModules()
    const reloaded: Storage = await import('./storage')
    expect(await reloaded.getVaultState()).toBe('locked')
  })

  it('a card sealed under one id does not open under another', async () => {
    await storage.createVault('Secret123')
    await storage.saveCard(card('a', '111'))
    const db = await openDB('loyalty-card-vault', 1)
    await db.put('cards', await db.get('cards', 'a'), 'b')
    db.close()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await storage.getAllCards()).map(c => c.id)).toEqual(['a'])
    expect(errors).toHaveBeenCalled()
  })

  describe('migration from plain-text cards', () => {
    it('encrypts every existing card and leaves no plain copy', async () => {
      await seedPlain([card('a', '4006381333931', 'Grocery Club'), card('b', '9780201379624', 'Bookshop')])
      expect(await storage.getVaultState()).toBe('none')
      expect(await storage.countPlainCards()).toBe(2)

      await storage.createVault('Secret123')

      expect(await storage.countPlainCards()).toBe(0)
      const dump = await rawDump()
      for (const secret of ['4006381333931', 'Grocery Club', '9780201379624', 'Bookshop']) {
        expect(dump).not.toContain(secret)
      }
      storage.lockVault()
      await storage.unlockVault('Secret123')
      expect((await storage.getAllCards()).map(c => c.name).sort()).toEqual(['Bookshop', 'Grocery Club'])
      // Preferences survive
      expect((await storage.getSettings()).theme).toBe('dark')
    })

    it('keeps the plain cards untouched when the encrypted write fails', async () => {
      await seedPlain([card('a', '4006381333931'), card('b', '9780201379624')])
      const put = FakeObjectStore.prototype.put
      vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(function (
        this: InstanceType<typeof FakeObjectStore>,
        value: unknown,
        key?: IDBValidKey
      ) {
        if (typeof value === 'object' && value !== null && 'kdf' in value) {
          // As a full disk does: the transaction is aborted
          this.transaction.abort()
          throw new DOMException('quota', 'QuotaExceededError')
        }
        return put.call(this, value, key)
      })

      await expect(storage.createVault('Secret123')).rejects.toThrow()
      vi.restoreAllMocks()

      expect(await storage.getVaultState()).toBe('none')
      expect(await storage.countPlainCards()).toBe(2)
      expect(await rawDump()).toContain('4006381333931')
    })

    it('seals a plain card written later by an older version still open in another tab', async () => {
      await storage.createVault('Secret123')
      const db = await openDB('loyalty-card-vault', 1)
      await db.put('cards', card('late', '5012345678900'), 'late')
      db.close()
      expect((await storage.getAllCards()).map(c => c.id)).toEqual(['late'])
      expect(await rawDump()).not.toContain('5012345678900')
    })
  })

  it('reset removes the vault and locks', async () => {
    await storage.createVault('Secret123')
    await storage.saveCard(card('a', '111'))
    await storage.clearAllData()
    expect(await storage.getVaultState()).toBe('none')
    expect(await storage.countPlainCards()).toBe(0)
  })
})
