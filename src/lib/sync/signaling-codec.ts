/**
 * Signaling codec - Compress and encode WebRTC SDP for QR codes
 */

import type { SignalingData } from './types'
import { signalingDataSchema, PROTOCOL_VERSION } from './schemas'

/**
 * Maximum size for QR Code v40 with L error correction
 */
const MAX_QR_BYTES = 2953

/**
 * Error thrown when signaling data is too large for QR code
 */
export class SignalingTooLargeError extends Error {
  public readonly size: number

  constructor(size: number) {
    super(`Signaling data (${size} bytes) exceeds QR code limit (${MAX_QR_BYTES} bytes)`)
    this.name = 'SignalingTooLargeError'
    this.size = size
  }
}

/**
 * Error thrown when protocol version doesn't match
 */
export class ProtocolVersionMismatchError extends Error {
  public readonly receivedVersion: number
  public readonly expectedVersion: number

  constructor(receivedVersion: number, expectedVersion: number) {
    super(`Protocol version mismatch: received ${receivedVersion}, expected ${expectedVersion}`)
    this.name = 'ProtocolVersionMismatchError'
    this.receivedVersion = receivedVersion
    this.expectedVersion = expectedVersion
  }
}

/**
 * Minify SDP by removing unnecessary fields
 * Preserves original line endings
 */
function minifySDP(sdp: string): string {
  // Detect original line ending
  const hasCarriageReturn = sdp.includes('\r\n')
  const separator = hasCarriageReturn ? '\r\n' : '\n'

  return sdp
    .split(separator)
    .filter(line => {
      // Remove extension maps (not needed for data channels)
      if (line.startsWith('a=extmap:')) return false
      // Remove RTCP feedback (not needed for data channels)
      if (line.startsWith('a=rtcp-fb:')) return false
      // Remove format parameters (not needed for data channels)
      if (line.startsWith('a=fmtp:')) return false
      return true
    })
    .join(separator)
}

/**
 * Compress data using gzip compression
 */
async function compress(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data))
      controller.close()
    },
  })

  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
  const chunks: Uint8Array[] = []

  const reader = compressedStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/**
 * Decompress gzip data
 */
async function decompress(data: Uint8Array): Promise<string> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })

  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
  const chunks: Uint8Array[] = []

  const reader = decompressedStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  // Combine chunks and decode
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  const decoder = new TextDecoder()
  return decoder.decode(result)
}

/**
 * Convert Uint8Array to base64 URL-safe string
 */
function toBase64URL(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convert base64 URL-safe string to Uint8Array
 */
function fromBase64URL(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  const padded = normalized + padding
  const binary = atob(padded)
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)))
}

/**
 * Encode signaling data for QR code transmission
 */
export async function encodeSignaling(
  type: 'offer' | 'answer',
  sdp: string,
  candidates: RTCIceCandidateInit[]
): Promise<string> {
  const signalingData: SignalingData = {
    type,
    sdp: minifySDP(sdp),
    candidates,
    timestamp: Date.now(),
    version: PROTOCOL_VERSION,
  }

  // Convert to JSON
  const json = JSON.stringify(signalingData)

  // Compress
  const compressed = await compress(json)

  // Encode to base64 URL-safe
  const encoded = toBase64URL(compressed)

  // Check size limit
  if (encoded.length > MAX_QR_BYTES) {
    throw new SignalingTooLargeError(encoded.length)
  }

  return encoded
}

/**
 * Decode signaling data from QR code
 */
export async function decodeSignaling(encoded: string): Promise<SignalingData> {
  try {
    // Decode from base64
    const compressed = fromBase64URL(encoded)

    // Decompress
    const json = await decompress(compressed)

    // Parse JSON
    const data = JSON.parse(json)

    // Validate structure
    const validated = signalingDataSchema.parse(data)

    // Check protocol version
    if (validated.version !== PROTOCOL_VERSION) {
      throw new ProtocolVersionMismatchError(validated.version, PROTOCOL_VERSION)
    }

    // Return as-is (minified SDP preserved original line endings)
    return validated
  } catch (error) {
    if (
      error instanceof ProtocolVersionMismatchError ||
      error instanceof SignalingTooLargeError
    ) {
      throw error
    }

    throw new Error(
      `Failed to decode signaling data: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
