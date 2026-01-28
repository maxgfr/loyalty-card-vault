/**
 * Tests for sync message creation and serialization
 */

import { describe, it, expect } from 'vitest'
import {
  createHelloMessage,
  createCardListMessage,
  createRequestCardsMessage,
  createCardDataMessage,
  createAckMessage,
  createCompleteMessage,
  createErrorMessage,
  createPingMessage,
  createPongMessage,
  serializeMessage,
  parseMessage,
} from './sync-messages'
import type { LoyaltyCard } from '../../types'

describe('sync-messages', () => {
  const mockCard: LoyaltyCard = {
    id: 'card-1',
    name: 'Test Card',
    storeName: 'Test Store',
    barcodeData: '123456789',
    barcodeFormat: 'QR_CODE',
    color: '#FF0000',
    notes: 'Test notes',
    tags: ['test', 'demo'],
    createdAt: 1000,
    updatedAt: 2000,
  }

  describe('createHelloMessage', () => {
    it('should create valid hello message', () => {
      const msg = createHelloMessage('device-123', 5, true)

      expect(msg.type).toBe('hello')
      expect(msg.payload.deviceId).toBe('device-123')
      expect(msg.payload.cardCount).toBe(5)
      expect(msg.payload.encryptionEnabled).toBe(true)
      expect(msg.payload.protocolVersion).toBe(1)
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should generate different timestamps for sequential calls', () => {
      const msg1 = createHelloMessage('device-1', 0, false)
      const msg2 = createHelloMessage('device-1', 0, false)

      expect(msg2.timestamp).toBeGreaterThanOrEqual(msg1.timestamp)
    })
  })

  describe('createCardListMessage', () => {
    it('should create valid card list message', () => {
      const cards = [
        { id: 'card-1', updatedAt: 1000 },
        { id: 'card-2', updatedAt: 2000 },
      ]

      const msg = createCardListMessage(cards)

      expect(msg.type).toBe('card-list')
      expect(msg.payload.cards).toEqual(cards)
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should handle empty card list', () => {
      const msg = createCardListMessage([])

      expect(msg.type).toBe('card-list')
      expect(msg.payload.cards).toEqual([])
    })
  })

  describe('createRequestCardsMessage', () => {
    it('should create valid request cards message', () => {
      const ids = ['card-1', 'card-2', 'card-3']
      const msg = createRequestCardsMessage(ids)

      expect(msg.type).toBe('request-cards')
      expect(msg.payload.ids).toEqual(ids)
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should handle empty ID list', () => {
      const msg = createRequestCardsMessage([])

      expect(msg.type).toBe('request-cards')
      expect(msg.payload.ids).toEqual([])
    })
  })

  describe('createCardDataMessage', () => {
    it('should create valid card data message (unencrypted)', () => {
      const cards = [mockCard]
      const msg = createCardDataMessage(cards, false)

      expect(msg.type).toBe('card-data')
      expect(msg.payload.cards).toEqual(cards)
      expect(msg.payload.isEncrypted).toBe(false)
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should create valid card data message (encrypted)', () => {
      const encryptedCards = [
        { iv: 'test-iv', data: 'test-data', salt: 'test-salt' },
      ]
      const msg = createCardDataMessage(encryptedCards, true)

      expect(msg.type).toBe('card-data')
      expect(msg.payload.cards).toEqual(encryptedCards)
      expect(msg.payload.isEncrypted).toBe(true)
    })

    it('should handle empty cards array', () => {
      const msg = createCardDataMessage([], false)

      expect(msg.type).toBe('card-data')
      expect(msg.payload.cards).toEqual([])
    })
  })

  describe('createAckMessage', () => {
    it('should create valid ack message', () => {
      const msg = createAckMessage('msg-123')

      expect(msg.type).toBe('ack')
      expect(msg.payload.messageId).toBe('msg-123')
      expect(msg.timestamp).toBeGreaterThan(0)
    })
  })

  describe('createCompleteMessage', () => {
    it('should create valid complete message', () => {
      const stats = {
        sent: 5,
        received: 3,
        conflicts: 2,
        errors: 0,
        duration: 1500,
      }

      const msg = createCompleteMessage(stats)

      expect(msg.type).toBe('complete')
      expect(msg.payload.stats).toEqual(stats)
      expect(msg.timestamp).toBeGreaterThan(0)
    })
  })

  describe('createErrorMessage', () => {
    it('should create valid error message', () => {
      const msg = createErrorMessage('TEST_ERROR', 'Something went wrong', true)

      expect(msg.type).toBe('error')
      expect(msg.payload.code).toBe('TEST_ERROR')
      expect(msg.payload.message).toBe('Something went wrong')
      expect(msg.payload.recoverable).toBe(true)
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should default to non-recoverable', () => {
      const msg = createErrorMessage('TEST_ERROR', 'Fatal error')

      expect(msg.payload.recoverable).toBe(false)
    })
  })

  describe('createPingMessage', () => {
    it('should create valid ping message', () => {
      const msg = createPingMessage()

      expect(msg.type).toBe('ping')
      expect(msg.payload).toEqual({})
      expect(msg.timestamp).toBeGreaterThan(0)
    })
  })

  describe('createPongMessage', () => {
    it('should create valid pong message', () => {
      const msg = createPongMessage()

      expect(msg.type).toBe('pong')
      expect(msg.payload).toEqual({})
      expect(msg.timestamp).toBeGreaterThan(0)
    })
  })

  describe('serializeMessage', () => {
    it('should serialize hello message to JSON string', () => {
      const msg = createHelloMessage('device-1', 0, false)
      const serialized = serializeMessage(msg)

      expect(typeof serialized).toBe('string')
      const parsed = JSON.parse(serialized)
      expect(parsed.type).toBe('hello')
    })

    it('should serialize card-list message to JSON string', () => {
      const msg = createCardListMessage([{ id: '1', updatedAt: 1000 }])
      const serialized = serializeMessage(msg)

      expect(typeof serialized).toBe('string')
      const parsed = JSON.parse(serialized)
      expect(parsed.type).toBe('card-list')
    })

    it('should preserve all message data', () => {
      const msg = createHelloMessage('device-123', 5, true)
      const serialized = serializeMessage(msg)
      const parsed = JSON.parse(serialized)

      expect(parsed).toEqual(msg)
    })
  })

  describe('parseMessage', () => {
    it('should parse valid hello message', () => {
      const original = createHelloMessage('device-1', 3, false)
      const serialized = serializeMessage(original)
      const parsed = parseMessage(serialized)

      expect(parsed).toEqual(original)
    })

    it('should parse valid card-list message', () => {
      const original = createCardListMessage([
        { id: '1', updatedAt: 1000 },
        { id: '2', updatedAt: 2000 },
      ])
      const serialized = serializeMessage(original)
      const parsed = parseMessage(serialized)

      expect(parsed).toEqual(original)
    })

    it('should parse valid complete message', () => {
      const original = createCompleteMessage({
        sent: 1,
        received: 2,
        conflicts: 0,
        errors: 0,
        duration: 1000,
      })
      const serialized = serializeMessage(original)
      const parsed = parseMessage(serialized)

      expect(parsed).toEqual(original)
    })

    it('should throw on invalid JSON', () => {
      expect(() => parseMessage('not json')).toThrow()
    })

    it('should throw on invalid message structure', () => {
      expect(() => parseMessage('{}')).toThrow()
      expect(() => parseMessage('{"type": "invalid"}')).toThrow()
    })

    it('should throw on missing required fields', () => {
      expect(() => parseMessage('{"type": "hello"}')).toThrow()
      expect(() => parseMessage('{"type": "hello", "payload": {}}')).toThrow()
    })

    it('should validate payload structure', () => {
      const invalidHello = {
        type: 'hello',
        payload: { deviceId: 123 }, // deviceId should be string
        timestamp: Date.now(),
      }

      expect(() => parseMessage(JSON.stringify(invalidHello))).toThrow()
    })
  })

  describe('round-trip serialization', () => {
    it('should roundtrip hello message', () => {
      const original = createHelloMessage('device-1', 5, true)
      const roundtrip = parseMessage(serializeMessage(original))
      expect(roundtrip).toEqual(original)
    })

    it('should roundtrip card-list message', () => {
      const original = createCardListMessage([{ id: '1', updatedAt: 1000 }])
      const roundtrip = parseMessage(serializeMessage(original))
      expect(roundtrip).toEqual(original)
    })

    it('should roundtrip request-cards message', () => {
      const original = createRequestCardsMessage(['1', '2', '3'])
      const roundtrip = parseMessage(serializeMessage(original))
      expect(roundtrip).toEqual(original)
    })

    it('should roundtrip card-data message', () => {
      const original = createCardDataMessage([mockCard], false)
      const roundtrip = parseMessage(serializeMessage(original))
      expect(roundtrip).toEqual(original)
    })

    it('should roundtrip error message', () => {
      const original = createErrorMessage('TEST', 'Error message', true)
      const roundtrip = parseMessage(serializeMessage(original))
      expect(roundtrip).toEqual(original)
    })
  })
})
