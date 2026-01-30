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

// Group colors by category
const COLOR_GROUPS = [
  { name: 'Vibrant', colors: ['#6366f1', '#ec4899', '#8b5cf6', '#a855f7', '#d946ef'] },
  { name: 'Warm', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308'] },
  { name: 'Cool', colors: ['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'] },
  { name: 'Nature', colors: ['#10b981', '#22c55e', '#84cc16'] },
  { name: 'Neutral', colors: ['#64748b', '#78716c'] },
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

  // Group preset colors if they match default groups
  const useGroupedLayout = presetColors === DEFAULT_PRESET_COLORS

  return (
    <div className="color-picker">
      {label && <label className="color-picker-label">{label}</label>}

      <div className="color-picker-container">
        {useGroupedLayout ? (
          <div className="color-picker-grouped">
            {COLOR_GROUPS.map(group => (
              <div key={group.name} className="color-group">
                <span className="color-group-name">{group.name}</span>
                <div className="color-group-items">
                  {group.colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-preset ${value.toLowerCase() === color.toLowerCase() ? 'color-preset--active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                      title={color}
                    >
                      {value.toLowerCase() === color.toLowerCase() && (
                        <svg className="color-preset-check" width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M16 6L8 14L4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="color-picker-presets">
            {presetColors.map(color => (
              <button
                key={color}
                type="button"
                className={`color-preset ${value.toLowerCase() === color.toLowerCase() ? 'color-preset--active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetClick(color)}
                title={color}
              >
                {value.toLowerCase() === color.toLowerCase() && (
                  <svg className="color-preset-check" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16 6L8 14L4 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className={`color-preset color-preset--custom ${showCustom ? 'color-preset--active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
          title="Custom color"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
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

      <div className="color-picker-preview">
        <div className="color-picker-preview-gradient" style={{ background: `linear-gradient(135deg, ${value} 0%, ${value}dd 100%)` }}>
          <span className="color-picker-preview-text">{value.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
