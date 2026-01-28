import { useState } from 'react'
import type { LoyaltyCard, BarcodeFormat } from '../../types'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { validateCard } from '../../lib/validation'
import './CardForm.css'

interface CardFormProps {
  initialData?: Partial<LoyaltyCard>
  onSubmit: (data: Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

const BARCODE_FORMATS: BarcodeFormat[] = [
  'QR_CODE',
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'UPC_A',
  'UPC_E',
  'ITF',
  'CODABAR',
  'DATA_MATRIX',
]

const DEFAULT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
]

export function CardForm({ initialData, onSubmit, onCancel }: CardFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    storeName: initialData?.storeName || '',
    barcodeData: initialData?.barcodeData || '',
    barcodeFormat: initialData?.barcodeFormat || ('QR_CODE' as BarcodeFormat),
    color: initialData?.color || DEFAULT_COLORS[0],
    notes: initialData?.notes || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      validateCard(formData)
      onSubmit(formData)
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ form: error.message })
      }
    }
  }

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <Input
        label="Card Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        fullWidth
        required
      />

      <Input
        label="Store Name"
        value={formData.storeName}
        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
        error={errors.storeName}
        fullWidth
        required
      />

      <Input
        label="Barcode Data"
        value={formData.barcodeData}
        onChange={(e) => setFormData({ ...formData, barcodeData: e.target.value })}
        error={errors.barcodeData}
        fullWidth
        required
      />

      <div className="form-field">
        <label className="form-label">Barcode Format</label>
        <select
          className="form-select"
          value={formData.barcodeFormat}
          onChange={(e) => setFormData({ ...formData, barcodeFormat: e.target.value as BarcodeFormat })}
        >
          {BARCODE_FORMATS.map(format => (
            <option key={format} value={format}>
              {format.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Color</label>
        <div className="color-picker">
          {DEFAULT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              className={`color-option ${formData.color === color ? 'color-option--active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-textarea"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          maxLength={500}
        />
      </div>

      {errors.form && <p className="form-error">{errors.form}</p>}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update' : 'Add'} Card
        </Button>
      </div>
    </form>
  )
}
