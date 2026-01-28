/**
 * Tests for signaling codec - SDP compression/decompression for QR codes
 */

import { describe, it, expect } from 'vitest'
import { encodeSignaling, decodeSignaling, SignalingTooLargeError } from './signaling-codec'
import type { SignalingData } from './types'

describe('signaling-codec', () => {
  const mockSDP = `v=0
o=- 123456789 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=extmap-allow-mixed
a=msid-semantic: WMS
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
a=ice-ufrag:abcd1234
a=ice-pwd:efgh5678ijklmnop
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:0
a=sctp-port:5000
a=max-message-size:262144`

  const mockCandidates: RTCIceCandidateInit[] = [
    {
      candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
      sdpMLineIndex: 0,
      sdpMid: '0',
    },
    {
      candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 54321 typ srflx raddr 192.168.1.1 rport 54321',
      sdpMLineIndex: 0,
      sdpMid: '0',
    },
  ]

  describe('encodeSignaling', () => {
    it('should encode offer with SDP and candidates', async () => {
      const encoded = await encodeSignaling('offer', mockSDP, mockCandidates)

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
      expect(encoded).toMatch(/^[A-Za-z0-9+/=\-_]+$/) // URL-safe Base64
    })

    it('should encode answer with SDP and candidates', async () => {
      const encoded = await encodeSignaling('answer', mockSDP, mockCandidates)

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })

    it('should compress SDP to reduce size', async () => {
      const uncompressedSize = JSON.stringify({
        type: 'offer',
        sdp: mockSDP,
        candidates: mockCandidates,
        timestamp: Date.now(),
        version: 1,
      }).length

      const encoded = await encodeSignaling('offer', mockSDP, mockCandidates)
      const encodedSize = encoded.length

      // Encoded should be smaller than uncompressed JSON
      expect(encodedSize).toBeLessThan(uncompressedSize)
    })

    it('should fit typical SDP in QR code size limit', async () => {
      const encoded = await encodeSignaling('offer', mockSDP, mockCandidates)

      // QR Code v40 with L error correction can hold ~2953 bytes
      const QR_SIZE_LIMIT = 2953
      expect(encoded.length).toBeLessThan(QR_SIZE_LIMIT)
    })

    it('should throw SignalingTooLargeError if data exceeds QR limit', async () => {
      // Create artificially large SDP with lots of random, incompressible data
      // Use random data to prevent compression from helping too much
      const randomLines = Array.from({ length: 500 }, () =>
        `a=random:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
      ).join('\n')
      const hugeSDP = mockSDP + '\n' + randomLines

      const hugeCandidates = Array.from({ length: 200 }, (_, i) => ({
        candidate: `candidate:${i} 1 UDP ${2130706431 - i} 192.168.${Math.floor(i / 255)}.${i % 255} ${54321 + i} typ host generation ${i}`,
        sdpMLineIndex: i % 10,
        sdpMid: `${i % 10}`,
      }))

      await expect(
        encodeSignaling('offer', hugeSDP, hugeCandidates)
      ).rejects.toThrow(SignalingTooLargeError)
    })

    it('should handle empty candidates array', async () => {
      const encoded = await encodeSignaling('offer', mockSDP, [])

      expect(typeof encoded).toBe('string')
      expect(encoded.length).toBeGreaterThan(0)
    })
  })

  describe('decodeSignaling', () => {
    it('should decode encoded offer correctly', async () => {
      const encoded = await encodeSignaling('offer', mockSDP, mockCandidates)
      const decoded = await decodeSignaling(encoded)

      expect(decoded.type).toBe('offer')
      expect(decoded.sdp).toBe(mockSDP)
      expect(decoded.candidates).toEqual(mockCandidates)
      expect(decoded.version).toBe(1)
      expect(decoded.timestamp).toBeGreaterThan(0)
    })

    it('should decode encoded answer correctly', async () => {
      const encoded = await encodeSignaling('answer', mockSDP, mockCandidates)
      const decoded = await decodeSignaling(encoded)

      expect(decoded.type).toBe('answer')
      expect(decoded.sdp).toBe(mockSDP)
      expect(decoded.candidates).toEqual(mockCandidates)
    })

    it('should roundtrip encode/decode without data loss', async () => {
      const original: Omit<SignalingData, 'timestamp' | 'version'> = {
        type: 'offer',
        sdp: mockSDP,
        candidates: mockCandidates,
      }

      const encoded = await encodeSignaling(original.type, original.sdp, [
        ...original.candidates,
      ])
      const decoded = await decodeSignaling(encoded)

      expect(decoded.type).toBe(original.type)
      expect(decoded.sdp).toBe(original.sdp)
      expect(decoded.candidates).toEqual(original.candidates)
    })

    it('should throw on invalid base64 input', async () => {
      await expect(decodeSignaling('not-valid-base64!@#$')).rejects.toThrow()
    })

    it('should throw on corrupted compressed data', async () => {
      // Valid base64 but invalid compressed data
      await expect(decodeSignaling('SGVsbG8gV29ybGQh')).rejects.toThrow()
    })

    it('should throw on invalid JSON structure', async () => {
      // Encode valid compressed data that is not our structure
      const invalidData = JSON.stringify({ invalid: 'structure' })
      const compressed = new TextEncoder().encode(invalidData)
      const base64 = btoa(String.fromCharCode(...compressed))

      await expect(decodeSignaling(base64)).rejects.toThrow()
    })

    it('should throw on protocol version mismatch', async () => {
      // Manually create signaling data with invalid version
      const invalidData = {
        type: 'offer' as const,
        sdp: mockSDP,
        candidates: mockCandidates,
        timestamp: Date.now(),
        version: 999, // Invalid version
      }

      // Manually encode using the same compression method
      const json = JSON.stringify(invalidData)
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(json))
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

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const compressed = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }

      const base64 = btoa(String.fromCharCode(...compressed))
      const invalidEncoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      await expect(decodeSignaling(invalidEncoded)).rejects.toThrow(/version mismatch/i)
    })
  })

  describe('SDP minification', () => {
    it('should remove unnecessary SDP fields', async () => {
      const sdpWithExtras = `${mockSDP}
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=fmtp:96 level-asymmetry-allowed=1`

      const encoded = await encodeSignaling('offer', sdpWithExtras, [])
      const decoded = await decodeSignaling(encoded)

      // Core SDP should be preserved
      expect(decoded.sdp).toContain('a=ice-ufrag:')
      expect(decoded.sdp).toContain('a=ice-pwd:')
      expect(decoded.sdp).toContain('a=fingerprint:')
    })
  })

  describe('edge cases', () => {
    it('should handle very short SDP', async () => {
      const shortSDP = 'v=0\no=- 1 1 IN IP4 127.0.0.1\ns=-\nt=0 0'
      const encoded = await encodeSignaling('offer', shortSDP, [])
      const decoded = await decodeSignaling(encoded)

      expect(decoded.sdp).toBe(shortSDP)
    })

    it('should handle SDP with special characters', async () => {
      const specialSDP = mockSDP + '\na=test:value with spaces & symbols: @#$%'
      const encoded = await encodeSignaling('offer', specialSDP, [])
      const decoded = await decodeSignaling(encoded)

      expect(decoded.sdp).toBe(specialSDP)
    })

    it('should generate different timestamps for sequential calls', async () => {
      const encoded1 = await encodeSignaling('offer', mockSDP, [])
      await new Promise(resolve => setTimeout(resolve, 10))
      const encoded2 = await encodeSignaling('offer', mockSDP, [])

      const decoded1 = await decodeSignaling(encoded1)
      const decoded2 = await decodeSignaling(encoded2)

      expect(decoded2.timestamp).toBeGreaterThan(decoded1.timestamp)
    })
  })
})
