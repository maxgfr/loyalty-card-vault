import { useState } from 'react'
import type { LoyaltyCard } from '../../types'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CardBarcode } from './CardBarcode'
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

  const handleDelete = () => {
    onDelete()
    setShowDeleteModal(false)
  }

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
        <Card className="card-detail-info" style={{ borderLeft: `4px solid ${card.color}` }}>
          <h2 className="card-detail-store">{card.storeName}</h2>
          <p className="card-detail-format">{card.barcodeFormat.replace('_', ' ')}</p>
          {card.notes && <p className="card-detail-notes">{card.notes}</p>}
        </Card>

        <Card className="card-detail-barcode-card">
          <CardBarcode data={card.barcodeData} format={card.barcodeFormat} />
          <p className="card-detail-barcode-data">{card.barcodeData}</p>
        </Card>

        <div className="card-detail-actions">
          <Button variant="primary" fullWidth onClick={onShare}>
            Share Card
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
