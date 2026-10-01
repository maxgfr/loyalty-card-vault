import type { LoyaltyCard } from '../../types'
import { getReadableTextColor } from '../../lib/color'
import './CardItem.css'

interface CardItemProps {
  card: LoyaltyCard
  onClick: () => void
}

// Compact tile: only the name, so many cards fit on screen and no barcode
// in the list can confuse a checkout scanner
export function CardItem({ card, onClick }: CardItemProps) {
  return (
    <div className="card-item-wrapper" onClick={onClick}>
      <div
        className="card-item-card"
        style={{
          '--card-color': card.color,
          '--card-text-color': getReadableTextColor(card.color),
        } as React.CSSProperties}
      >
        <h3 className="card-item-name">{card.name}</h3>
      </div>
    </div>
  )
}
