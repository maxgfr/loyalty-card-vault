import { useCallback } from 'react'
import type { LoyaltyCard } from '../types'

export function useShare() {
  const canShare = 'share' in navigator

  const shareCard = useCallback(async (card: LoyaltyCard) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/card/${card.id}`
    const shareData = {
      title: `${card.name} - ${card.storeName}`,
      text: `Check out my ${card.storeName} loyalty card`,
      url: shareUrl,
    }

    try {
      if (canShare && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        return { success: true }
      } else {
        await navigator.clipboard.writeText(shareUrl)
        return { success: true, fallback: 'clipboard' }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, cancelled: true }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Failed to share' }
    }
  }, [canShare])

  return { canShare, shareCard }
}
