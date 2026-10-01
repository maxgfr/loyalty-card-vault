import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { CardDetail } from './CardDetail'
import type { LoyaltyCard } from '../../types'

vi.mock('./CardBarcode', () => ({ CardBarcode: () => null }))

describe('CardDetail', () => {
  const card: LoyaltyCard = {
    id: 'card-1',
    name: 'Starbucks Rewards',
    barcodeData: '123456',
    barcodeFormat: 'QR_CODE',
    color: '#00704A',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  const renderDetail = () =>
    render(<CardDetail card={card} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)

  it('shows the barcode side by default', () => {
    const { container } = renderDetail()

    expect(container.querySelector('.card-detail-card-flip')).toHaveClass('card-detail-card-flip--flipped')
  })

  it('scrolls to the top so the barcode is in view', () => {
    renderDetail()

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('flips to the front side when tapped', () => {
    const { container } = renderDetail()
    const flip = container.querySelector('.card-detail-card-flip')!

    fireEvent.click(flip)

    expect(flip).not.toHaveClass('card-detail-card-flip--flipped')
  })
})
