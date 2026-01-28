import { useState, useEffect } from 'react'
import type { LoyaltyCard, BarcodeFormat } from '../../types'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { TagInput } from '../ui/TagInput'
import { validateCard, barcodeDataValidators } from '../../lib/validation'
import { detectBarcodeFormat, suggestStoreNames, getStoreColor, generateColorFromString, STORE_COLORS } from '../../lib/smart-detection'
import { getTagSuggestions, suggestTagsForStore } from '../../lib/tag-categories'
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

// Get unique colors from stores
const getPresetColors = (): string[] => {
  const uniqueColors = new Set<string>()

  // Add store brand colors
  Object.values(STORE_COLORS).forEach(color => {
    if (color) uniqueColors.add(color.toUpperCase())
  })

  // Add some default colors if not enough store colors
  const defaultColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
    '#14B8A6', '#F97316', '#84CC16', '#A855F7'
  ]

  defaultColors.forEach(color => uniqueColors.add(color))

  return Array.from(uniqueColors).slice(0, 24) // Limit to 24 colors
}

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
  const [storeSuggestions, setStoreSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>(getTagSuggestions())

  // Auto-detect barcode format
  useEffect(() => {
    if (formData.barcodeData && !initialData) {
      const detectedFormat = detectBarcodeFormat(formData.barcodeData)
      if (detectedFormat && detectedFormat !== formData.barcodeFormat) {
        setFormData(prev => ({ ...prev, barcodeFormat: detectedFormat }))
      }
    }
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

  // Store name suggestions
  useEffect(() => {
    if (formData.storeName) {
      const suggestions = suggestStoreNames(formData.storeName)
      setStoreSuggestions(suggestions)
    } else {
      setStoreSuggestions([])
    }
  }, [formData.storeName])

  // Auto-select color based on store name
  useEffect(() => {
    if (formData.storeName && !initialData) {
      const storeColor = getStoreColor(formData.storeName)
      if (storeColor && storeColor !== formData.color) {
        setFormData(prev => ({ ...prev, color: storeColor }))
      } else if (!storeColor && formData.storeName.length > 2) {
        const generatedColor = generateColorFromString(formData.storeName)
        setFormData(prev => ({ ...prev, color: generatedColor }))
      }
    }
  }, [formData.storeName, initialData])

  // Auto-suggest tags based on store name
  useEffect(() => {
    if (formData.storeName && formData.storeName.length > 2 && !initialData) {
      const autoTags = suggestTagsForStore(formData.storeName)
      if (autoTags.length > 0) {
        // Merge auto-suggested tags with existing tag suggestions
        const allSuggestions = [...new Set([...autoTags, ...getTagSuggestions()])]
        setTagSuggestions(allSuggestions)
      }
    }
  }, [formData.storeName, initialData])

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
      <Input
        label="Card Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        fullWidth
        required
      />

      <div className="form-field-with-suggestions">
        <Input
          label="Store Name (optional)"
          value={formData.storeName}
          onChange={(e) => {
            setFormData({ ...formData, storeName: e.target.value })
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          error={errors.storeName}
          fullWidth
        />
        {showSuggestions && storeSuggestions.length > 0 && (
          <div className="store-suggestions">
            {storeSuggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="store-suggestion-item"
                onClick={() => {
                  setFormData({ ...formData, storeName: suggestion })
                  setShowSuggestions(false)
                }}
              >
                {suggestion}
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

      <ColorPicker
        label="Card Color"
        value={formData.color}
        onChange={(color) => setFormData({ ...formData, color })}
        presetColors={PRESET_COLORS}
      />

      <TagInput
        label="Tags (optional)"
        value={formData.tags}
        onChange={(tags) => setFormData({ ...formData, tags })}
        suggestions={tagSuggestions}
        placeholder="Add a tag..."
        maxTags={10}
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
