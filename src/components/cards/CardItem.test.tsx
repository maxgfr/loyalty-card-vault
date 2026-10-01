import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardItem } from './CardItem'
import type { LoyaltyCard } from '../../types'

vi.mock('./CardItem.css', () => ({}))

describe('CardItem', () => {
  const card: LoyaltyCard = {
    id: 'card-1',
    name: 'Starbucks Rewards',
    storeName: 'Starbucks',
    barcodeData: '123456',
    barcodeFormat: 'QR_CODE',
    color: '#00704A',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('shows the card name as a title', () => {
    render(<CardItem card={card} onClick={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Starbucks Rewards' })).toBeInTheDocument()
  })

  it('does not render a barcode', () => {
    const { container } = render(<CardItem card={card} onClick={vi.fn()} />)

    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByText('123456')).not.toBeInTheDocument()
  })

  it('opens the card on click', () => {
    const onClick = vi.fn()
    render(<CardItem card={card} onClick={onClick} />)

    fireEvent.click(screen.getByText('Starbucks Rewards'))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
