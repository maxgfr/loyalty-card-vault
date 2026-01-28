/**
 * Type definitions for WebRTC P2P sync system
 */

import type { LoyaltyCard, EncryptedPayload } from '../../types'

/**
 * Role of the device in the sync session
 */
export type SyncRole = 'host' | 'guest'

/**
 * Connection state during WebRTC establishment and sync
 */
export type ConnectionState =
  | 'idle'                    // Initial state, no connection
  | 'creating_offer'          // Host: generating SDP offer
  | 'waiting_for_guest'       // Host: displaying QR, waiting for answer
  | 'processing_offer'        // Guest: received offer, creating answer
  | 'waiting_for_host'        // Guest: displaying answer QR
  | 'connecting'              // ICE negotiation in progress
  | 'connected'               // Data channel open
  | 'syncing'                 // Exchanging card data
  | 'sync_complete'           // Sync finished successfully
  | 'disconnected'            // Connection lost
  | 'failed'                  // Unrecoverable error

/**
 * Sync protocol state machine
 */
export type SyncState =
  | 'idle'                    // No sync in progress
  | 'exchanging_hello'        // Initial handshake
  | 'exchanging_manifests'    // Exchanging card lists
  | 'requesting_cards'        // Requesting needed cards
  | 'sending_cards'           // Sending requested cards
  | 'applying_changes'        // Applying received cards
  | 'complete'                // Sync complete

/**
 * Sync session information
 */
export interface SyncSession {
  readonly id: string
  readonly role: SyncRole
  readonly state: ConnectionState
  readonly syncState: SyncState
  readonly peerId: string | null
  readonly error: string | null
  readonly startedAt: number
  readonly completedAt: number | null
}

/**
 * Card summary for manifest exchange
 * Contains only metadata needed for conflict resolution
 */
export interface CardSummary {
  readonly id: string
  readonly updatedAt: number
}

/**
 * Sync message types
 */
export type SyncMessageType =
  | 'hello'           // Initial handshake with device info
  | 'card-list'       // List of card summaries (manifest)
  | 'request-cards'   // Request specific cards by ID
  | 'card-data'       // Send requested cards
  | 'ack'             // Acknowledge receipt
  | 'complete'        // Sync complete
  | 'error'           // Error occurred
  | 'ping'            // Keep-alive ping
  | 'pong'            // Keep-alive response

/**
 * Base sync message structure
 */
export interface SyncMessage<T = unknown> {
  readonly type: SyncMessageType
  readonly payload: T
  readonly timestamp: number
}

/**
 * Hello message payload - initial handshake
 */
export interface HelloPayload {
  readonly deviceId: string
  readonly cardCount: number
  readonly encryptionEnabled: boolean
  readonly protocolVersion: number
}

/**
 * Card list message payload - manifest exchange
 */
export interface CardListPayload {
  readonly cards: readonly CardSummary[]
}

/**
 * Request cards message payload
 */
export interface RequestCardsPayload {
  readonly ids: readonly string[]
}

/**
 * Card data message payload
 */
export interface CardDataPayload {
  readonly cards: readonly (LoyaltyCard | EncryptedPayload)[]
  readonly isEncrypted: boolean
}

/**
 * Acknowledgment message payload
 */
export interface AckPayload {
  readonly messageId: string
}

/**
 * Complete message payload - sync finished
 */
export interface CompletePayload {
  readonly stats: SyncStats
}

/**
 * Error message payload
 */
export interface ErrorPayload {
  readonly code: string
  readonly message: string
  readonly recoverable: boolean
}

/**
 * Sync statistics
 */
export interface SyncStats {
  readonly sent: number
  readonly received: number
  readonly conflicts: number
  readonly errors: number
  readonly duration: number
}

/**
 * Sync action - what needs to be done based on manifest comparison
 */
export interface SyncAction {
  readonly toSend: readonly string[]      // Card IDs to send to peer
  readonly toRequest: readonly string[]   // Card IDs to request from peer
  readonly conflicts: number              // Number of conflicts resolved
}

/**
 * WebRTC signaling data - encoded in QR codes
 */
export interface SignalingData {
  readonly type: 'offer' | 'answer'
  readonly sdp: string
  readonly candidates: readonly RTCIceCandidateInit[]
  readonly timestamp: number
  readonly version: number
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  readonly sent: number
  readonly received: number
  readonly total: number
  readonly percentage: number
}

/**
 * Sync error codes (union type)
 */
export type SyncErrorCode =
  // Connection errors
  | 'WEBRTC_NOT_SUPPORTED'
  | 'ICE_CONNECTION_FAILED'
  | 'DATA_CHANNEL_FAILED'
  | 'CONNECTION_TIMEOUT'
  | 'PEER_DISCONNECTED'
  // Signaling errors
  | 'INVALID_OFFER'
  | 'INVALID_ANSWER'
  | 'QR_TOO_LARGE'
  | 'PROTOCOL_VERSION_MISMATCH'
  // Sync errors
  | 'ENCRYPTION_MISMATCH'
  | 'SYNC_TIMEOUT'
  | 'INVALID_MESSAGE'
  | 'INVALID_CARD_DATA'
  // Storage errors
  | 'STORAGE_ERROR'

/**
 * Sync error code constants
 */
export const SyncErrorCode = {
  // Connection errors
  WEBRTC_NOT_SUPPORTED: 'WEBRTC_NOT_SUPPORTED' as const,
  ICE_CONNECTION_FAILED: 'ICE_CONNECTION_FAILED' as const,
  DATA_CHANNEL_FAILED: 'DATA_CHANNEL_FAILED' as const,
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT' as const,
  PEER_DISCONNECTED: 'PEER_DISCONNECTED' as const,
  // Signaling errors
  INVALID_OFFER: 'INVALID_OFFER' as const,
  INVALID_ANSWER: 'INVALID_ANSWER' as const,
  QR_TOO_LARGE: 'QR_TOO_LARGE' as const,
  PROTOCOL_VERSION_MISMATCH: 'PROTOCOL_VERSION_MISMATCH' as const,
  // Sync errors
  ENCRYPTION_MISMATCH: 'ENCRYPTION_MISMATCH' as const,
  SYNC_TIMEOUT: 'SYNC_TIMEOUT' as const,
  INVALID_MESSAGE: 'INVALID_MESSAGE' as const,
  INVALID_CARD_DATA: 'INVALID_CARD_DATA' as const,
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR' as const,
} as const

/**
 * Sync error class
 */
export class SyncError extends Error {
  public readonly code: SyncErrorCode
  public readonly recoverable: boolean

  constructor(message: string, code: SyncErrorCode, recoverable: boolean = false) {
    super(message)
    this.name = 'SyncError'
    this.code = code
    this.recoverable = recoverable
  }
}
