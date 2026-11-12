import { useState, useEffect, useCallback, useMemo } from 'react'
import type { LoyaltyCard } from '../types'
import { getAllCards, saveCard, deleteCard as deleteCardFromStorage } from '../lib/storage'
import { generateId } from '../lib/crypto'
import { sortByRecentUse } from '../lib/card-order'

interface UseCardsReturn {
  cards: LoyaltyCard[]
  isLoading: boolean
  error: string | null
  addCard: (card: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCard: (id: string, updates: Partial<Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  markCardUsed: (id: string) => Promise<void>
  refreshCards: () => Promise<void>
}

/**
 * The vault's cards; `unlocked` false (locked or not set up) keeps the list empty, and `isLoading`
 * true until the unlocked vault's cards are loaded.
 */
export function useCards(unlocked = true): UseCardsReturn {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    if (!unlocked) {
      setCards([])
      // Nothing to load until unlocked: stay "loading" so that the first render after an unlock
      // does not pass for an empty vault.
      setIsLoading(true)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const loadedCards = await getAllCards()
      setCards(loadedCards)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
      setCards([])
    } finally {
      setIsLoading(false)
    }
  }, [unlocked])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const addCard = useCallback(async (cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCard: LoyaltyCard = {
        ...cardData,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await saveCard(newCard)

      setCards(prev => [newCard, ...prev])
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add card')
    }
  }, [])

  const updateCard = useCallback(async (id: string, updates: Partial<Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const existingCard = cards.find(c => c.id === id)
      if (!existingCard) {
        throw new Error('Card not found')
      }

      const updatedCard: LoyaltyCard = {
        ...existingCard,
        ...updates,
        updatedAt: Date.now(),
      }

      await saveCard(updatedCard)

      setCards(prev => prev.map(c => c.id === id ? updatedCard : c))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update card')
    }
  }, [cards])

  // Records that a card was opened without touching updatedAt, which tracks edits
  const markCardUsed = useCallback(async (id: string) => {
    const existingCard = cards.find(c => c.id === id)
    if (!existingCard) {
      return
    }

    const usedCard: LoyaltyCard = { ...existingCard, lastUsedAt: Date.now() }

    try {
      await saveCard(usedCard)
      setCards(prev => prev.map(c => c.id === id ? usedCard : c))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to record card usage')
    }
  }, [cards])

  const deleteCard = useCallback(async (id: string) => {
    try {
      await deleteCardFromStorage(id)
      setCards(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete card')
    }
  }, [])

  const refreshCards = useCallback(async () => {
    await loadCards()
  }, [loadCards])

  // Most recently used first, whatever the order state updates left them in
  const sortedCards = useMemo(() => sortByRecentUse(cards), [cards])

  return {
    cards: sortedCards,
    isLoading,
    error,
    addCard,
    updateCard,
    deleteCard,
    markCardUsed,
    refreshCards,
  }
}
