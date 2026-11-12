import { describe, it, expect } from 'vitest'
import { deriveVaultKey, deriveVaultKeyBits, importVaultKey, keyFromPrf, newSalt, seal, unseal } from './crypto'
import { generateId } from './crypto'

describe('crypto utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs in correct format', () => {
      const id = generateId()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('vault key', () => {
    it('is the same derived as a key or as raw bytes', async () => {
      const salt = newSalt()
      const key = await deriveVaultKey('Secret123', salt, 1000)
      const imported = await importVaultKey(await deriveVaultKeyBits('Secret123', salt, 1000))
      expect(await unseal(imported, await seal(key, 'hello', 'ctx'), 'ctx')).toBe('hello')
      expect(await unseal(key, await seal(imported, 'hello', 'ctx'), 'ctx')).toBe('hello')
    })

    it('stays non-extractable once imported', async () => {
      const raw = await deriveVaultKeyBits('Secret123', newSalt(), 1000)
      expect((await importVaultKey(raw)).extractable).toBe(false)
    })
  })

  describe('keyFromPrf', () => {
    it('derives the same key from the same PRF output only', async () => {
      const prf = new Uint8Array(32).fill(1).buffer
      const sealed = await seal(await keyFromPrf(prf), 'vault key')
      expect(await unseal(await keyFromPrf(prf), sealed)).toBe('vault key')
      await expect(unseal(await keyFromPrf(new Uint8Array(32).fill(2).buffer), sealed)).rejects.toThrow()
    })
  })
})
