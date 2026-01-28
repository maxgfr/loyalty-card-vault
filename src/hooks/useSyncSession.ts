/**
 * React hook for managing WebRTC P2P sync sessions
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { WebRTCManager } from '../lib/sync/webrtc-manager'
import { SyncProtocol } from '../lib/sync/sync-protocol'
import { encodeSignaling, decodeSignaling } from '../lib/sync/signaling-codec'
import { serializeMessage, parseMessage } from '../lib/sync/sync-messages'
import { generateId } from '../lib/crypto'
import type { LoyaltyCard } from '../types'
import type { ConnectionState, SyncProgress, SyncStats } from '../lib/sync/types'

interface UseSyncSessionOptions {
  cards: LoyaltyCard[]
  encryptionEnabled: boolean
  onCardReceived?: (card: LoyaltyCard) => void
  onSyncComplete?: (stats: SyncStats) => void
  onError?: (error: Error) => void
}

export interface UseSyncSessionReturn {
  // State
  state: ConnectionState
  progress: SyncProgress
  error: string | null

  // Host actions
  startHost: () => Promise<string>
  acceptGuestAnswer: (encodedAnswer: string) => Promise<void>

  // Guest actions
  joinAsGuest: (encodedOffer: string) => Promise<string>

  // Common
  disconnect: () => void
  isConnected: boolean
}

/**
 * Hook for managing P2P sync sessions
 */
export function useSyncSession(options: UseSyncSessionOptions): UseSyncSessionReturn {
  const { cards, encryptionEnabled, onCardReceived, onSyncComplete, onError } = options

  // State
  const [state, setState] = useState<ConnectionState>('idle')
  const [progress, setProgress] = useState<SyncProgress>({
    sent: 0,
    received: 0,
    total: 0,
    percentage: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Refs for managers (don't trigger re-renders)
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)
  const syncProtocolRef = useRef<SyncProtocol | null>(null)
  const deviceIdRef = useRef<string>(generateId())

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close()
      webrtcManagerRef.current = null
    }
    syncProtocolRef.current = null
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return cleanup
  }, [cleanup])

  /**
   * Handle error
   */
  const handleError = useCallback(
    (err: Error) => {
      setError(err.message)
      setState('failed')
      if (onError) {
        onError(err)
      }
    },
    [onError]
  )

  /**
   * Setup sync protocol
   */
  const setupSyncProtocol = useCallback(() => {
    const protocol = new SyncProtocol({
      deviceId: deviceIdRef.current,
      cards,
      encryptionEnabled,
    })

    // Setup callbacks
    protocol.onOutgoingMessage = (message) => {
      const serialized = serializeMessage(message)
      webrtcManagerRef.current?.send(serialized)
    }

    protocol.onCardReceived = (card) => {
      if (onCardReceived) {
        onCardReceived(card)
      }
    }

    protocol.onProgress = (progressUpdate) => {
      setProgress(progressUpdate)
    }

    protocol.onComplete = () => {
      setState('sync_complete')
      if (onSyncComplete) {
        // Get final stats from protocol would be ideal, but we'll estimate
        const stats: SyncStats = {
          sent: progress.sent,
          received: progress.received,
          conflicts: 0,
          errors: 0,
          duration: 0,
        }
        onSyncComplete(stats)
      }
    }

    protocol.onError = handleError

    syncProtocolRef.current = protocol
    return protocol
  }, [cards, encryptionEnabled, onCardReceived, onSyncComplete, handleError, progress])

  /**
   * Start hosting a sync session
   * Returns encoded offer as string for QR code
   */
  const startHost = useCallback(async (): Promise<string> => {
    try {
      setError(null)
      setState('creating_offer')

      // Create WebRTC manager
      const manager = new WebRTCManager()
      webrtcManagerRef.current = manager

      // Setup state change handler
      manager.onStateChange((rtcState) => {
        if (rtcState === 'connected') {
          setState('connected')
          // Start sync protocol
          const protocol = setupSyncProtocol()
          protocol.start()
          setState('syncing')
        } else if (rtcState === 'failed' || rtcState === 'disconnected') {
          setState('failed')
          setError('Connection failed')
        }
      })

      // Setup message handler
      manager.onMessage((data) => {
        if (syncProtocolRef.current) {
          try {
            const message = parseMessage(data)
            syncProtocolRef.current.handleMessage(message)
          } catch (err) {
            handleError(err instanceof Error ? err : new Error('Failed to parse message'))
          }
        }
      })

      // Create offer
      const { sdp, candidates } = await manager.createOffer()

      // Encode for QR code
      const encoded = await encodeSignaling('offer', sdp, candidates)

      setState('waiting_for_guest')
      return encoded
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to create offer'))
      throw err
    }
  }, [setupSyncProtocol, handleError])

  /**
   * Accept guest's answer (host side)
   */
  const acceptGuestAnswer = useCallback(
    async (encodedAnswer: string): Promise<void> => {
      try {
        if (!webrtcManagerRef.current) {
          throw new Error('No active WebRTC connection')
        }

        setState('connecting')

        // Decode answer
        const { sdp, candidates } = await decodeSignaling(encodedAnswer)

        // Accept answer
        await webrtcManagerRef.current.acceptAnswer(sdp, [...candidates])
      } catch (err) {
        handleError(err instanceof Error ? err : new Error('Failed to accept answer'))
        throw err
      }
    },
    [handleError]
  )

  /**
   * Join as guest
   * Returns encoded answer as string for QR code
   */
  const joinAsGuest = useCallback(
    async (encodedOffer: string): Promise<string> => {
      try {
        setError(null)
        setState('processing_offer')

        // Decode offer
        const { sdp, candidates } = await decodeSignaling(encodedOffer)

        // Create WebRTC manager
        const manager = new WebRTCManager()
        webrtcManagerRef.current = manager

        // Setup state change handler
        manager.onStateChange((rtcState) => {
          if (rtcState === 'connected') {
            setState('connected')
            // Start sync protocol
            const protocol = setupSyncProtocol()
            protocol.start()
            setState('syncing')
          } else if (rtcState === 'failed' || rtcState === 'disconnected') {
            setState('failed')
            setError('Connection failed')
          }
        })

        // Setup message handler
        manager.onMessage((data) => {
          if (syncProtocolRef.current) {
            try {
              const message = parseMessage(data)
              syncProtocolRef.current.handleMessage(message)
            } catch (err) {
              handleError(err instanceof Error ? err : new Error('Failed to parse message'))
            }
          }
        })

        // Create answer
        const answer = await manager.createAnswer(sdp, [...candidates])

        // Encode for QR code
        const encoded = await encodeSignaling('answer', answer.sdp, answer.candidates)

        setState('waiting_for_host')
        return encoded
      } catch (err) {
        handleError(err instanceof Error ? err : new Error('Failed to join session'))
        throw err
      }
    },
    [setupSyncProtocol, handleError]
  )

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    cleanup()
    setState('idle')
    setProgress({
      sent: 0,
      received: 0,
      total: 0,
      percentage: 0,
    })
    setError(null)
  }, [cleanup])

  return {
    state,
    progress,
    error,
    startHost,
    acceptGuestAnswer,
    joinAsGuest,
    disconnect,
    isConnected: state === 'connected' || state === 'syncing',
  }
}
