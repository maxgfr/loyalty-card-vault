import { useState, useMemo } from 'react'
import type { LoyaltyCard } from '../../types'
import { CardItem } from './CardItem'
import { Input } from '../ui/Input'
import { Header } from '../layout/Header'
import './CardList.css'

interface CardListProps {
  cards: LoyaltyCard[]
  onCardClick: (cardId: string) => void
}

export function CardList({ cards, onCardClick }: CardListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

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

  const filteredCards = cards.filter(card => {
    // Filter by search query
    const matchesSearch =
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.storeName && card.storeName.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter by selected tag
    const matchesTag = !selectedTag || (card.tags && card.tags.includes(selectedTag))

    return matchesSearch && matchesTag
  })

  return (
    <div className="card-list">
      <Header title="My Cards" />

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
                className={`card-list-tag ${!selectedTag ? 'card-list-tag--active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`card-list-tag ${selectedTag === tag ? 'card-list-tag--active' : ''}`}
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
