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
import {
  countPlainCards,
  getLastOpenCard,
  getSettings,
  getVaultState,
  lockVault,
  saveLastOpenCard,
  saveSettings,
  type VaultState,
} from './lib/storage'
import { SetupPage } from './components/setup/SetupPage'
import { UnlockPage } from './components/setup/UnlockPage'
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
  const [vault, setVault] = useState<VaultState | null>(null)
  const [plainCardCount, setPlainCardCount] = useState(0)
  const { cards, isLoading: cardsLoading, addCard, updateCard, deleteCard, markCardUsed, refreshCards } =
    useCards(vault === 'unlocked')
  // Launched on the list (the home screen icon, not a share or card link): the card that was open
  // when the app was closed can be reopened.
  const [launchedOnHome] = useState(() => route.page === 'home')
  const [lastCardRestored, setLastCardRestored] = useState(false)
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
      try {
        const state = await getVaultState()
        if (state === 'none') setPlainCardCount(await countPlainCards())
        setVault(state)
      } finally {
        setIsReady(true)
      }
    }
  }, [])

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  // Once the cards are loaded after the first unlock, reopen the card that was open last time.
  useEffect(() => {
    if (vault !== 'unlocked' || cardsLoading || lastCardRestored) return
    let active = true
    ;(launchedOnHome ? getLastOpenCard() : Promise.resolve(null))
      .then(id => {
        if (active && id && cards.some(c => c.id === id)) navigate({ page: 'card', cardId: id })
      })
      .catch(err => console.error('Failed to read the last opened card:', err))
      .finally(() => {
        if (active) setLastCardRestored(true)
      })
    return () => {
      active = false
    }
  }, [vault, cardsLoading, lastCardRestored, launchedOnHome, cards, navigate])

  // Then keep track of it: a card opened, or the list (other pages keep the card they came from).
  useEffect(() => {
    if (vault !== 'unlocked' || !lastCardRestored) return
    if (route.page !== 'card' && route.page !== 'home') return
    saveLastOpenCard(route.page === 'card' ? route.cardId : null).catch(err =>
      console.error('Failed to remember the open card:', err)
    )
  }, [vault, lastCardRestored, route])

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

  const handleOpenCard = useCallback((cardId: string) => {
    navigate({ page: 'card', cardId })
    // Failing to record usage only affects ordering, never block opening the card
    markCardUsed(cardId).catch(err => console.error('Failed to record card usage:', err))
  }, [navigate, markCardUsed])

  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await deleteCard(cardId)
      addToast('Card deleted successfully')
      goBack()
    } catch {
      addToast('Failed to delete card', 'error')
    }
  }, [deleteCard, addToast, goBack])

  const handleLock = useCallback(() => {
    lockVault()
    setVault('locked')
    navigate({ page: 'home' })
  }, [navigate])

  if (!isReady || vault === null) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (vault === 'none') {
    return <SetupPage plainCardCount={plainCardCount} onComplete={() => setVault('unlocked')} />
  }

  if (vault === 'locked') {
    return (
      <UnlockPage
        onUnlock={() => setVault('unlocked')}
        onErased={() => {
          setPlainCardCount(0)
          setVault('none')
        }}
      />
    )
  }

  return (
    <>
      <Layout>
        {route.page === 'home' && (
          <CardList cards={cards} onCardClick={handleOpenCard} />
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
          <SettingsPage onBack={goBack} onRefreshCards={refreshCards} onLock={handleLock} />
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
