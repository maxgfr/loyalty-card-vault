import { useState } from 'react'
import { Header } from '../layout/Header'
import { CardForm } from './CardForm'
import type { LoyaltyCard, BarcodeFormat } from '../../types'
import './AddCardPage.css'

interface AddCardPageProps {
  onBack: () => void
  onAdd: (card: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  barcodeData?: string
  barcodeFormat?: BarcodeFormat
}

export function AddCardPage({ onBack, onAdd, barcodeData, barcodeFormat }: AddCardPageProps) {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (cardData: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      await onAdd(cardData)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card')
    }
  }

  // Prepare initial data from scan results
  const initialData = (barcodeData && barcodeFormat) ? {
    name: '',
    storeName: '',
    barcodeData,
    barcodeFormat,
    color: '#6366f1',
    notes: '',
  } : undefined

  return (
    <div className="add-card-page">
      <Header title="Add Card" onBack={onBack} />

      <div className="add-card-content">
        {error && <div className="add-card-error">{error}</div>}
        <CardForm onSubmit={handleSubmit} onCancel={onBack} initialData={initialData} />
      </div>
    </div>
  )
}
