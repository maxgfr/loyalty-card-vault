import { useState, useRef, type KeyboardEvent } from 'react'
import './TagInput.css'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  label?: string
  placeholder?: string
  maxTags?: number
}

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  label,
  placeholder = 'Add a tag...',
  maxTags = 10
}: TagInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  )

  // Popular suggestions to show when field is empty
  const popularSuggestions = suggestions.filter(s => !value.includes(s)).slice(0, 8)

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return
    if (value.includes(trimmedTag)) return
    if (value.length >= maxTags) return

    onChange([...value, trimmedTag])
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="tag-input">
      {label && <label className="tag-input-label">{label}</label>}

      <div className="tag-input-container">
        <div className="tag-input-tags">
          {value.map(tag => (
            <span key={tag} className="tag">
              {tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}

          {value.length < maxTags && (
            <input
              ref={inputRef}
              type="text"
              className="tag-input-field"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={value.length === 0 ? placeholder : ''}
              maxLength={30}
            />
          )}
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="tag-suggestions">
            {filteredSuggestions.slice(0, 5).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="tag-suggestion-item"
                onClick={() => addTag(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length >= maxTags && (
        <p className="tag-input-limit">Maximum {maxTags} tags reached</p>
      )}

      {!showSuggestions && popularSuggestions.length > 0 && value.length < maxTags && (
        <div className="tag-popular-suggestions">
          <span className="tag-popular-label">Popular:</span>
          <div className="tag-popular-items">
            {popularSuggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="tag-popular-item"
                onClick={() => addTag(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
