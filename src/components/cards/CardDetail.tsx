import { useState } from 'react'
import type { LoyaltyCard } from '../../types'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CardBarcode } from './CardBarcode'
import { exportCardAsImage } from '../../lib/export-image'
import './CardDetail.css'

interface CardDetailProps {
  card: LoyaltyCard
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onShare: () => void
}

export function CardDetail({ card, onBack, onEdit, onDelete, onShare }: CardDetailProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleDelete = () => {
    onDelete()
    setShowDeleteModal(false)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportCardAsImage(card)
    } catch (error) {
      console.error('Failed to export card:', error)
      alert('Failed to export card as image')
    } finally {
      setIsExporting(false)
    }
  }

  const firstLetter = card.name.charAt(0).toUpperCase()

  return (
    <div className="card-detail">
      <Header
        title={card.name}
        onBack={onBack}
        actions={
          <>
            <Button variant="ghost" size="small" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="small" onClick={() => setShowDeleteModal(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="card-detail-content">
        {/* Full-size loyalty card */}
        <div className="card-detail-card-container">
          <div
            className={`card-detail-card-flip ${isFlipped ? 'card-detail-card-flip--flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Front of card */}
            <div
              className="card-detail-card-face card-detail-card-front"
              style={{
                '--card-color': card.color,
                '--card-color-dark': `${card.color}dd`,
              } as React.CSSProperties}
            >
              <div className="card-detail-card-bg-pattern" />
              <div className="card-detail-card-gradient" />
              <div className="card-detail-card-shine" />

              {/* Chip */}
              <div className="card-detail-chip">
                <div className="card-detail-chip-line" />
                <div className="card-detail-chip-line" />
              </div>

              {/* Content */}
              <div className="card-detail-card-content">
                {/* Header */}
                <div className="card-detail-card-header">
                  <div className="card-detail-logo">
                    <span className="card-detail-logo-text">{firstLetter}</span>
                  </div>
                  <div className="card-detail-type">
                    <span className="card-detail-type-text">Loyalty Card</span>
                  </div>
                </div>

                {/* Name */}
                <div className="card-detail-card-main">
                  <h2 className="card-detail-card-name">{card.name}</h2>
                  {card.storeName && card.storeName !== card.name && (
                    <p className="card-detail-card-store">{card.storeName}</p>
                  )}
                </div>

                {/* Card number */}
                <div className="card-detail-card-number">
                  <span className="card-detail-number-dots">••••</span>
                  <span className="card-detail-number-dots">••••</span>
                  <span className="card-detail-number-dots">••••</span>
                  <span className="card-detail-number-last">{card.barcodeData.slice(-4)}</span>
                </div>

                {/* Meta info */}
                <div className="card-detail-card-footer">
                  <div className="card-detail-card-meta">
                    <div className="card-detail-meta-item">
                      <span className="card-detail-meta-label">Format</span>
                      <span className="card-detail-meta-value">{card.barcodeFormat.replace('_', ' ')}</span>
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="card-detail-meta-item">
                        <span className="card-detail-meta-label">Tags</span>
                        <span className="card-detail-meta-value">{card.tags.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-detail-flip-hint">Tap to flip</div>
            </div>

            {/* Back of card */}
            <div
              className="card-detail-card-face card-detail-card-back"
              style={{
                '--card-color': card.color,
                '--card-color-dark': `${card.color}dd`,
              } as React.CSSProperties}
            >
              <div className="card-detail-card-bg-pattern" />
              <div className="card-detail-card-gradient" />

              {/* Magnetic stripe */}
              <div className="card-detail-mag-stripe" />

              {/* Barcode section */}
              <div className="card-detail-barcode-section">
                <div className="card-detail-barcode-container">
                  <CardBarcode data={card.barcodeData} format={card.barcodeFormat} scale={3} />
                </div>
                <p className="card-detail-barcode-data">{card.barcodeData}</p>
              </div>

              {/* Notes */}
              {card.notes && (
                <div className="card-detail-notes-section">
                  <p className="card-detail-notes">{card.notes}</p>
                </div>
              )}

              <div className="card-detail-flip-hint">Tap to flip</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="card-detail-tags-container">
            <h3 className="card-detail-section-title">Tags</h3>
            <div className="card-detail-tags">
              {card.tags.map(tag => (
                <span key={tag} className="card-detail-tag" style={{ borderColor: card.color, color: card.color }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="card-detail-actions">
          <Button variant="primary" fullWidth onClick={onShare}>
            📤 Share Card
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? '⏳ Exporting...' : '💾 Export as Image'}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Card"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete {card.name}? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}
