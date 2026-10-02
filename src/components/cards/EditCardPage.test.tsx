import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditCardPage } from './EditCardPage'
import type { LoyaltyCard } from '../../types'

describe('EditCardPage', () => {
  const card: LoyaltyCard = {
    id: 'card-1',
    name: 'Starbucks Rewards',
    storeName: 'Starbucks',
    barcodeData: '123456',
    barcodeFormat: 'QR_CODE',
    color: '#00704A',
    tags: ['coffee', 'food'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('pre-fills the existing tags', () => {
    render(<EditCardPage card={card} onBack={vi.fn()} onUpdate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Remove coffee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove food' })).toBeInTheDocument()
  })

  it('keeps the existing tags when saving without changes', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<EditCardPage card={card} onBack={vi.fn()} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Update Card' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce())
    expect(onUpdate).toHaveBeenCalledWith('card-1', expect.objectContaining({ tags: ['coffee', 'food'] }))
  })
})
