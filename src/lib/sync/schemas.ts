/**
 * Zod validation schemas for sync messages and data structures
 */

import { z } from 'zod'
import type { BarcodeFormat } from '../../types'

/**
 * Protocol version constant
 */
export const PROTOCOL_VERSION = 1

/**
 * Card summary schema for manifest exchange
 */
export const cardSummarySchema = z.object({
  id: z.string().min(1).max(100),
  updatedAt: z.number().int().positive(),
})

/**
 * Hello message payload schema
 */
export const helloPayloadSchema = z.object({
  deviceId: z.string().min(1).max(100),
  cardCount: z.number().int().min(0),
  encryptionEnabled: z.boolean(),
  protocolVersion: z.number().int().positive(),
})

/**
 * Card list message payload schema
 */
export const cardListPayloadSchema = z.object({
  cards: z.array(cardSummarySchema),
})

/**
 * Request cards message payload schema
 */
export const requestCardsPayloadSchema = z.object({
  ids: z.array(z.string().min(1).max(100)),
})

/**
 * Encrypted payload schema
 */
export const encryptedPayloadSchema = z.object({
  iv: z.string(),
  data: z.string(),
  salt: z.string(),
})

/**
 * Loyalty card schema
 */
export const loyaltyCardSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  storeName: z.string().max(200).optional(),
  barcodeData: z.string().min(1).max(5000),
  barcodeFormat: z.enum([
    'QR_CODE',
    'EAN_13',
    'EAN_8',
    'CODE_128',
    'CODE_39',
    'UPC_A',
    'UPC_E',
    'ITF',
    'CODABAR',
    'DATA_MATRIX',
  ] as const) as z.ZodType<BarcodeFormat>,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

/**
 * Card data message payload schema
 */
export const cardDataPayloadSchema = z.object({
  cards: z.array(z.union([loyaltyCardSchema, encryptedPayloadSchema])),
  isEncrypted: z.boolean(),
})

/**
 * Acknowledgment message payload schema
 */
export const ackPayloadSchema = z.object({
  messageId: z.string().min(1),
})

/**
 * Sync stats schema
 */
export const syncStatsSchema = z.object({
  sent: z.number().int().min(0),
  received: z.number().int().min(0),
  conflicts: z.number().int().min(0),
  errors: z.number().int().min(0),
  duration: z.number().int().min(0),
})

/**
 * Complete message payload schema
 */
export const completePayloadSchema = z.object({
  stats: syncStatsSchema,
})

/**
 * Error message payload schema
 */
export const errorPayloadSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  recoverable: z.boolean(),
})

/**
 * Sync message schema - discriminated union by type
 */
export const syncMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    payload: helloPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('card-list'),
    payload: cardListPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('request-cards'),
    payload: requestCardsPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('card-data'),
    payload: cardDataPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('ack'),
    payload: ackPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('complete'),
    payload: completePayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('error'),
    payload: errorPayloadSchema,
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('ping'),
    payload: z.object({}),
    timestamp: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('pong'),
    payload: z.object({}),
    timestamp: z.number().int().positive(),
  }),
])

/**
 * ICE candidate schema
 */
export const iceCandidateSchema = z.object({
  candidate: z.string().optional(),
  sdpMLineIndex: z.number().int().min(0).nullable().optional(),
  sdpMid: z.string().nullable().optional(),
  usernameFragment: z.string().optional(),
})

/**
 * Signaling data schema - for QR code encoding
 */
export const signalingDataSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string().min(1),
  candidates: z.array(iceCandidateSchema),
  timestamp: z.number().int().positive(),
  version: z.number().int().positive(),
})

/**
 * Helper to validate if a value is a valid loyalty card
 */
export function isLoyaltyCard(value: unknown): boolean {
  return loyaltyCardSchema.safeParse(value).success
}

/**
 * Helper to validate if a value is an encrypted payload
 */
export function isEncryptedPayload(value: unknown): boolean {
  return encryptedPayloadSchema.safeParse(value).success
}
