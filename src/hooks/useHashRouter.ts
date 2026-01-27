import { useState, useEffect, useCallback } from 'react'
import type { Route } from '../types'

/**
 * Parse the current hash to a Route object
 */
function parseHash(hash: string): Route {
  const path = hash.replace('#', '')

  if (!path || path === '/') {
    return { page: 'home' }
  }

  const segments = path.split('/').filter(Boolean)
  const [page, ...params] = segments

  switch (page) {
    case 'card':
      return { page: 'card', cardId: params[0] || '' }
    case 'scan':
      return { page: 'scan' }
    case 'add':
      return { page: 'add' }
    case 'settings':
      return { page: 'settings' }
    case 'setup':
      return { page: 'setup' }
    default:
      return { page: 'home' }
  }
}

/**
 * Convert a Route object to a hash string
 */
function routeToHash(route: Route): string {
  switch (route.page) {
    case 'home':
      return '#/'
    case 'card':
      return `#/card/${route.cardId}`
    case 'scan':
      return '#/scan'
    case 'add':
      return '#/add'
    case 'settings':
      return '#/settings'
    case 'setup':
      return '#/setup'
    default:
      return '#/'
  }
}

/**
 * Custom hook for hash-based routing
 */
export function useHashRouter() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash))
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((newRoute: Route) => {
    const hash = routeToHash(newRoute)
    window.location.hash = hash
  }, [])

  const goBack = useCallback(() => {
    window.history.back()
  }, [])

  return {
    route,
    navigate,
    goBack,
  }
}
