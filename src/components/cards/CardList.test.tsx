import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

    expect(screen.getByText('My Cards')).toBeInTheDocument()
    expect(screen.getByText('2 cards')).toBeInTheDocument()
  })
})
