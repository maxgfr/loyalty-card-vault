import { useCallback } from 'react'
import type { LoyaltyCard } from '../types'

export function useShare() {
  const canShare = 'share' in navigator

  const shareCard = useCallback(async (card: LoyaltyCard) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#card/${card.id}`
    const shareData = {
      title: `${card.name} - ${card.storeName || card.name}`,
      text: `Check out my ${card.storeName || card.name} loyalty card`,
      url: shareUrl,
    }

    try {
      // Try Web Share API first
      if (canShare && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        return { success: true }
      }

      // Fallback to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        return { success: true, fallback: 'clipboard' }
      }

      // Last resort: create a temporary textarea and copy
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()

      try {
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return { success: true, fallback: 'clipboard' }
      } catch {
        document.body.removeChild(textArea)
        throw new Error('Clipboard not available')
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
