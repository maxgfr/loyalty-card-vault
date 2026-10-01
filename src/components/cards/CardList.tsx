import { useState, useMemo } from 'react'
import type { LoyaltyCard } from '../../types'
import { CardItem } from './CardItem'
import { Input } from '../ui/Input'
import './CardList.css'

const SELECTED_TAG_KEY = 'loyalty-card-vault:selected-tag'

function loadSelectedTag(): string | null {
  try {
    return localStorage.getItem(SELECTED_TAG_KEY)
  } catch {
    return null
  }
}

function saveSelectedTag(tag: string | null) {
  try {
    if (tag) {
      localStorage.setItem(SELECTED_TAG_KEY, tag)
    } else {
      localStorage.removeItem(SELECTED_TAG_KEY)
    }
  } catch {
    // Storage unavailable (private mode): the selection just won't persist
  }
}

interface CardListProps {
  cards: LoyaltyCard[]
  onCardClick: (cardId: string) => void
}

export function CardList({ cards, onCardClick }: CardListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTagState] = useState<string | null>(loadSelectedTag)

  const setSelectedTag = (tag: string | null) => {
    setSelectedTagState(tag)
    saveSelectedTag(tag)
  }

  // Extract all unique tags from cards
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    cards.forEach(card => {
      if (card.tags) {
        card.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [cards])

  // A remembered tag that no card carries anymore falls back to "All"
  const activeTag = selectedTag && allTags.includes(selectedTag) ? selectedTag : null

  const filteredCards = cards.filter(card => {
    // Filter by search query
    const matchesSearch =
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.storeName && card.storeName.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter by selected tag
    const matchesTag = !activeTag || (card.tags && card.tags.includes(activeTag))

    return matchesSearch && matchesTag
  })

  return (
    <div className="card-list">
      <div className="card-list-header">
        <h1 className="card-list-title">Loyalty Vault Card</h1>
        <p className="card-list-subtitle">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
      </div>

      {cards.length > 0 && (
        <>
          <div className="card-list-search">
            <Input
              type="search"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
          </div>

          {allTags.length > 0 && (
            <div className="card-list-tags">
              <button
                type="button"
                className={`card-list-tag ${!activeTag ? 'card-list-tag--active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`card-list-tag ${activeTag === tag ? 'card-list-tag--active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {filteredCards.length === 0 ? (
        <div className="card-list-empty">
          <p>{cards.length === 0 ? 'No cards yet' : 'No cards match your filters'}</p>
          {cards.length === 0 && <p className="card-list-empty-hint">Add your first card to get started</p>}
        </div>
      ) : (
        <div className="card-list-grid">
          {filteredCards.map(card => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
