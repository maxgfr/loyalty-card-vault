import type { LoyaltyCard } from '../../types'
import { Card } from '../ui/Card'
import './CardItem.css'

interface CardItemProps {
  card: LoyaltyCard
  onClick: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
  return (
    <Card className="card-item" onClick={onClick} style={{ borderLeft: `4px solid ${card.color}` }}>
      <div className="card-item-content">
        <h3 className="card-item-name">{card.name}</h3>
        <p className="card-item-store">{card.storeName}</p>
        <span className="card-item-format">{card.barcodeFormat.replace('_', ' ')}</span>
        {card.tags && card.tags.length > 0 && (
          <div className="card-item-tags">
            {card.tags.slice(0, 3).map(tag => (
              <span key={tag} className="card-item-tag">{tag}</span>
            ))}
            {card.tags.length > 3 && (
              <span className="card-item-tag-more">+{card.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
