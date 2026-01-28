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
      </div>
    </Card>
  )
}
