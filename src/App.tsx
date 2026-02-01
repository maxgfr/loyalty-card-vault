import { useCallback, useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { SetupPage } from './components/setup/SetupPage'
import { CardList } from './components/cards/CardList'
import { CardDetail } from './components/cards/CardDetail'
import { AddCardPage } from './components/cards/AddCardPage'
import { EditCardPage } from './components/cards/EditCardPage'
import { BarcodeScanner } from './components/scanner/BarcodeScanner'
import { SettingsPage } from './components/settings/SettingsPage'
import { HelpPage } from './components/help/HelpPage'
import { ToastContainer } from './components/ui/Toast'
import { useHashRouter } from './hooks/useHashRouter'
import { useCards } from './hooks/useCards'
import { useShare } from './hooks/useShare'
import { getSettings } from './lib/storage'
import type { ScanResult, LoyaltyCard } from './types'
import './App.css'

let toastIdCounter = 0

function App() {
  const { route, navigate, goBack } = useHashRouter()
  const { cards, addCard, updateCard, deleteCard, refreshCards } = useCards()
  const { shareCard } = useShare()
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' }>>([])

  const checkSetup = useCallback(async () => {
    try {
      const settings = await getSettings()
      setEncryptionEnabled(settings.useEncryption)
      setIsSetupComplete(true)
    } catch {
      setIsSetupComplete(false)
    }
  }, [])

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  const handleSetupComplete = useCallback(() => {
    setIsSetupComplete(true)
    navigate({ page: 'home' })
  }, [navigate])

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${toastIdCounter++}`
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleScanResult = useCallback(async (result: ScanResult) => {
    navigate({
      page: 'add',
      barcodeData: result.text,
      barcodeFormat: result.format
    })
  }, [navigate])

  const handleShare = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const result = await shareCard(card)
    if (result.success) {
      addToast(result.fallback === 'clipboard' ? 'Link copied to clipboard' : 'Card shared successfully')
    } else if (!result.cancelled) {
      addToast(result.error || 'Failed to share card', 'error')
    }
  }, [cards, shareCard, addToast])

  const handleUpdateCard = useCallback(async (cardId: string, updates: Partial<Omit<LoyaltyCard, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      await updateCard(cardId, updates)
      addToast('Card updated successfully')
    } catch {
      addToast('Failed to update card', 'error')
    }
  }, [updateCard, addToast])

  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await deleteCard(cardId)
      addToast('Card deleted successfully')
      goBack()
    } catch {
      addToast('Failed to delete card', 'error')
    }
  }, [deleteCard, addToast, goBack])


  if (isSetupComplete === null) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!isSetupComplete) {
    return <SetupPage onComplete={handleSetupComplete} />
  }

  return (
    <>
      <Layout>
        {route.page === 'home' && (
          <CardList cards={cards} onCardClick={(id) => navigate({ page: 'card', cardId: id })} />
        )}

        {route.page === 'card' && (() => {
          const card = cards.find(c => c.id === route.cardId)
          return card ? (
            <CardDetail
              card={card}
              onBack={goBack}
              onEdit={() => navigate({ page: 'edit', cardId: card.id })}
              onDelete={() => handleDeleteCard(card.id)}
              onShare={() => handleShare(card.id)}
            />
          ) : (
            <div className="page-error">
              <p>Card not found</p>
            </div>
          )
        })()}

        {route.page === 'scan' && (
          <BarcodeScanner onScan={handleScanResult} onClose={goBack} />
        )}

        {route.page === 'add' && (
          <AddCardPage
            onBack={goBack}
            onAdd={addCard}
            barcodeData={route.barcodeData}
            barcodeFormat={route.barcodeFormat}
          />
        )}

        {route.page === 'edit' && (() => {
          const card = cards.find(c => c.id === route.cardId)
          return card ? (
            <EditCardPage
              card={card}
              onBack={goBack}
              onUpdate={handleUpdateCard}
            />
          ) : (
            <div className="page-error">
              <p>Card not found</p>
            </div>
          )
        })()}

        {route.page === 'settings' && (
          <SettingsPage onBack={goBack} onRefreshCards={refreshCards} />
        )}

        {route.page === 'help' && (
          <HelpPage onBack={goBack} />
        )}
      </Layout>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default App
