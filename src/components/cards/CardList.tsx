import { useState } from 'react'
import type { LoyaltyCard } from '../../types'
import { CardItem } from './CardItem'
import { Input } from '../ui/Input'
import './CardList.css'

interface CardListProps {
  cards: LoyaltyCard[]
  onCardClick: (cardId: string) => void
}

export function CardList({ cards, onCardClick }: CardListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.storeName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="card-list">
      {cards.length > 0 && (
        <div className="card-list-search">
          <Input
            type="search"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div className="card-list-empty">
          <p>{cards.length === 0 ? 'No cards yet' : 'No cards match your search'}</p>
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
