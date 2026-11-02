/**
 * Everything of this app's that a reset removes besides its IndexedDB: its service worker, its
 * caches and its localStorage keys. Every maxgfr.github.io app shares this origin, and with it the
 * service worker registrations, Cache Storage and localStorage: only what is this app's own is
 * touched, never another app's.
 */

/** This app's localStorage keys all start with this. */
export const STORAGE_PREFIX = 'loyalty-card-vault:'
/** Runtime caches are named with this prefix; Workbox's precache name contains the scope. */
export const CACHE_PREFIX = 'loyalty-card-vault-'

/** The app's service worker scope, e.g. https://maxgfr.github.io/loyalty-card-vault/ */
export function appScope(base: string = import.meta.env.BASE_URL, origin: string = location.origin): string {
  return new URL(base, origin).href
}

export function isOwnCache(name: string, scope: string): boolean {
  return name.startsWith(CACHE_PREFIX) || name.includes(scope)
}

export function isOwnRegistration(registrationScope: string, scope: string): boolean {
  return registrationScope.startsWith(scope)
}

/** Unregisters this app's service worker, deletes its caches and its localStorage keys. */
export async function resetSiteData(scope: string = appScope()): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations.filter((r) => isOwnRegistration(r.scope, scope)).map((r) => r.unregister()),
    )
  }

  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => isOwnCache(n, scope)).map((n) => caches.delete(n)))
  }

  try {
    const own: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) own.push(key)
    }
    own.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage unavailable: nothing of ours is in it
  }
}
