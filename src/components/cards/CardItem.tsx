import type { LoyaltyCard } from '../../types'
import './CardItem.css'

interface CardItemProps {
  card: LoyaltyCard
  onClick: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
  // Get first letter for fallback icon
  const firstLetter = card.name.charAt(0).toUpperCase()

  return (
    <div className="card-item-wrapper" onClick={onClick}>
      <div
        className="card-item-card"
        style={{
          '--card-color': card.color,
          '--card-color-light': `${card.color}33`,
          '--card-color-dark': `${card.color}dd`,
        } as React.CSSProperties}
      >
        {/* Background patterns */}
        <div className="card-item-bg-pattern" />
        <div className="card-item-gradient" />

        {/* Card chip (decorative) */}
        <div className="card-item-chip">
          <div className="card-item-chip-line" />
          <div className="card-item-chip-line" />
        </div>

        {/* Content */}
        <div className="card-item-content">
          {/* Header with logo */}
          <div className="card-item-header">
            <div className="card-item-logo" style={{ backgroundColor: card.color }}>
              <span className="card-item-logo-text">{firstLetter}</span>
            </div>
            <div className="card-item-type">
              <span className="card-item-type-text">Loyalty Card</span>
            </div>
          </div>

          {/* Main info */}
          <div className="card-item-main">
            <h3 className="card-item-name">{card.name}</h3>
            {card.storeName && card.storeName !== card.name && (
              <p className="card-item-store">{card.storeName}</p>
            )}
          </div>

          {/* Footer */}
          <div className="card-item-footer">
            <div className="card-item-meta">
              <span className="card-item-format">{card.barcodeFormat.replace('_', ' ')}</span>
              {card.tags && card.tags.length > 0 && (
                <div className="card-item-tags">
                  {card.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="card-item-tag">{tag}</span>
                  ))}
                  {card.tags.length > 2 && (
                    <span className="card-item-tag-more">+{card.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>

            {/* Card number placeholder (decorative) */}
            <div className="card-item-number">
              <span className="card-item-number-dots">••••</span>
              <span className="card-item-number-dots">••••</span>
              <span className="card-item-number-last">{card.barcodeData.slice(-4)}</span>
            </div>
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="card-item-shine" />
      </div>
    </div>
  )
}
