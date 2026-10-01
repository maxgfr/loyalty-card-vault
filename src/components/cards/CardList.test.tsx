import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardList } from './CardList'
import type { LoyaltyCard } from '../../types'

// Mock CSS imports
vi.mock('./CardList.css', () => ({}))
vi.mock('./CardItem.css', () => ({}))
vi.mock('../layout/Header.css', () => ({}))
vi.mock('../ui/Input.css', () => ({}))

describe('CardList', () => {
  const mockCards: LoyaltyCard[] = [
    {
      id: 'card-1',
      name: 'Starbucks Rewards',
      storeName: 'Starbucks',
      barcodeData: '123456',
      barcodeFormat: 'QR_CODE',
      color: '#00704A',
      tags: ['coffee', 'food'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'card-2',
      name: 'Target Circle',
      storeName: 'Target',
      barcodeData: '789012',
      barcodeFormat: 'EAN_13',
      color: '#CC0000',
      tags: ['retail'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  const mockOnCardClick = vi.fn()

  it('renders empty state when no cards', () => {
    render(<CardList cards={[]} onCardClick={mockOnCardClick} />)

    expect(screen.getByText('No cards yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first card to get started')).toBeInTheDocument()
  })

  it('renders cards with names', () => {
    render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

    expect(screen.getByText('Starbucks Rewards')).toBeInTheDocument()
    expect(screen.getByText('Target Circle')).toBeInTheDocument()
  })

  it('renders header with title and card count', () => {
    render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

    expect(screen.getByText('Loyalty Vault Card')).toBeInTheDocument()
    expect(screen.getByText('2 cards')).toBeInTheDocument()
  })

  describe('selected tag', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('remembers the last selected tag across remounts', () => {
      const { unmount } = render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)
      fireEvent.click(screen.getByRole('button', { name: 'retail' }))
      unmount()

      render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

      expect(screen.getByRole('button', { name: 'retail' })).toHaveClass('card-list-tag--active')
      expect(screen.getByText('Target Circle')).toBeInTheDocument()
      expect(screen.queryByText('Starbucks Rewards')).not.toBeInTheDocument()
    })

    it('forgets the tag when going back to All', () => {
      const { unmount } = render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)
      fireEvent.click(screen.getByRole('button', { name: 'retail' }))
      fireEvent.click(screen.getByRole('button', { name: 'All' }))
      unmount()

      render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

      expect(screen.getByRole('button', { name: 'All' })).toHaveClass('card-list-tag--active')
    })

    it('falls back to All when the remembered tag no longer exists', () => {
      localStorage.setItem('loyalty-card-vault:selected-tag', 'gone')

      render(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

      expect(screen.getByRole('button', { name: 'All' })).toHaveClass('card-list-tag--active')
      expect(screen.getByText('Starbucks Rewards')).toBeInTheDocument()
      expect(screen.getByText('Target Circle')).toBeInTheDocument()
    })

    it('keeps the remembered tag while cards are still loading', () => {
      localStorage.setItem('loyalty-card-vault:selected-tag', 'retail')

      const { rerender } = render(<CardList cards={[]} onCardClick={mockOnCardClick} />)
      rerender(<CardList cards={mockCards} onCardClick={mockOnCardClick} />)

      expect(screen.getByRole('button', { name: 'retail' })).toHaveClass('card-list-tag--active')
    })
  })
})
