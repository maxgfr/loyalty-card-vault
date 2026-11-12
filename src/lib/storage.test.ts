import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb'
import { openDB } from 'idb'
import type { LoyaltyCard } from '../types'

type Storage = typeof import('./storage')

/** The passkey's PRF output, as the authenticator would return it (no WebAuthn in jsdom). */
const passkey = vi.hoisted(() => ({ prf: new Uint8Array(32).fill(7).buffer as ArrayBuffer }))
vi.mock('./passkey', async importOriginal => ({
  ...(await importOriginal<typeof import('./passkey')>()),
  createPasskey: async () => ({ credentialId: 'Y3JlZGVudGlhbA==', prfOutput: passkey.prf }),
  getPrfOutput: async () => passkey.prf,
}))

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

/** A new page load: the module (and the key in memory) starts over, IndexedDB stays. */
async function relaunch(): Promise<Storage> {
  vi.resetModules()
  return import('./storage')
}

beforeEach(async () => {
  passkey.prf = new Uint8Array(32).fill(7).buffer
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
    await storage.lockVault()

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
      await storage.lockVault()
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

  it('remembers the last opened card until the list is shown again', async () => {
    expect(await storage.getLastOpenCard()).toBeNull()
    await storage.saveLastOpenCard('a')
    expect(await storage.getLastOpenCard()).toBe('a')
    await storage.saveLastOpenCard(null)
    expect(await storage.getLastOpenCard()).toBeNull()
  })

  describe('passkey unlock', () => {
    it('needs the unlocked vault and its password', async () => {
      await storage.createVault('Secret123')
      await expect(storage.enablePasskeyUnlock('Wrong1234')).rejects.toBeInstanceOf(storage.WrongPasswordError)
      expect(await storage.hasPasskeyUnlock()).toBe(false)
      await storage.lockVault()
      await expect(storage.enablePasskeyUnlock('Secret123')).rejects.toBeInstanceOf(storage.VaultLockedError)
    })

    it('opens the vault on the next launch, without the password', async () => {
      await storage.createVault('Secret123')
      await storage.saveCard(card('a', '4006381333931', 'Grocery Club'))
      await storage.enablePasskeyUnlock('Secret123')
      expect(await storage.hasPasskeyUnlock()).toBe(true)
      const dump = await rawDump()
      expect(dump).not.toContain('4006381333931')
      expect(dump).not.toContain('Secret123')

      const next = await relaunch()
      expect(await next.getVaultState()).toBe('locked')
      await next.unlockWithPasskey()
      expect(await next.getVaultState()).toBe('unlocked')
      expect((await next.getAllCards()).map(c => c.name)).toEqual(['Grocery Club'])
    })

    it('another PRF output does not open it', async () => {
      await storage.createVault('Secret123')
      await storage.enablePasskeyUnlock('Secret123')
      passkey.prf = new Uint8Array(32).fill(8).buffer

      const next = await relaunch()
      await expect(next.unlockWithPasskey()).rejects.toBeInstanceOf(next.PasskeyMismatchError)
      expect(await next.getVaultState()).toBe('locked')
    })

    it('can be turned off, and the password still works', async () => {
      await storage.createVault('Secret123')
      await storage.enablePasskeyUnlock('Secret123')
      await storage.disablePasskeyUnlock()
      expect(await storage.hasPasskeyUnlock()).toBe(false)

      const next = await relaunch()
      await expect(next.unlockWithPasskey()).rejects.toThrow()
      await next.unlockVault('Secret123')
      expect(await next.getVaultState()).toBe('unlocked')
    })
  })

  describe('vault without a password', () => {
    it('is created and opened with its passkey only, plain cards sealed', async () => {
      await seedPlain([card('a', '4006381333931', 'Grocery Club')])
      await storage.createVaultWithPasskey()
      expect(await storage.getVaultState()).toBe('unlocked')
      expect(await storage.hasPassword()).toBe(false)
      expect(await storage.hasPasskeyUnlock()).toBe(true)
      expect(await rawDump()).not.toContain('4006381333931')

      const next = await relaunch()
      expect(await next.getVaultState()).toBe('locked')
      await expect(next.unlockVault('Secret123')).rejects.toThrow()
      await next.unlockWithPasskey()
      expect((await next.getAllCards()).map(c => c.name)).toEqual(['Grocery Club'])
    })

    it('keeps its passkey: the only way in', async () => {
      await storage.createVaultWithPasskey()
      await expect(storage.disablePasskeyUnlock()).rejects.toThrow()
      expect(await storage.hasPasskeyUnlock()).toBe(true)
    })

    it('gets a password later; both open it', async () => {
      await storage.createVaultWithPasskey()
      await storage.saveCard(card('a', '111'))
      await storage.setVaultPassword('Secret123')
      expect(await storage.hasPassword()).toBe(true)

      let next = await relaunch()
      await next.unlockVault('Secret123')
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
      next = await relaunch()
      await next.unlockWithPasskey()
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
    })
  })

  describe('changing the password', () => {
    it('without a passkey, needs the current password; nothing changes otherwise', async () => {
      await storage.createVault('Secret123')
      await storage.saveCard(card('a', '111'))
      await expect(storage.setVaultPassword('Newpass456')).rejects.toBeInstanceOf(storage.WrongPasswordError)
      await expect(storage.setVaultPassword('Newpass456', 'Wrong1234')).rejects.toBeInstanceOf(
        storage.WrongPasswordError
      )
      await storage.setVaultPassword('Newpass456', 'Secret123')

      const next = await relaunch()
      await expect(next.unlockVault('Secret123')).rejects.toBeInstanceOf(next.WrongPasswordError)
      await next.unlockVault('Newpass456')
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
    })

    it('a forgotten password: unlocked with the passkey, a new one is set, cards kept', async () => {
      await storage.createVault('Forgotten1')
      await storage.saveCard(card('a', '4006381333931'))
      await storage.enablePasskeyUnlock('Forgotten1')
      await storage.setRememberDevice(true)

      let next = await relaunch()
      await next.lockVault()
      next = await relaunch()
      await next.unlockWithPasskey()
      await next.setVaultPassword('Newpass456')
      expect(await rawDump()).not.toContain('4006381333931')

      next = await relaunch()
      await expect(next.unlockVault('Forgotten1')).rejects.toBeInstanceOf(next.WrongPasswordError)
      await next.unlockVault('Newpass456')
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
      // The passkey was sealed again with the new key
      next = await relaunch()
      await next.unlockWithPasskey()
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
    })

    it('keeps "don\'t ask on this device" working with the new key', async () => {
      await storage.createVault('Secret123')
      await storage.saveCard(card('a', '111'))
      await storage.setRememberDevice(true)
      await storage.setVaultPassword('Newpass456', 'Secret123')

      const next = await relaunch()
      expect(await next.getVaultState()).toBe('unlocked')
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])
    })
  })

  describe("don't ask on this device", () => {
    it('opens the vault on the next launch, until Lock Now', async () => {
      await storage.createVault('Secret123')
      await storage.saveCard(card('a', '111'))
      await storage.setRememberDevice(true)
      expect(await storage.isDeviceRemembered()).toBe(true)

      let next = await relaunch()
      expect(await next.getVaultState()).toBe('unlocked')
      expect((await next.getAllCards()).map(c => c.id)).toEqual(['a'])

      await next.lockVault()
      expect(await next.isDeviceRemembered()).toBe(false)
      next = await relaunch()
      expect(await next.getVaultState()).toBe('locked')
    })

    it('can be turned off', async () => {
      await storage.createVault('Secret123')
      await storage.setRememberDevice(true)
      await storage.setRememberDevice(false)
      expect(await (await relaunch()).getVaultState()).toBe('locked')
    })

    it('forgets a key that does not open the vault', async () => {
      await storage.createVault('Secret123')
      const stranger = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      const db = await openDB('loyalty-card-vault', 1)
      await db.put('settings', stranger, 'deviceKey')
      db.close()

      const next = await relaunch()
      expect(await next.getVaultState()).toBe('locked')
      expect(await next.isDeviceRemembered()).toBe(false)
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
