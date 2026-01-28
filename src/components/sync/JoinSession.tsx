/**
 * Join sync session flow component (guest side)
 */

import { useState } from 'react'
import { QRDisplay } from './QRDisplay'
import { SyncStatus } from './SyncStatus'
import { SyncProgress } from './SyncProgress'
import { BarcodeScanner } from '../scanner/BarcodeScanner'
import { Button } from '../ui/Button'
import type { UseSyncSessionReturn } from '../../hooks/useSyncSession'

interface JoinSessionProps {
  syncSession: UseSyncSessionReturn
  onBack: () => void
}

/**
 * Guest side of sync session
 * 1. Scan host's offer QR code
 * 2. Display answer QR code
 * 3. Show sync progress
 */
export function JoinSession({ syncSession, onBack }: JoinSessionProps) {
  const { state, progress, error, joinAsGuest, disconnect } = syncSession

  const [answerQR, setAnswerQR] = useState<string | null>(null)
  const [scanningOffer, setScanningOffer] = useState(true)

  // Handle scanning host's offer
  const handleOfferScanned = async (result: { text: string }) => {
    setScanningOffer(false)
    try {
      const encoded = await joinAsGuest(result.text)
      setAnswerQR(encoded)
    } catch (err) {
      console.error('Failed to join session:', err)
      setScanningOffer(true)
    }
  }

  // Handle completion or error
  const handleDone = () => {
    disconnect()
    onBack()
  }

  // Show scanner for offer
  if (scanningOffer && !answerQR) {
    return (
      <div className="sync-session">
        <div className="sync-header">
          <Button onClick={handleDone} variant="secondary">
            Cancel
          </Button>
          <h2>Scan Host's QR Code</h2>
        </div>

        <BarcodeScanner
          onScan={handleOfferScanned}
          onClose={() => setScanningOffer(false)}
        />

        <p className="scan-instruction">
          Point your camera at the QR code displayed on the host device
        </p>
      </div>
    )
  }

  return (
    <div className="sync-session join-session">
      <div className="sync-header">
        <Button onClick={handleDone} variant="secondary">
          {state === 'sync_complete' ? 'Done' : 'Cancel'}
        </Button>
        <h2>Join Sync Session</h2>
      </div>

      <SyncStatus state={state} error={error} />

      {/* Step 1: Show answer QR code */}
      {state === 'waiting_for_host' && answerQR && (
        <div className="sync-step">
          <QRDisplay data={answerQR} size={300} label="Step 2: Host Scans This QR Code" />

          <p className="step-instruction">
            Have the host device scan this QR code to complete connection
          </p>
        </div>
      )}

      {/* Step 2: Connecting */}
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
