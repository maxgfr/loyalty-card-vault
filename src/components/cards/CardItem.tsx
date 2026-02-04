import type { LoyaltyCard } from '../../types'
import { CardBarcode } from './CardBarcode'
import './CardItem.css'

interface CardItemProps {
  card: LoyaltyCard
  onClick: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
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

        {/* Content */}
        <div className="card-item-content">
          {/* Header with name */}
          <div className="card-item-header">
            <div className="card-item-header-text">
              <h3 className="card-item-name">{card.name}</h3>
              {card.storeName && card.storeName !== card.name && (
                <p className="card-item-store">{card.storeName}</p>
              )}
            </div>
            <span className="card-item-format">{card.barcodeFormat.replace('_', ' ')}</span>
          </div>

          {/* Footer with tags */}
          {card.tags && card.tags.length > 0 && (
            <div className="card-item-footer">
              <div className="card-item-tags">
                {card.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="card-item-tag">{tag}</span>
                ))}
                {card.tags.length > 2 && (
                  <span className="card-item-tag-more">+{card.tags.length - 2}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barcode/QR Code */}
        <div className="card-item-barcode-wrapper">
          <CardBarcode data={card.barcodeData} format={card.barcodeFormat} scale={4} />
        </div>

        {/* Shine effect on hover */}
        <div className="card-item-shine" />
      </div>
    </div>
  )
}
