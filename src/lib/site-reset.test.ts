import { describe, it, expect, beforeEach, vi } from 'vitest'
import { appScope, isOwnCache, isOwnRegistration, resetSiteData } from './site-reset'

const SCOPE = 'https://maxgfr.github.io/loyalty-card-vault/'

describe('site reset on a shared origin', () => {
  it('derives the scope from the base path', () => {
    expect(appScope('/loyalty-card-vault/', 'https://maxgfr.github.io')).toBe(SCOPE)
  })

  it("keeps other apps' caches", () => {
    expect(isOwnCache(`workbox-precache-v2-${SCOPE}`, SCOPE)).toBe(true)
    expect(isOwnCache('loyalty-card-vault-google-fonts', SCOPE)).toBe(true)
    expect(isOwnCache('workbox-precache-v2-https://maxgfr.github.io/genpass/', SCOPE)).toBe(false)
    expect(isOwnCache('google-fonts-cache', SCOPE)).toBe(false)
  })

  it("keeps other apps' service workers", () => {
    expect(isOwnRegistration(SCOPE, SCOPE)).toBe(true)
    expect(isOwnRegistration('https://maxgfr.github.io/', SCOPE)).toBe(false)
    expect(isOwnRegistration('https://maxgfr.github.io/genpass/', SCOPE)).toBe(false)
  })

  describe('resetSiteData', () => {
    beforeEach(() => localStorage.clear())

    it("removes only this app's caches, registrations and localStorage keys", async () => {
      const unregisterOwn = vi.fn().mockResolvedValue(true)
      const unregisterOther = vi.fn().mockResolvedValue(true)
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistrations: () =>
            Promise.resolve([
              { scope: SCOPE, unregister: unregisterOwn },
              { scope: 'https://maxgfr.github.io/genpass/', unregister: unregisterOther },
            ]),
        },
      })
      const deleted: string[] = []
      vi.stubGlobal('caches', {
        keys: () =>
          Promise.resolve([`workbox-precache-v2-${SCOPE}`, 'loyalty-card-vault-google-fonts', 'genpass-pdfjs-fonts']),
        delete: (name: string) => {
          deleted.push(name)
          return Promise.resolve(true)
        },
      })
      localStorage.setItem('loyalty-card-vault:selected-tag', 'Food')
      localStorage.setItem('theme', 'dark')

      await resetSiteData(SCOPE)

      expect(unregisterOwn).toHaveBeenCalled()
      expect(unregisterOther).not.toHaveBeenCalled()
      expect(deleted).toEqual([`workbox-precache-v2-${SCOPE}`, 'loyalty-card-vault-google-fonts'])
      expect(localStorage.getItem('loyalty-card-vault:selected-tag')).toBeNull()
      expect(localStorage.getItem('theme')).toBe('dark')
      vi.unstubAllGlobals()
    })
  })
})
