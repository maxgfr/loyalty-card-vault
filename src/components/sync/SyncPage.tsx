/**
 * Main sync page - choose between Host and Join
 */

import { useState } from 'react'
import { HostSession } from './HostSession'
import { JoinSession } from './JoinSession'
import { useSyncSession } from '../../hooks/useSyncSession'
import { Button } from '../ui/Button'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import './SyncPage.css'
import type { LoyaltyCard } from '../../types'

interface SyncPageProps {
  onBack: () => void
  cards: LoyaltyCard[]
  encryptionEnabled: boolean
  onCardsUpdated: (cards: LoyaltyCard[]) => void
}

type SyncMode = 'idle' | 'host' | 'join'

/**
 * Sync page - P2P device synchronization
 */
export function SyncPage({
  onBack,
  cards,
  encryptionEnabled,
  onCardsUpdated,
}: SyncPageProps) {
  const [mode, setMode] = useState<SyncMode>('idle')
  const [receivedCards, setReceivedCards] = useState<LoyaltyCard[]>([])

  // Setup sync session
  const syncSession = useSyncSession({
    cards,
    encryptionEnabled,
    onCardReceived: (card) => {
      setReceivedCards((prev) => {
        // Update or add card
        const existing = prev.find((c) => c.id === card.id)
        if (existing) {
          return prev.map((c) => (c.id === card.id ? card : c))
        }
        return [...prev, card]
      })
    },
    onSyncComplete: (stats) => {
      console.log('Sync complete:', stats)
      // Merge received cards with existing
      if (receivedCards.length > 0) {
        const cardMap = new Map(cards.map((c) => [c.id, c]))
        receivedCards.forEach((card) => {
          cardMap.set(card.id, card)
        })
        onCardsUpdated(Array.from(cardMap.values()))
      }
    },
    onError: (error) => {
      console.error('Sync error:', error)
    },
  })

  const handleBack = () => {
    if (mode !== 'idle') {
      setMode('idle')
      setReceivedCards([])
    } else {
      onBack()
    }
  }

  // Show host or join session
  if (mode === 'host') {
    return <HostSession syncSession={syncSession} onBack={handleBack} />
  }

  if (mode === 'join') {
    return <JoinSession syncSession={syncSession} onBack={handleBack} />
  }

  // Show mode selection
  return (
    <div className="sync-page">
      <Header title="Sync Devices" onBack={onBack} />

      <div className="sync-page-content">
        <Card>
          <div className="sync-intro">
            <h2>Sync with Another Device</h2>
            <p>
              Synchronize your loyalty cards between devices using peer-to-peer
              connection. No server or internet required - just scan QR codes!
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

          <div className="sync-mode-selection">
            <Button
              onClick={() => setMode('host')}
              variant="primary"
              className="mode-button"
            >
              <div className="mode-icon">📱</div>
              <div className="mode-text">
                <div className="mode-title">Host Session</div>
                <div className="mode-description">
                  Start a sync session and show QR code
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setMode('join')}
              variant="secondary"
              className="mode-button"
            >
              <div className="mode-icon">📷</div>
              <div className="mode-text">
                <div className="mode-title">Join Session</div>
                <div className="mode-description">
                  Scan QR code from another device
                </div>
              </div>
            </Button>
          </div>

          <div className="sync-note">
            <strong>Note:</strong> Both devices must have the same encryption
            settings to sync successfully.
          </div>
        </Card>

        <Card className="sync-help-card">
          <h3>How It Works</h3>
          <ol className="sync-steps-list">
            <li>
              <strong>Host</strong> starts a session and displays a QR code
            </li>
            <li>
              <strong>Guest</strong> scans the host's QR code
            </li>
            <li>
              <strong>Guest</strong> displays their own QR code
            </li>
            <li>
              <strong>Host</strong> scans the guest's QR code
            </li>
            <li>
              <strong>Sync</strong> happens automatically - cards are exchanged
            </li>
          </ol>

          <p className="help-note">
            The connection is direct between devices using WebRTC. Your data
            never passes through any server.
          </p>
        </Card>
      </div>
    </div>
  )
}
