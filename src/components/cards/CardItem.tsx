import type { LoyaltyCard } from '../../types'
import { Card } from '../ui/Card'
import './CardItem.css'

interface CardItemProps {
  card: LoyaltyCard
  onClick: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
  return (
    <Card className="card-item" onClick={onClick}>
      <div className="card-item-color-accent" style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)` }} />
      <div className="card-item-content">
        <div className="card-item-header">
          <div className="card-item-color-badge" style={{ backgroundColor: card.color }} />
          <div className="card-item-info">
            <h3 className="card-item-name">{card.name}</h3>
            {card.storeName && <p className="card-item-store">{card.storeName}</p>}
          </div>
        </div>
        <div className="card-item-footer">
          <span className="card-item-format">{card.barcodeFormat.replace('_', ' ')}</span>
          {card.tags && card.tags.length > 0 && (
            <div className="card-item-tags">
              {card.tags.slice(0, 2).map(tag => (
                <span key={tag} className="card-item-tag" style={{ backgroundColor: `${card.color}22`, color: card.color }}>{tag}</span>
              ))}
              {card.tags.length > 2 && (
                <span className="card-item-tag-more">+{card.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
