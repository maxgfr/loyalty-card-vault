import { useState, useEffect, useCallback } from 'react'
import type { LoyaltyCard } from '../types'
import { getAllCards, saveCard, deleteCard as deleteCardFromStorage, getSettings } from '../lib/storage'
import { generateId } from '../lib/crypto'

interface UseCardsReturn {
  cards: LoyaltyCard[]
  isLoading: boolean
  error: string | null
  isLocked: boolean
  addCard: (card: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCard: (id: string, updates: Partial<Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  unlockVault: (password: string) => Promise<boolean>
  lockVault: () => void
  refreshCards: () => Promise<void>
}

export function useCards(): UseCardsReturn {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState<string | null>(null)

  const loadCards = useCallback(async (pwd?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const settings = await getSettings()
      const loadedCards = await getAllCards(settings.useEncryption ? (pwd || password || undefined) : undefined)
      setCards(loadedCards)
      setIsLocked(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
      setCards([])
      setIsLocked(true)
    } finally {
      setIsLoading(false)
    }
  }, [password])

  useEffect(() => {
    loadCards()
  }, [])

  const unlockVault = useCallback(async (pwd: string): Promise<boolean> => {
    try {
      setPassword(pwd)
      await loadCards(pwd)
      return true
    } catch {
      return false
    }
  }, [loadCards])

  const lockVault = useCallback(() => {
    setPassword(null)
    setCards([])
    setIsLocked(true)
  }, [])

  const addCard = useCallback(async (cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCard: LoyaltyCard = {
        ...cardData,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const settings = await getSettings()
      await saveCard(newCard, settings.useEncryption ? (password || undefined) : undefined)

      setCards(prev => [newCard, ...prev])
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add card')
    }
  }, [password])

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

      const settings = await getSettings()
      await saveCard(updatedCard, settings.useEncryption ? (password || undefined) : undefined)

      setCards(prev => prev.map(c => c.id === id ? updatedCard : c))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update card')
    }
  }, [cards, password])

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

  return {
    cards,
    isLoading,
    error,
    isLocked,
    addCard,
    updateCard,
    deleteCard,
    unlockVault,
    lockVault,
    refreshCards,
  }
}
