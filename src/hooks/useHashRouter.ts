import { useState, useEffect, useCallback } from 'react'
import type { Route, BarcodeFormat } from '../types'

/**
 * Parse the current hash to a Route object
 */
function parseHash(hash: string): Route {
  const path = hash.replace('#', '')

  if (!path || path === '/') {
    return { page: 'home' }
  }

  // Split path and query parameters
  const [pathPart, queryPart] = path.split('?')
  const segments = pathPart.split('/').filter(Boolean)
  const [page, ...params] = segments

  // Parse query parameters
  const queryParams = new URLSearchParams(queryPart || '')

  switch (page) {
    case 'card':
      return { page: 'card', cardId: params[0] || '' }
    case 'scan':
      return { page: 'scan' }
    case 'add': {
      const barcodeData = queryParams.get('barcodeData') || undefined
      const barcodeFormat = queryParams.get('barcodeFormat') as BarcodeFormat || undefined
      return { page: 'add', barcodeData, barcodeFormat }
    }
    case 'edit':
      return { page: 'edit', cardId: params[0] || '' }
    case 'settings':
      return { page: 'settings' }
    case 'setup':
      return { page: 'setup' }
    case 'help':
      return { page: 'help' }
    case 'share':
      return { page: 'share', encodedData: params[0] || '' }
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
    case 'add': {
      const params = new URLSearchParams()
      if (route.barcodeData) params.set('barcodeData', route.barcodeData)
      if (route.barcodeFormat) params.set('barcodeFormat', route.barcodeFormat)
      const query = params.toString()
      return query ? `#/add?${query}` : '#/add'
    }
    case 'edit':
      return `#/edit/${route.cardId}`
    case 'settings':
      return '#/settings'
    case 'setup':
      return '#/setup'
    case 'help':
      return '#/help'
    case 'share':
      return `#/share/${route.encodedData}`
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
