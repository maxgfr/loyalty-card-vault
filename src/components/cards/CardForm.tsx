import { useState, useEffect } from 'react'
import type { LoyaltyCard, BarcodeFormat } from '../../types'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { TagInput } from '../ui/TagInput'
import { CardBarcode } from './CardBarcode'
import { Card } from '../ui/Card'
import { validateCard, barcodeDataValidators } from '../../lib/validation'
import { detectBarcodeFormat, generateColorFromString } from '../../lib/smart-detection'
import { getTagSuggestions, suggestTagsForStore } from '../../lib/tag-categories'
import { suggestStores, findStoreByName, getPresetColors, type StoreConfig } from '../../lib/stores'
import { z } from 'zod'
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

const PRESET_COLORS = getPresetColors()

export function CardForm({ initialData, onSubmit, onCancel }: CardFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    storeName: initialData?.storeName || '',
    barcodeData: initialData?.barcodeData || '',
    barcodeFormat: initialData?.barcodeFormat || ('QR_CODE' as BarcodeFormat),
    color: initialData?.color || PRESET_COLORS[0],
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [storeSuggestions, setStoreSuggestions] = useState<StoreConfig[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>(getTagSuggestions())
  const [hasAutoFilledStore, setHasAutoFilledStore] = useState(false)

  // Auto-detect barcode format
  useEffect(() => {
    if (formData.barcodeData && !initialData) {
      const detectedFormat = detectBarcodeFormat(formData.barcodeData)
      if (detectedFormat && detectedFormat !== formData.barcodeFormat) {
        setFormData(prev => ({ ...prev, barcodeFormat: detectedFormat }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.barcodeData, initialData])

  // Real-time barcode validation
  useEffect(() => {
    if (formData.barcodeData) {
      const validator = barcodeDataValidators[formData.barcodeFormat]
      if (validator) {
        const result = validator.safeParse(formData.barcodeData)
        if (!result.success) {
          setErrors(prev => ({ ...prev, barcodeData: result.error.issues[0].message }))
        } else {
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.barcodeData
            return newErrors
          })
        }
      }
    }
     
  }, [formData.barcodeData, formData.barcodeFormat])

  // Store name suggestions (based on unified name field)
  useEffect(() => {
    if (formData.name && formData.name.length >= 2) {
      const suggestions = suggestStores(formData.name)
      setStoreSuggestions(suggestions)
      setSelectedSuggestionIndex(-1)
    } else {
      setStoreSuggestions([])
      setSelectedSuggestionIndex(-1)
    }
  }, [formData.name])

  // Auto-select color based on card name
  useEffect(() => {
    if (formData.name && !initialData && !hasAutoFilledStore) {
      const store = findStoreByName(formData.name)
      if (store && store.color && store.color !== formData.color) {
        setFormData(prev => ({ ...prev, color: store.color }))
      } else if (!store && formData.name.length > 2) {
        const generatedColor = generateColorFromString(formData.name)
        setFormData(prev => ({ ...prev, color: generatedColor }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name, initialData, hasAutoFilledStore])

  // Auto-suggest tags based on card name
  useEffect(() => {
    if (formData.name && formData.name.length > 2 && !initialData && !hasAutoFilledStore) {
      const autoTags = suggestTagsForStore(formData.name)
      if (autoTags.length > 0) {
        // Merge auto-suggested tags with existing tag suggestions
        const allSuggestions = [...new Set([...autoTags, ...getTagSuggestions()])]
        setTagSuggestions(allSuggestions)
      }
    }
  }, [formData.name, initialData, hasAutoFilledStore])

  // Handle store selection with auto-fill
  const handleStoreSelect = (store: StoreConfig) => {
    setHasAutoFilledStore(true)
    setFormData(prev => ({
      ...prev,
      name: store.name,
      storeName: store.name,
      color: store.color,
      tags: store.defaultTags || prev.tags,
      notes: store.defaultNotes || prev.notes,
    }))
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)

    // Update tag suggestions with store-specific tags
    if (store.defaultTags && store.defaultTags.length > 0) {
      const allSuggestions = [...new Set([...store.defaultTags, ...getTagSuggestions()])]
      setTagSuggestions(allSuggestions)
    }
  }

  // Handle keyboard navigation in suggestions
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || storeSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < storeSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleStoreSelect(storeSuggestions[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const validatedData = validateCard(formData)
      onSubmit(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach(issue => {
          const field = issue.path[0] as string
          fieldErrors[field] = issue.message
        })
        setErrors(fieldErrors)
      } else if (error instanceof Error) {
        setErrors({ form: error.message })
      }
    }
  }

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <div className="form-field-with-suggestions">
        <Input
          label="Card Name"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value, storeName: e.target.value })
            setShowSuggestions(true)
            setHasAutoFilledStore(false)
          }}
          onKeyDown={handleNameKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          error={errors.name}
          placeholder="e.g., Starbucks, Carrefour..."
          fullWidth
          required
        />
        {showSuggestions && storeSuggestions.length > 0 && (
          <div className="store-suggestions">
            {storeSuggestions.map((store, index) => (
              <button
                key={store.name}
                type="button"
                className={`store-suggestion-item ${
                  index === selectedSuggestionIndex ? 'store-suggestion-item--selected' : ''
                }`}
                onClick={() => handleStoreSelect(store)}
              >
                <span className="store-suggestion-name">{store.name}</span>
                {store.defaultTags && store.defaultTags.length > 0 && (
                  <span className="store-suggestion-tags">
                    {store.defaultTags.slice(0, 2).join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

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

      <TagInput
        label="Tags (optional)"
        value={formData.tags}
        onChange={(tags) => setFormData({ ...formData, tags })}
        suggestions={tagSuggestions}
        placeholder="Add a tag..."
        maxTags={10}
      />

      <ColorPicker
        label="Card Color"
        value={formData.color}
        onChange={(color) => setFormData({ ...formData, color })}
        presetColors={PRESET_COLORS}
        compact
      />

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

      {formData.barcodeData && !errors.barcodeData && (
        <div className="barcode-preview-section">
          <label className="form-label">Barcode Preview</label>
          <Card className="barcode-preview-card">
            <CardBarcode
              data={formData.barcodeData}
              format={formData.barcodeFormat}
              scale={2}
            />
            <p className="barcode-preview-hint">Preview of how your barcode will look</p>
          </Card>
        </div>
      )}

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
