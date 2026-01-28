/**
 * Tests for conflict resolution logic
 */

import { describe, it, expect } from 'vitest'
import { resolveCardConflict, computeSyncActions } from './conflict-resolver'
import type { LoyaltyCard } from '../../types'
import type { CardSummary } from './types'

describe('conflict-resolver', () => {
  const createCard = (overrides: Partial<LoyaltyCard>): LoyaltyCard => ({
    id: 'card-1',
    name: 'Test Card',
    storeName: 'Test Store',
    barcodeData: '123456789',
    barcodeFormat: 'QR_CODE',
    color: '#FF0000',
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  })

  const createSummary = (overrides: Partial<CardSummary>): CardSummary => ({
    id: 'card-1',
    updatedAt: 1000,
    ...overrides,
  })

  describe('resolveCardConflict', () => {
    it('should keep newer card based on updatedAt (last-write-wins)', () => {
      const local = createCard({ id: '1', name: 'Local', updatedAt: 1000 })
      const remote = createCard({ id: '1', name: 'Remote', updatedAt: 2000 })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(remote)
    })

    it('should keep local card when remote is older', () => {
      const local = createCard({ id: '1', name: 'Local', updatedAt: 3000 })
      const remote = createCard({ id: '1', name: 'Remote', updatedAt: 2000 })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(local)
    })

    it('should keep local if timestamps are equal', () => {
      const local = createCard({ id: '1', name: 'Local', updatedAt: 2000 })
      const remote = createCard({ id: '1', name: 'Remote', updatedAt: 2000 })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(local)
    })

    it('should handle cards with different content but same timestamp', () => {
      const local = createCard({
        id: '1',
        name: 'Local Name',
        barcodeData: '111111',
        updatedAt: 1000,
      })
      const remote = createCard({
        id: '1',
        name: 'Remote Name',
        barcodeData: '222222',
        updatedAt: 1000,
      })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(local) // Local wins on tie
    })
  })

  describe('computeSyncActions', () => {
    it('should identify cards to send (local only)', () => {
      const local = [
        createSummary({ id: '1', updatedAt: 1000 }),
        createSummary({ id: '2', updatedAt: 2000 }),
      ]
      const remote: CardSummary[] = []

      const actions = computeSyncActions(local, remote)

      expect(actions.toSend).toContain('1')
      expect(actions.toSend).toContain('2')
      expect(actions.toRequest).toHaveLength(0)
      expect(actions.conflicts).toBe(0)
    })

    it('should identify cards to request (remote only)', () => {
      const local: CardSummary[] = []
      const remote = [
        createSummary({ id: '3', updatedAt: 3000 }),
        createSummary({ id: '4', updatedAt: 4000 }),
      ]

      const actions = computeSyncActions(local, remote)

      expect(actions.toRequest).toContain('3')
      expect(actions.toRequest).toContain('4')
      expect(actions.toSend).toHaveLength(0)
      expect(actions.conflicts).toBe(0)
    })

    it('should handle conflicts (both have card, different timestamps)', () => {
      const local = [createSummary({ id: '1', updatedAt: 1000 })]
      const remote = [createSummary({ id: '1', updatedAt: 2000 })]

      const actions = computeSyncActions(local, remote)

      // Remote is newer, so we should request it
      expect(actions.toRequest).toContain('1')
      expect(actions.toSend).not.toContain('1')
      expect(actions.conflicts).toBe(1)
    })

    it('should send newer local card when local is newer', () => {
      const local = [createSummary({ id: '1', updatedAt: 3000 })]
      const remote = [createSummary({ id: '1', updatedAt: 2000 })]

      const actions = computeSyncActions(local, remote)

      // Local is newer, so we should send it
      expect(actions.toSend).toContain('1')
      expect(actions.toRequest).not.toContain('1')
      expect(actions.conflicts).toBe(1)
    })

    it('should handle equal timestamps (no action needed)', () => {
      const local = [createSummary({ id: '1', updatedAt: 2000 })]
      const remote = [createSummary({ id: '1', updatedAt: 2000 })]

      const actions = computeSyncActions(local, remote)

      // Same timestamp, no sync needed
      expect(actions.toSend).not.toContain('1')
      expect(actions.toRequest).not.toContain('1')
      expect(actions.conflicts).toBe(0)
    })

    it('should handle mixed scenario', () => {
      const local = [
        createSummary({ id: '1', updatedAt: 1000 }), // local only
        createSummary({ id: '2', updatedAt: 2000 }), // same timestamp
        createSummary({ id: '3', updatedAt: 5000 }), // local newer
        createSummary({ id: '4', updatedAt: 3000 }), // remote newer
      ]

      const remote = [
        createSummary({ id: '2', updatedAt: 2000 }), // same timestamp
        createSummary({ id: '3', updatedAt: 4000 }), // local newer
        createSummary({ id: '4', updatedAt: 6000 }), // remote newer
        createSummary({ id: '5', updatedAt: 7000 }), // remote only
      ]

      const actions = computeSyncActions(local, remote)

      expect(actions.toSend).toContain('1') // local only
      expect(actions.toSend).toContain('3') // local newer
      expect(actions.toRequest).toContain('4') // remote newer
      expect(actions.toRequest).toContain('5') // remote only
      expect(actions.conflicts).toBe(2) // card 3 and 4
    })

    it('should handle empty local list', () => {
      const local: CardSummary[] = []
      const remote = [createSummary({ id: '1', updatedAt: 1000 })]

      const actions = computeSyncActions(local, remote)

      expect(actions.toRequest).toContain('1')
      expect(actions.toSend).toHaveLength(0)
      expect(actions.conflicts).toBe(0)
    })

    it('should handle empty remote list', () => {
      const local = [createSummary({ id: '1', updatedAt: 1000 })]
      const remote: CardSummary[] = []

      const actions = computeSyncActions(local, remote)

      expect(actions.toSend).toContain('1')
      expect(actions.toRequest).toHaveLength(0)
      expect(actions.conflicts).toBe(0)
    })

    it('should handle both empty lists', () => {
      const actions = computeSyncActions([], [])

      expect(actions.toSend).toHaveLength(0)
      expect(actions.toRequest).toHaveLength(0)
      expect(actions.conflicts).toBe(0)
    })

    it('should handle duplicate IDs in same list (use first occurrence)', () => {
      const local = [
        createSummary({ id: '1', updatedAt: 1000 }),
        createSummary({ id: '1', updatedAt: 2000 }), // duplicate
      ]
      const remote = [createSummary({ id: '1', updatedAt: 1500 })]

      const actions = computeSyncActions(local, remote)

      // First occurrence (updatedAt: 1000) is older than remote
      expect(actions.toRequest).toContain('1')
      expect(actions.conflicts).toBe(1)
    })

    it('should handle large lists efficiently', () => {
      const local = Array.from({ length: 100 }, (_, i) =>
        createSummary({ id: `card-${i}`, updatedAt: i * 1000 })
      )
      const remote = Array.from({ length: 100 }, (_, i) =>
        createSummary({ id: `card-${i + 50}`, updatedAt: (i + 50) * 1000 })
      )

      const actions = computeSyncActions(local, remote)

      // 0-49: local only (send)
      // 50-99: exist in both (same timestamp, no action)
      // 100-149: remote only (request)
      expect(actions.toSend.length).toBe(50)
      expect(actions.toRequest.length).toBe(50)
      expect(actions.conflicts).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very old timestamps', () => {
      const local = createCard({ updatedAt: 1 })
      const remote = createCard({ updatedAt: 2 })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(remote)
    })

    it('should handle very new timestamps', () => {
      const local = createCard({ updatedAt: Date.now() })
      const remote = createCard({ updatedAt: Date.now() + 1000 })

      const result = resolveCardConflict(local, remote)
      expect(result).toEqual(remote)
    })

    it('should handle same ID but all fields different', () => {
      const local = createCard({
        id: '1',
        name: 'Local',
        storeName: 'Local Store',
        barcodeData: '111',
        barcodeFormat: 'EAN_13',
        color: '#FF0000',
        updatedAt: 1000,
      })

      const remote = createCard({
        id: '1',
        name: 'Remote',
        storeName: 'Remote Store',
        barcodeData: '222',
        barcodeFormat: 'QR_CODE',
        color: '#00FF00',
        updatedAt: 2000,
      })

      const result = resolveCardConflict(local, remote)
      expect(result.id).toBe('1')
      expect(result).toEqual(remote)
    })
  })
})
