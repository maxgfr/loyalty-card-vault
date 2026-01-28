/**
 * Host sync session flow component
 */

import { useState, useEffect } from 'react'
import { QRDisplay } from './QRDisplay'
import { SyncStatus } from './SyncStatus'
import { SyncProgress } from './SyncProgress'
import { BarcodeScanner } from '../scanner/BarcodeScanner'
import { Button } from '../ui/Button'
import type { UseSyncSessionReturn } from '../../hooks/useSyncSession'

interface HostSessionProps {
  syncSession: UseSyncSessionReturn
  onBack: () => void
}

/**
 * Host side of sync session
 * 1. Display offer QR code
 * 2. Scan guest's answer QR code
 * 3. Show sync progress
 */
export function HostSession({ syncSession, onBack }: HostSessionProps) {
  const { state, progress, error, startHost, acceptGuestAnswer, disconnect } = syncSession

  const [offerQR, setOfferQR] = useState<string | null>(null)
  const [scanningAnswer, setScanningAnswer] = useState(false)

  // Start hosting on mount
  useEffect(() => {
    const initHost = async () => {
      try {
        const encoded = await startHost()
        setOfferQR(encoded)
      } catch (err) {
        console.error('Failed to start host:', err)
      }
    }

    initHost()
  }, [startHost])

  // Handle scanning guest's answer
  const handleAnswerScanned = async (result: { text: string }) => {
    setScanningAnswer(false)
    try {
      await acceptGuestAnswer(result.text)
    } catch (err) {
      console.error('Failed to accept answer:', err)
    }
  }

  // Handle completion or error
  const handleDone = () => {
    disconnect()
    onBack()
  }

  // Show scanner for answer
  if (scanningAnswer) {
    return (
      <div className="sync-session">
        <div className="sync-header">
          <Button onClick={() => setScanningAnswer(false)} variant="secondary">
            Cancel
          </Button>
          <h2>Scan Guest's Answer</h2>
        </div>

        <BarcodeScanner
          onScan={handleAnswerScanned}
          onClose={() => setScanningAnswer(false)}
        />

        <p className="scan-instruction">
          Point your camera at the QR code displayed on the guest device
        </p>
      </div>
    )
  }

  return (
    <div className="sync-session host-session">
      <div className="sync-header">
        <Button onClick={handleDone} variant="secondary">
          {state === 'sync_complete' ? 'Done' : 'Cancel'}
        </Button>
        <h2>Host Sync Session</h2>
      </div>

      <SyncStatus state={state} error={error} />

      {/* Step 1: Show offer QR code */}
      {state === 'waiting_for_guest' && offerQR && (
        <div className="sync-step">
          <QRDisplay data={offerQR} size={300} label="Step 1: Guest Scans This QR Code" />

          <p className="step-instruction">
            Have the guest device scan this QR code to connect
          </p>

          <Button onClick={() => setScanningAnswer(true)} variant="primary">
            Next: Scan Guest's Answer
          </Button>
        </div>
      )}

      {/* Step 2: Waiting to scan answer */}
      {(state === 'connecting' || state === 'connected') && (
        <div className="sync-step">
          <p className="step-instruction">
            {state === 'connecting'
              ? 'Establishing connection...'
              : 'Connection established! Starting sync...'}
          </p>
        </div>
      )}

      {/* Step 3: Syncing */}
      {state === 'syncing' && (
        <div className="sync-step">
          <SyncProgress progress={progress} show={true} />
        </div>
      )}

      {/* Step 4: Complete */}
      {state === 'sync_complete' && (
        <div className="sync-step sync-complete">
          <div className="success-icon">✓</div>
          <h3>Sync Complete!</h3>
          <p>
            Successfully synced {progress.sent + progress.received} cards
          </p>
          <Button onClick={handleDone} variant="primary">
            Done
          </Button>
        </div>
      )}

      {/* Error state */}
      {state === 'failed' && error && (
        <div className="sync-step sync-error">
          <div className="error-icon">✕</div>
          <h3>Sync Failed</h3>
          <p>{error}</p>
          <Button onClick={handleDone} variant="primary">
            Close
          </Button>
        </div>
      )}
    </div>
  )
}
