/**
 * Sync message creation and serialization
 */

import type {
  SyncMessage,
  HelloPayload,
  CardListPayload,
  RequestCardsPayload,
  CardDataPayload,
  AckPayload,
  CompletePayload,
  ErrorPayload,
  CardSummary,
  SyncStats,
} from './types'
import type { LoyaltyCard, EncryptedPayload } from '../../types'
import { syncMessageSchema, PROTOCOL_VERSION } from './schemas'

/**
 * Create a hello message for initial handshake
 */
export function createHelloMessage(
  deviceId: string,
  cardCount: number,
  encryptionEnabled: boolean
): SyncMessage<HelloPayload> {
  return {
    type: 'hello',
    payload: {
      deviceId,
      cardCount,
      encryptionEnabled,
      protocolVersion: PROTOCOL_VERSION,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create a card list message (manifest exchange)
 */
export function createCardListMessage(
  cards: readonly CardSummary[]
): SyncMessage<CardListPayload> {
  return {
    type: 'card-list',
    payload: {
      cards,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create a request cards message
 */
export function createRequestCardsMessage(
  ids: readonly string[]
): SyncMessage<RequestCardsPayload> {
  return {
    type: 'request-cards',
    payload: {
      ids,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create a card data message
 */
export function createCardDataMessage(
  cards: readonly (LoyaltyCard | EncryptedPayload)[],
  isEncrypted: boolean
): SyncMessage<CardDataPayload> {
  return {
    type: 'card-data',
    payload: {
      cards,
      isEncrypted,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create an acknowledgment message
 */
export function createAckMessage(messageId: string): SyncMessage<AckPayload> {
  return {
    type: 'ack',
    payload: {
      messageId,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create a sync complete message
 */
export function createCompleteMessage(stats: SyncStats): SyncMessage<CompletePayload> {
  return {
    type: 'complete',
    payload: {
      stats,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create an error message
 */
export function createErrorMessage(
  code: string,
  message: string,
  recoverable: boolean = false
): SyncMessage<ErrorPayload> {
  return {
    type: 'error',
    payload: {
      code,
      message,
      recoverable,
    },
    timestamp: Date.now(),
  }
}

/**
 * Create a ping message for keep-alive
 */
export function createPingMessage(): SyncMessage<Record<string, never>> {
  return {
    type: 'ping',
    payload: {},
    timestamp: Date.now(),
  }
}

/**
 * Create a pong message for keep-alive response
 */
export function createPongMessage(): SyncMessage<Record<string, never>> {
  return {
    type: 'pong',
    payload: {},
    timestamp: Date.now(),
  }
}

/**
 * Serialize a sync message to JSON string
 */
export function serializeMessage(message: SyncMessage): string {
  return JSON.stringify(message)
}

/**
 * Parse and validate a sync message from JSON string
 */
export function parseMessage(data: string): SyncMessage {
  try {
    const parsed = JSON.parse(data)
    return syncMessageSchema.parse(parsed)
  } catch (error) {
    throw new Error(
      `Failed to parse sync message: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
