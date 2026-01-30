/**
 * Ultra-simple sync: just share a link!
 */

import { useState, useEffect } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import QRCode from 'qrcode'
import type { LoyaltyCard } from '../../types'
import { generateSyncUrl, decodeCardsFromUrl, isSyncImportUrl } from '../../lib/simple-sync'
import { saveCard } from '../../lib/storage'
import './SimpleSyncPage.css'

interface SimpleSyncPageProps {
  onBack: () => void
  cards: LoyaltyCard[]
  encryptionEnabled: boolean
  onCardsUpdated: (cards: LoyaltyCard[]) => void
}

export function SimpleSyncPage({
  onBack,
  cards,
  encryptionEnabled,
  onCardsUpdated,
}: SimpleSyncPageProps) {
  const [syncUrl, setSyncUrl] = useState<string>('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{
    total: number
    imported: number
    skipped: number
  } | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Check if we're importing on page load
  useEffect(() => {
    const checkImport = async () => {
      const { isSync, encoded } = isSyncImportUrl()

      if (isSync && encoded) {
        setIsImporting(true)
        try {
          const importedCards = await decodeCardsFromUrl(encoded)

          // Merge with existing cards (avoid duplicates)
          const existingIds = new Set(cards.map((c) => c.id))
          let imported = 0
          let skipped = 0

          for (const card of importedCards) {
            if (!existingIds.has(card.id)) {
              // Save new card
              await saveCard(card)
              imported++
            } else {
              skipped++
            }
          }

          setImportStatus({ total: importedCards.length, imported, skipped })
          setShowSuccessModal(true)

          // Refresh cards list
          onCardsUpdated(importedCards)

          // Clear the hash
          window.location.hash = '#sync'
        } catch (error) {
          alert(
            'Failed to import cards: ' +
              (error instanceof Error ? error.message : 'Unknown error')
          )
          window.location.hash = '#sync'
        } finally {
          setIsImporting(false)
        }
      }
    }

    checkImport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generateLink = async () => {
    if (cards.length === 0) {
      alert('You have no cards to share')
      return
    }

    if (encryptionEnabled) {
      const confirm = window.confirm(
        'Warning: Encrypted cards will be shared in plain text via this link. Anyone with the link can see your cards. Continue?'
      )
      if (!confirm) return
    }

    setIsGenerating(true)
    try {
      const url = await generateSyncUrl(cards)
      setSyncUrl(url)

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      setQrCodeDataUrl(qrDataUrl)
    } catch (error) {
      alert(
        'Failed to generate link: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl)
      alert('Link copied to clipboard!')
    } catch {
      alert('Failed to copy link')
    }
  }

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Loyalty Cards',
          text: 'Import my loyalty cards',
          url: syncUrl,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard()
        }
      }
    } else {
      copyToClipboard()
    }
  }

  const reset = () => {
    setSyncUrl('')
    setQrCodeDataUrl('')
  }

  if (isImporting) {
    return (
      <div className="simple-sync-page">
        <Header title="Importing Cards..." onBack={onBack} />
        <div className="simple-sync-content">
          <Card>
            <div className="sync-loading">
              <div className="spinner" />
              <p>Importing your cards...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="simple-sync-page">
      <Header title="Sync Devices" onBack={onBack} />

      <div className="simple-sync-content">
        {!syncUrl ? (
          // Generate link view
          <Card>
            <div className="sync-intro">
              <div className="sync-icon">🔄</div>
              <h2>Share Your Cards</h2>
              <p>Generate a link to share all your cards with another device. It's that simple!</p>
            </div>

            <div className="sync-info">
              <div className="info-item">
                <strong>📱 Cards on this device:</strong> {cards.length}
              </div>
              <div className="info-item">
                <strong>🔐 Encryption:</strong> {encryptionEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            <div className="sync-steps">
              <h3>How it works:</h3>
              <ol>
                <li>Click "Generate Share Link" below</li>
                <li>Share the link or QR code with your other device</li>
                <li>Open the link on the other device</li>
                <li>Cards sync automatically! ✨</li>
              </ol>
            </div>

            {encryptionEnabled && (
              <div className="sync-warning">
                ⚠️ <strong>Note:</strong> Cards will be shared in plain text (not encrypted) via the
                link for compatibility.
              </div>
            )}

            <Button
              onClick={generateLink}
              variant="primary"
              fullWidth
              disabled={isGenerating || cards.length === 0}
            >
              {isGenerating ? '⏳ Generating...' : '🔗 Generate Share Link'}
            </Button>
          </Card>
        ) : (
          // Show link view
          <Card>
            <div className="sync-success">
              <div className="sync-icon success">✅</div>
              <h2>Link Ready!</h2>
              <p>Share this link or QR code with your other device</p>
            </div>

            {qrCodeDataUrl && (
              <div className="sync-qr">
                <img src={qrCodeDataUrl} alt="Sync QR Code" className="sync-qr-image" />
                <p className="sync-qr-hint">Scan with your other device</p>
              </div>
            )}

            <div className="sync-link">
              <input
                type="text"
                value={syncUrl}
                readOnly
                className="sync-link-input"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>

            <div className="sync-actions">
              <Button variant="primary" fullWidth onClick={shareLink}>
                📤 Share Link
              </Button>
              <Button variant="secondary" fullWidth onClick={copyToClipboard}>
                📋 Copy Link
              </Button>
              <Button variant="ghost" fullWidth onClick={reset}>
                🔄 Generate New Link
              </Button>
            </div>

            <div className="sync-note">
              <strong>💡 Tip:</strong> The link contains all your cards and can be opened on any
              device with this app.
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          onBack()
        }}
        title="✅ Import Successful!"
      >
        <div className="import-success">
          {importStatus && (
            <>
              <p>
                <strong>Total cards:</strong> {importStatus.total}
              </p>
              <p>
                <strong>Imported:</strong> {importStatus.imported} new cards
              </p>
              {importStatus.skipped > 0 && (
                <p>
                  <strong>Skipped:</strong> {importStatus.skipped} (already exist)
                </p>
              )}
            </>
          )}
          <Button variant="primary" fullWidth onClick={() => {
            setShowSuccessModal(false)
            onBack()
          }}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
