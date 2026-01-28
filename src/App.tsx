import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { SetupPage } from './components/setup/SetupPage'
import { CardList } from './components/cards/CardList'
import { CardDetail } from './components/cards/CardDetail'
import { AddCardPage } from './components/cards/AddCardPage'
import { BarcodeScanner } from './components/scanner/BarcodeScanner'
import { SettingsPage } from './components/settings/SettingsPage'
import { HelpPage } from './components/help/HelpPage'
import { ToastContainer } from './components/ui/Toast'
import { useHashRouter } from './hooks/useHashRouter'
import { useCards } from './hooks/useCards'
import { useShare } from './hooks/useShare'
import { getSettings } from './lib/storage'
import type { ScanResult } from './types'
import './App.css'

function App() {
  const { route, navigate, goBack } = useHashRouter()
  const { cards, addCard, deleteCard, refreshCards } = useCards()
  const { shareCard } = useShare()
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' }>>([])

  useEffect(() => {
    checkSetup()
  }, [])

  const checkSetup = async () => {
    try {
      await getSettings()
      setIsSetupComplete(true)
    } catch {
      setIsSetupComplete(false)
    }
  }

  const handleSetupComplete = () => {
    setIsSetupComplete(true)
    navigate({ page: 'home' })
  }

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleScanResult = async (_result: ScanResult) => {
    navigate({ page: 'add' })
    // TODO: Pre-fill the form with scan result
  }

  const handleShare = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const result = await shareCard(card)
    if (result.success) {
      addToast(result.fallback === 'clipboard' ? 'Link copied to clipboard' : 'Card shared successfully')
    } else if (!result.cancelled) {
      addToast(result.error || 'Failed to share card', 'error')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCard(cardId)
      addToast('Card deleted successfully')
      goBack()
    } catch (err) {
      addToast('Failed to delete card', 'error')
    }
  }

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
              onEdit={() => addToast('Edit not implemented yet')}
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
          <AddCardPage onBack={goBack} onAdd={addCard} />
        )}

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
