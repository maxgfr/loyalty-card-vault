/**
 * Simplified sync page with URL-based approach
 */

import { useState, useEffect } from 'react'
import { useSyncSession } from '../../hooks/useSyncSession'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import QRCode from 'qrcode'
import type { LoyaltyCard } from '../../types'
import './SimpleSyncPage.css'

interface SimpleSyncPageProps {
  onBack: () => void
  cards: LoyaltyCard[]
  encryptionEnabled: boolean
  onCardsUpdated: (cards: LoyaltyCard[]) => void
}

type SyncMode = 'idle' | 'host' | 'guest'
type SyncStep = 'generating' | 'showing_qr' | 'waiting_response' | 'syncing' | 'complete'

export function SimpleSyncPage({
  onBack,
  cards,
  encryptionEnabled,
  onCardsUpdated,
}: SimpleSyncPageProps) {
  const [mode, setMode] = useState<SyncMode>('idle')
  const [step, setStep] = useState<SyncStep>('generating')
  const [syncUrl, setSyncUrl] = useState<string>('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [receivedCards, setReceivedCards] = useState<LoyaltyCard[]>([])

  const syncSession = useSyncSession({
    cards,
    encryptionEnabled,
    onCardReceived: (card) => {
      setReceivedCards((prev) => {
        const existing = prev.find((c) => c.id === card.id)
        if (existing) {
          return prev.map((c) => (c.id === card.id ? card : c))
        }
        return [...prev, card]
      })
    },
    onSyncComplete: () => {
      setStep('complete')
      if (receivedCards.length > 0) {
        const cardMap = new Map(cards.map((c) => [c.id, c]))
        receivedCards.forEach((card) => cardMap.set(card.id, card))
        onCardsUpdated(Array.from(cardMap.values()))
      }
    },
    onError: (error) => {
      alert(`Sync error: ${error.message}`)
    },
  })

  // Check URL hash on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#sync/offer/')) {
      const encodedOffer = hash.substring('#sync/offer/'.length)
      if (encodedOffer && mode === 'idle') {
        setMode('guest')
        handleJoinAsGuest(encodedOffer)
      }
    } else if (hash.startsWith('#sync/answer/')) {
      const encodedAnswer = hash.substring('#sync/answer/'.length)
      if (encodedAnswer && mode === 'host' && step === 'waiting_response') {
        handleAcceptAnswer(encodedAnswer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startHosting = async () => {
    setMode('host')
    setStep('generating')

    try {
      const encodedOffer = await syncSession.startHost()

      const baseUrl = window.location.origin + window.location.pathname
      const url = `${baseUrl}#sync/offer/${encodedOffer}`

      setSyncUrl(url)

      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      setQrCodeDataUrl(qrDataUrl)
      setStep('showing_qr')
    } catch (error) {
      alert(`Failed to start hosting: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMode('idle')
    }
  }

  const handleJoinAsGuest = async (encodedOffer: string) => {
    setStep('generating')

    try {
      const encodedAnswer = await syncSession.joinAsGuest(encodedOffer)

      const baseUrl = window.location.origin + window.location.pathname
      const url = `${baseUrl}#sync/answer/${encodedAnswer}`

      setSyncUrl(url)

      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      setQrCodeDataUrl(qrDataUrl)
      setStep('showing_qr')
    } catch (error) {
      alert(`Failed to join: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMode('idle')
    }
  }

  const handleAcceptAnswer = async (encodedAnswer: string) => {
    setStep('syncing')

    try {
      await syncSession.acceptGuestAnswer(encodedAnswer)
    } catch (error) {
      alert(`Failed to accept answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReset = () => {
    syncSession.disconnect()
    setMode('idle')
    setStep('generating')
    setSyncUrl('')
    setQrCodeDataUrl('')
    setReceivedCards([])
    window.location.hash = ''
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(syncUrl)
    alert('URL copied to clipboard!')
  }

  // Idle state - choose mode
  if (mode === 'idle') {
    return (
      <div className="simple-sync-page">
        <Header title="Sync Devices" onBack={onBack} />

        <div className="simple-sync-content">
          <Card>
            <div className="sync-intro">
              <h2>Sync with Another Device</h2>
              <p>
                Share your loyalty cards between devices using QR codes.
                Simple and secure!
              </p>
            </div>

            <div className="sync-info">
              <div className="info-item">
                <strong>Cards on this device:</strong> {cards.length}
              </div>
              <div className="info-item">
                <strong>Encryption:</strong> {encryptionEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div className="sync-buttons">
              <Button onClick={startHosting} variant="primary" fullWidth>
                Start Sync Session
              </Button>
            </div>

            <div className="sync-note">
              <strong>How it works:</strong>
              <ol>
                <li>Device A: Click "Start Sync Session" and show QR code</li>
                <li>Device B: Scan QR code with camera or loyalty card scanner</li>
                <li>Device B: Show response QR code</li>
                <li>Device A: Scan response QR code</li>
                <li>Cards sync automatically!</li>
              </ol>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Host showing QR
  if (mode === 'host' && step === 'showing_qr') {
    return (
      <div className="simple-sync-page">
        <Header title="Hosting Sync" onBack={handleReset} />

        <div className="simple-sync-content">
          <Card>
            <div className="sync-qr-section">
              <h2>Step 1: Share This QR Code</h2>
              <p>Have the other device scan this QR code</p>

              <div className="qr-code-container">
                <img src={qrCodeDataUrl} alt="Sync QR Code" className="qr-code" />
              </div>

              <div className="url-share">
                <input
                  type="text"
                  value={syncUrl}
                  readOnly
                  className="url-input"
                />
                <Button onClick={copyToClipboard} variant="secondary" size="small">
                  Copy
                </Button>
              </div>

              <div className="sync-status">
                <div className="status-indicator pulsing" />
                <span>Waiting for other device to scan...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Guest showing response QR
  if (mode === 'guest' && step === 'showing_qr') {
    return (
      <div className="simple-sync-page">
        <Header title="Joining Sync" onBack={handleReset} />

        <div className="simple-sync-content">
          <Card>
            <div className="sync-qr-section">
              <h2>Step 2: Show This QR Code</h2>
              <p>Have the host device scan this QR code to complete connection</p>

              <div className="qr-code-container">
                <img src={qrCodeDataUrl} alt="Response QR Code" className="qr-code" />
              </div>

              <div className="url-share">
                <input
                  type="text"
                  value={syncUrl}
                  readOnly
                  className="url-input"
                />
                <Button onClick={copyToClipboard} variant="secondary" size="small">
                  Copy
                </Button>
              </div>

              <div className="sync-status">
                <div className="status-indicator pulsing" />
                <span>Waiting for host to scan...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Syncing
  if (step === 'syncing') {
    return (
      <div className="simple-sync-page">
        <Header title="Syncing..." onBack={handleReset} />

        <div className="simple-sync-content">
          <Card>
            <div className="sync-progress-section">
              <div className="progress-spinner" />
              <h2>Syncing cards...</h2>
              <p>
                Sent: {syncSession.progress.sent} | Received: {syncSession.progress.received}
              </p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${syncSession.progress.percentage}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Complete
  if (step === 'complete') {
    return (
      <div className="simple-sync-page">
        <Header title="Sync Complete!" onBack={onBack} />

        <div className="simple-sync-content">
          <Card>
            <div className="sync-complete-section">
              <div className="success-icon">✓</div>
              <h2>Sync Successful!</h2>
              <div className="sync-stats">
                <div className="stat-item">
                  <strong>{syncSession.progress.sent}</strong>
                  <span>Sent</span>
                </div>
                <div className="stat-item">
                  <strong>{syncSession.progress.received}</strong>
                  <span>Received</span>
                </div>
              </div>
              <Button onClick={onBack} variant="primary" fullWidth>
                Done
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
