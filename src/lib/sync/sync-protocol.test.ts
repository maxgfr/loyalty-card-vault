/**
 * Tests for sync protocol state machine
 */

import { describe, it, expect, vi } from 'vitest'
import { SyncProtocol } from './sync-protocol'
import type { LoyaltyCard } from '../../types'
import type {
  SyncMessage,
  HelloPayload,
  CardListPayload,
  CardDataPayload,
  RequestCardsPayload,
  CompletePayload,
} from './types'

describe('sync-protocol', () => {
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

  describe('initialization', () => {
    it('should start in idle state', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      expect(protocol.getState()).toBe('idle')
    })

    it('should store device ID', () => {
      const protocol = new SyncProtocol({
        deviceId: 'test-device',
        cards: [],
        encryptionEnabled: false,
      })

      expect(protocol.getDeviceId()).toBe('test-device')
    })

    it('should store encryption status', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: true,
      })

      expect(protocol.isEncryptionEnabled()).toBe(true)
    })
  })

  describe('state transitions', () => {
    it('should transition to exchanging_hello when started', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      protocol.start()
      expect(protocol.getState()).toBe('exchanging_hello')
    })

    it('should send hello message when started', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [createCard({ id: '1' }), createCard({ id: '2' })],
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.start()

      expect(outgoing).toHaveLength(1)
      expect(outgoing[0].type).toBe('hello')
      const helloPayload = outgoing[0].payload as HelloPayload
      expect(helloPayload.deviceId).toBe('device-1')
      expect(helloPayload.cardCount).toBe(2)
      expect(helloPayload.encryptionEnabled).toBe(false)
    })

    it('should transition to exchanging_manifests on receiving hello', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      protocol.start()

      const helloMsg: SyncMessage = {
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 0,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      }

      protocol.handleMessage(helloMsg)
      expect(protocol.getState()).toBe('exchanging_manifests')
    })

    it('should send card-list after receiving hello', () => {
      const cards = [
        createCard({ id: '1', updatedAt: 1000 }),
        createCard({ id: '2', updatedAt: 2000 }),
      ]

      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards,
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.start()
      outgoing.length = 0 // Clear hello message

      const helloMsg: SyncMessage = {
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 0,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      }

      protocol.handleMessage(helloMsg)

      expect(outgoing).toHaveLength(1)
      expect(outgoing[0].type).toBe('card-list')
      const cardListPayload = outgoing[0].payload as CardListPayload
      expect(cardListPayload.cards).toHaveLength(2)
      expect(cardListPayload.cards[0]).toEqual({ id: '1', updatedAt: 1000 })
      expect(cardListPayload.cards[1]).toEqual({ id: '2', updatedAt: 2000 })
    })
  })

  describe('manifest exchange', () => {
    it('should request missing cards after receiving card-list', () => {
      const localCards = [createCard({ id: '1', updatedAt: 1000 })]

      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: localCards,
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 2,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      outgoing.length = 0 // Clear previous messages

      protocol.handleMessage({
        type: 'card-list',
        payload: {
          cards: [
            { id: '1', updatedAt: 1000 }, // same
            { id: '2', updatedAt: 2000 }, // remote only
          ],
        },
        timestamp: Date.now(),
      })

      expect(protocol.getState()).toBe('requesting_cards')

      const requestMsg = outgoing.find((msg) => msg.type === 'request-cards')
      expect(requestMsg).toBeDefined()
      const requestPayload = requestMsg!.payload as RequestCardsPayload
      expect(requestPayload.ids).toContain('2')
      expect(requestPayload.ids).not.toContain('1')
    })

    it('should send local-only cards after manifest comparison', () => {
      const localCards = [
        createCard({ id: '1', updatedAt: 1000 }),
        createCard({ id: '2', updatedAt: 2000 }),
      ]

      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: localCards,
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 1,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      outgoing.length = 0

      protocol.handleMessage({
        type: 'card-list',
        payload: {
          cards: [{ id: '1', updatedAt: 1000 }], // only has card 1
        },
        timestamp: Date.now(),
      })

      const cardDataMsg = outgoing.find((msg) => msg.type === 'card-data')
      expect(cardDataMsg).toBeDefined()
      const cardDataPayload = cardDataMsg!.payload as CardDataPayload
      expect(cardDataPayload.cards).toHaveLength(1)
      expect((cardDataPayload.cards[0] as LoyaltyCard).id).toBe('2')
    })
  })

  describe('card data exchange', () => {
    it('should apply received cards', async () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const onCardReceived = vi.fn()
      protocol.onCardReceived = onCardReceived

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 1,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-list',
        payload: {
          cards: [{ id: '1', updatedAt: 1000 }],
        },
        timestamp: Date.now(),
      })

      const newCard = createCard({ id: '1', updatedAt: 1000 })
      protocol.handleMessage({
        type: 'card-data',
        payload: {
          cards: [newCard],
          isEncrypted: false,
        },
        timestamp: Date.now(),
      })

      expect(onCardReceived).toHaveBeenCalledWith(newCard)
    })

    it('should track sync progress', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const progressUpdates: number[] = []
      protocol.onProgress = (progress) => progressUpdates.push(progress.received)

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 3,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-list',
        payload: {
          cards: [
            { id: '1', updatedAt: 1000 },
            { id: '2', updatedAt: 2000 },
            { id: '3', updatedAt: 3000 },
          ],
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-data',
        payload: {
          cards: [
            createCard({ id: '1', updatedAt: 1000 }),
            createCard({ id: '2', updatedAt: 2000 }),
          ],
          isEncrypted: false,
        },
        timestamp: Date.now(),
      })

      expect(progressUpdates[progressUpdates.length - 1]).toBe(2)

      protocol.handleMessage({
        type: 'card-data',
        payload: {
          cards: [createCard({ id: '3', updatedAt: 3000 })],
          isEncrypted: false,
        },
        timestamp: Date.now(),
      })

      expect(progressUpdates[progressUpdates.length - 1]).toBe(3)
    })
  })

  describe('sync completion', () => {
    it('should transition to complete when both sides have all cards', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [createCard({ id: '1', updatedAt: 1000 })],
        encryptionEnabled: false,
      })

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 1,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-list',
        payload: {
          cards: [{ id: '1', updatedAt: 1000 }], // same card
        },
        timestamp: Date.now(),
      })

      // No cards to exchange, should complete
      expect(protocol.getState()).toBe('complete')
    })

    it('should send complete message when done', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 0,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-list',
        payload: { cards: [] },
        timestamp: Date.now(),
      })

      const completeMsg = outgoing.find((msg) => msg.type === 'complete')
      expect(completeMsg).toBeDefined()
      const completePayload = completeMsg!.payload as CompletePayload
      expect(completePayload.stats).toBeDefined()
    })

    it('should call onComplete callback', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const onComplete = vi.fn()
      protocol.onComplete = onComplete

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 0,
          encryptionEnabled: false,
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      protocol.handleMessage({
        type: 'card-list',
        payload: { cards: [] },
        timestamp: Date.now(),
      })

      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle encryption mismatch', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: true,
      })

      const errors: string[] = []
      protocol.onError = (error) => errors.push(error.message)

      protocol.start()
      protocol.handleMessage({
        type: 'hello',
        payload: {
          deviceId: 'device-2',
          cardCount: 0,
          encryptionEnabled: false, // Mismatch!
          protocolVersion: 1,
        },
        timestamp: Date.now(),
      })

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].toLowerCase()).toContain('encryption')
    })

    it('should handle invalid message type', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const errors: string[] = []
      protocol.onError = (error) => errors.push(error.message)

      protocol.start()

      // Send card-list before hello (invalid state)
      protocol.handleMessage({
        type: 'card-list',
        payload: { cards: [] },
        timestamp: Date.now(),
      })

      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('ping/pong keep-alive', () => {
    it('should respond to ping with pong', () => {
      const protocol = new SyncProtocol({
        deviceId: 'device-1',
        cards: [],
        encryptionEnabled: false,
      })

      const outgoing: SyncMessage[] = []
      protocol.onOutgoingMessage = (msg) => outgoing.push(msg)

      protocol.handleMessage({
        type: 'ping',
        payload: {},
        timestamp: Date.now(),
      })

      const pongMsg = outgoing.find((msg) => msg.type === 'pong')
      expect(pongMsg).toBeDefined()
    })
  })
})
