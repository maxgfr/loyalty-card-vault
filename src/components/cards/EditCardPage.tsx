import { useState } from 'react'
import { Header } from '../layout/Header'
import { CardForm } from './CardForm'
import type { LoyaltyCard } from '../../types'
import './AddCardPage.css'

interface EditCardPageProps {
  card: LoyaltyCard
  onBack: () => void
  onUpdate: (id: string, updates: Partial<Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
}

export function EditCardPage({ card, onBack, onUpdate }: EditCardPageProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      await onUpdate(card.id, cardData)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card')
    }
  }

  const initialData = {
    name: card.name,
    storeName: card.storeName || '',
    barcodeData: card.barcodeData,
    barcodeFormat: card.barcodeFormat,
    color: card.color,
    notes: card.notes || '',
  }

  return (
    <div className="add-card-page">
      <Header title="Edit Card" onBack={onBack} />

      <div className="add-card-content">
        {error && <div className="add-card-error">{error}</div>}
        <CardForm onSubmit={handleSubmit} onCancel={onBack} initialData={initialData} />
      </div>
    </div>
  )
}
