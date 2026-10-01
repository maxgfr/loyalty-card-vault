import { describe, it, expect } from 'vitest'
import { sortByRecentUse } from './card-order'
import type { LoyaltyCard } from '../types'

function makeCard(id: string, updatedAt: number, lastUsedAt?: number): LoyaltyCard {
  return {
    id,
    name: id,
    barcodeData: '123',
    barcodeFormat: 'QR_CODE',
    color: '#000000',
    createdAt: updatedAt,
    updatedAt,
    lastUsedAt,
  }
}

describe('sortByRecentUse', () => {
  it('puts the most recently opened card first', () => {
    const cards = [makeCard('a', 300), makeCard('b', 200), makeCard('c', 100, 500)]

    expect(sortByRecentUse(cards).map(c => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('falls back to updatedAt for cards never opened', () => {
    const cards = [makeCard('old', 100), makeCard('new', 200)]

    expect(sortByRecentUse(cards).map(c => c.id)).toEqual(['new', 'old'])
  })

  it('treats an edit after the last opening as recent activity', () => {
    const cards = [makeCard('opened', 100, 300), makeCard('edited', 400, 200)]

    expect(sortByRecentUse(cards).map(c => c.id)).toEqual(['edited', 'opened'])
  })

  it('does not mutate the input', () => {
    const cards = [makeCard('a', 100), makeCard('b', 200)]

    sortByRecentUse(cards)

    expect(cards.map(c => c.id)).toEqual(['a', 'b'])
  })
})
