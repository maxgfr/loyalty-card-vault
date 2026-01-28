import { useState } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  presetColors?: string[]
  label?: string
}

const DEFAULT_PRESET_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#a855f7', // Violet
  '#0ea5e9', // Sky
  '#22c55e', // Green
  '#eab308', // Yellow
  '#d946ef', // Fuchsia
  '#64748b', // Slate
  '#78716c', // Stone
]

export function ColorPicker({ value, onChange, presetColors = DEFAULT_PRESET_COLORS, label }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const handlePresetClick = (color: string) => {
    onChange(color)
    setShowCustom(false)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="color-picker">
      {label && <label className="color-picker-label">{label}</label>}

      <div className="color-picker-presets">
        {presetColors.map(color => (
          <button
            key={color}
            type="button"
            className={`color-preset ${value.toLowerCase() === color.toLowerCase() ? 'color-preset--active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handlePresetClick(color)}
            title={color}
          />
        ))}

        <button
          type="button"
          className={`color-preset color-preset--custom ${showCustom ? 'color-preset--active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
          title="Custom color"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {showCustom && (
        <div className="color-picker-custom">
          <input
            type="color"
            value={value}
            onChange={handleCustomChange}
            className="color-picker-input"
          />
          <input
            type="text"
            value={value}
            onChange={handleCustomChange}
            placeholder="#000000"
            maxLength={7}
            className="color-picker-text"
          />
        </div>
      )}

      <div className="color-picker-preview" style={{ backgroundColor: value }}>
        <span className="color-picker-preview-text">{value}</span>
      </div>
    </div>
  )
}
