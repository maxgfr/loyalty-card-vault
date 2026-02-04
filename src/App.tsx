import { useCallback, useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { CardList } from './components/cards/CardList'
import { CardDetail } from './components/cards/CardDetail'
import { AddCardPage } from './components/cards/AddCardPage'
import { EditCardPage } from './components/cards/EditCardPage'
import { BarcodeScanner } from './components/scanner/BarcodeScanner'
import { SettingsPage } from './components/settings/SettingsPage'
import { ToastContainer } from './components/ui/Toast'
import { useHashRouter } from './hooks/useHashRouter'
import { useCards } from './hooks/useCards'
import { SharePage } from './components/share/SharePage'
import { getSettings, saveSettings } from './lib/storage'
import type { ScanResult, LoyaltyCard } from './types'
import './App.css'
import './index.css'

let toastIdCounter = 0

// Apply theme to document
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')

  if (theme !== 'auto') {
    root.classList.add(`theme-${theme}`)
  }
  // For 'auto', let CSS media query handle it
}

function App() {
  const { route, navigate, goBack } = useHashRouter()
  const { cards, addCard, updateCard, deleteCard, refreshCards } = useCards()
  const [isReady, setIsReady] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' }>>([])

  const initializeApp = useCallback(async () => {
    try {
      const settings = await getSettings()
      applyTheme(settings.theme)
    } catch {
      // No settings found, create default ones
      await saveSettings({
        useEncryption: true,
        theme: 'auto',
        defaultBarcodeFormat: 'QR_CODE',
      })
      applyTheme('auto')
    } finally {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

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

  const handleImportShared = useCallback(async (sharedCards: LoyaltyCard[]) => {
    try {
      // Import all shared cards
      for (const card of sharedCards) {
        await addCard(card)
      }
      addToast(`Imported ${sharedCards.length} ${sharedCards.length === 1 ? 'card' : 'cards'}`)
      navigate({ page: 'home' })
    } catch {
      addToast('Failed to import cards', 'error')
    }
  }, [addCard, addToast, navigate])

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

  if (!isReady) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
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
            onNavigateHome={() => navigate({ page: 'home' })}
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

        {route.page === 'share' && (
          <SharePage
            encodedData={route.encodedData}
            onBack={goBack}
            onImport={handleImportShared}
          />
        )}
      </Layout>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default App
