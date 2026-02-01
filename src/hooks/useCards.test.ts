import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCards } from './useCards'
import * as storage from '../lib/storage'
import * as crypto from '../lib/crypto'

vi.mock('../lib/storage')
vi.mock('../lib/crypto')

describe('useCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storage.getSettings).mockResolvedValue({
      useEncryption: false,
      theme: 'auto',
      defaultBarcodeFormat: 'QR_CODE',
    })
    vi.mocked(storage.getAllCards).mockResolvedValue([])
    vi.mocked(crypto.generateId).mockReturnValue('test-id-123')
  })

  it('loads cards on mount', async () => {
    const mockCards = [
      {
        id: '1',
        name: 'Test Card',
        storeName: 'Test Store',
        barcodeData: '123456',
        barcodeFormat: 'QR_CODE' as const,
        color: '#FF5733',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    vi.mocked(storage.getAllCards).mockResolvedValue(mockCards)

    const { result } = renderHook(() => useCards())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cards).toEqual(mockCards)
    expect(result.current.error).toBe(null)
    expect(result.current.isLocked).toBe(false)
  })

  it('handles loading error', async () => {
    vi.mocked(storage.getAllCards).mockRejectedValue(new Error('Database error'))

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cards).toEqual([])
    expect(result.current.error).toBe('Database error')
    expect(result.current.isLocked).toBe(true)
  })

  it('adds a new card', async () => {
    vi.mocked(storage.saveCard).mockResolvedValue()
    vi.mocked(storage.getAllCards).mockResolvedValue([])

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newCardData = {
      name: 'New Card',
      storeName: 'New Store',
      barcodeData: '789',
      barcodeFormat: 'QR_CODE' as const,
      color: '#00FF00',
    }

    await act(async () => {
      await result.current.addCard(newCardData)
    })

    expect(storage.saveCard).toHaveBeenCalled()

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(1)
    })
    expect(result.current.cards[0]).toMatchObject(newCardData)
    expect(result.current.cards[0].id).toBe('test-id-123')
  })

  it('updates an existing card', async () => {
    const existingCard = {
      id: 'card-1',
      name: 'Old Name',
      storeName: 'Old Store',
      barcodeData: '123',
      barcodeFormat: 'QR_CODE' as const,
      color: '#FF0000',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    vi.mocked(storage.getAllCards).mockResolvedValue([existingCard])
    vi.mocked(storage.saveCard).mockResolvedValue()

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateCard('card-1', { name: 'New Name' })
    })

    expect(storage.saveCard).toHaveBeenCalled()

    await waitFor(() => {
      expect(result.current.cards[0].name).toBe('New Name')
    })
    expect(result.current.cards[0].storeName).toBe('Old Store')
  })

  it('deletes a card', async () => {
    const existingCard = {
      id: 'card-1',
      name: 'Test Card',
      storeName: 'Test Store',
      barcodeData: '123',
      barcodeFormat: 'QR_CODE' as const,
      color: '#FF0000',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    vi.mocked(storage.getAllCards).mockResolvedValue([existingCard])
    vi.mocked(storage.deleteCard).mockResolvedValue()

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cards).toHaveLength(1)

    await act(async () => {
      await result.current.deleteCard('card-1')
    })

    expect(storage.deleteCard).toHaveBeenCalledWith('card-1')

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(0)
    })
  })

  it('locks and unlocks vault', async () => {
    vi.mocked(storage.getSettings).mockResolvedValue({
      useEncryption: true,
      theme: 'auto',
      defaultBarcodeFormat: 'QR_CODE',
    })

    const mockCards = [
      {
        id: '1',
        name: 'Test Card',
        storeName: 'Test Store',
        barcodeData: '123',
        barcodeFormat: 'QR_CODE' as const,
        color: '#FF5733',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    vi.mocked(storage.getAllCards).mockResolvedValue(mockCards)

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.lockVault()
    })

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(0)
      expect(result.current.isLocked).toBe(true)
    })

    await act(async () => {
      await result.current.unlockVault('test-password')
    })

    await waitFor(() => {
      expect(result.current.cards).toHaveLength(1)
      expect(result.current.isLocked).toBe(false)
    })
  })

  it('throws error when updating non-existent card', async () => {
    vi.mocked(storage.getAllCards).mockResolvedValue([])

    const { result } = renderHook(() => useCards())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.updateCard('non-existent', { name: 'New Name' })).rejects.toThrow(
      'Card not found'
    )
  })
})
