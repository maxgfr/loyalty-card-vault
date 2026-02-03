import { useEffect, useState } from 'react'
import type { LoyaltyCard } from '../../types'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { decodeShareURL } from '../../lib/share-url'
import './SharePage.css'

interface SharePageProps {
  encodedData: string
  onBack: () => void
  onImport: (cards: LoyaltyCard[]) => void
}

export function SharePage({ encodedData, onBack, onImport }: SharePageProps) {
  const [password, setPassword] = useState('')
  const [decryptedCards, setDecryptedCards] = useState<LoyaltyCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

  // Reset state when share URL changes
  useEffect(() => {
    setPassword('')
    setDecryptedCards(null)
    setError(null)
    setIsDecrypting(false)
    setSelectedCards(new Set())
  }, [encodedData])

  const handleDecrypt = async () => {
    if (!password) {
      setError('Please enter a password')
      return
    }

    setIsDecrypting(true)
    setError(null)

    try {
      const cards = await decodeShareURL(encodedData, password)
      setDecryptedCards(cards)
      setSelectedCards(new Set(cards.map(c => c.id)))
    } catch {
      setError('Invalid password or corrupted data')
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleToggleCard = (cardId: string) => {
    setSelectedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (decryptedCards) {
      setSelectedCards(new Set(decryptedCards.map(c => c.id)))
    }
  }

  const handleSelectNone = () => {
    setSelectedCards(new Set())
  }

  const handleImport = () => {
    if (!decryptedCards) return

    const cardsToImport = decryptedCards.filter(c => selectedCards.has(c.id))
    onImport(cardsToImport)
  }

  if (!decryptedCards) {
    return (
      <div className="share-page">
        <Header title="Shared Cards" onBack={onBack} />

        <div className="share-page-content">
          <Card>
            <div className="share-page-decrypt">
              <h2 className="share-page-title">🔐 Enter Password</h2>
              <p className="share-page-description">
                Enter the password that was shared with you to decrypt the cards.
              </p>

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
                fullWidth
                autoFocus
                placeholder="Enter 6-character password"
              />

              {error && (
                <div className="share-page-error">
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                fullWidth
                onClick={handleDecrypt}
                disabled={isDecrypting || !password}
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt Cards'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="share-page">
      <Header title="Shared Cards" onBack={onBack} />

      <div className="share-page-content">
        <Card>
          <div className="share-page-header">
            <h2 className="share-page-title">
              📥 {decryptedCards.length} {decryptedCards.length === 1 ? 'Card' : 'Cards'} Shared
            </h2>
            <p className="share-page-description">
              Select the cards you want to import into your vault.
            </p>
          </div>

          <div className="share-page-selection-actions">
            <Button variant="ghost" size="small" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="small" onClick={handleSelectNone}>
              Select None
            </Button>
          </div>

          <div className="share-page-cards">
            {decryptedCards.map(card => (
              <div
                key={card.id}
                className={`share-page-card ${selectedCards.has(card.id) ? 'share-page-card--selected' : ''}`}
                onClick={() => handleToggleCard(card.id)}
              >
                <div className="share-page-card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.id)}
                    onChange={() => handleToggleCard(card.id)}
                  />
                </div>
                <div className="share-page-card-info">
                  <div
                    className="share-page-card-color"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="share-page-card-details">
                    <h3 className="share-page-card-name">{card.name}</h3>
                    {card.storeName && (
                      <p className="share-page-card-store">{card.storeName}</p>
                    )}
                    <p className="share-page-card-barcode">{card.barcodeFormat}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="share-page-actions">
            <Button
              variant="primary"
              fullWidth
              onClick={handleImport}
              disabled={selectedCards.size === 0}
            >
              Import {selectedCards.size} {selectedCards.size === 1 ? 'Card' : 'Cards'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
