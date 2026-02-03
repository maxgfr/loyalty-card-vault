import { useState, useRef, useEffect, useCallback } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ShareURLModal } from '../share/ShareURLModal'
import { exportBackup, importBackup, downloadBackup } from '../../lib/backup'
import { getSettings, updateTheme, clearAllData, getAllCards } from '../../lib/storage'
import { createShareURL } from '../../lib/share-url'
import type { AppSettings } from '../../types'
import './SettingsPage.css'

interface SettingsPageProps {
  onBack: () => void
  onRefreshCards: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function navigateToHelp() {
  window.location.hash = '#help'
}

type ThemeOption = 'light' | 'dark' | 'auto'

export function SettingsPage({ onBack, onRefreshCards }: SettingsPageProps) {
  const [showResetModal, setShowResetModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [shareUrl, setShareUrl] = useState<{ url: string; password: string } | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadSettings = useCallback(async () => {
    const currentSettings = await getSettings()
    setSettings(currentSettings)
    applyTheme(currentSettings.theme)
  }, [])

  useEffect(() => {
    loadSettings()

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [loadSettings])

  const applyTheme = (theme: ThemeOption) => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')

    if (theme === 'auto') {
      // Let CSS @media query handle it
    } else {
      root.classList.add(`theme-${theme}`)
    }
  }

  const handleThemeChange = async (theme: ThemeOption) => {
    await updateTheme(theme)
    setSettings(prev => prev ? { ...prev, theme } : null)
    applyTheme(theme)
  }

  const handleExport = async () => {
    try {
      const blob = await exportBackup()
      downloadBackup(blob)
      setMessage({ type: 'success', text: 'Backup exported successfully' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to export backup' })
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await importBackup(file)

      if (result.success) {
        setMessage({ type: 'success', text: `Imported ${result.cardCount} cards successfully` })
        onRefreshCards()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to import backup' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to import backup' })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleReset = async () => {
    try {
      await clearAllData()
      setMessage({ type: 'success', text: 'All data cleared. App will reset.' })
      setShowResetModal(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      setMessage({ type: 'error', text: 'Failed to clear data' })
    }
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      setMessage({ type: 'error', text: 'Installation not available. Try using Chrome or Edge.' })
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setMessage({ type: 'success', text: 'App installed successfully!' })
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
  }

  const handleShareAllCards = async () => {
    try {
      setIsSharing(true)
      const cards = await getAllCards()

      if (cards.length === 0) {
        setMessage({ type: 'error', text: 'No cards to share. Add some cards first!' })
        return
      }

      const result = await createShareURL(cards)
      setShareUrl(result)
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to create share URL: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setIsSharing(false)
    }
  }

  if (!settings) {
    return (
      <div className="settings-page">
        <Header title="Settings" onBack={onBack} />
        <div className="settings-content">Loading...</div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <Header title="Settings" onBack={onBack} />

      <div className="settings-content">
        <Card>
          <h3 className="settings-section-title">🎨 Theme</h3>
          <p className="settings-section-description">
            Choose your preferred appearance
          </p>
          <div className="settings-theme-selector">
            <button
              className={`settings-theme-option ${settings.theme === 'light' ? 'settings-theme-option--active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <span className="settings-theme-icon">☀️</span>
              <span className="settings-theme-label">Light</span>
            </button>
            <button
              className={`settings-theme-option ${settings.theme === 'dark' ? 'settings-theme-option--active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <span className="settings-theme-icon">🌙</span>
              <span className="settings-theme-label">Dark</span>
            </button>
            <button
              className={`settings-theme-option ${settings.theme === 'auto' ? 'settings-theme-option--active' : ''}`}
              onClick={() => handleThemeChange('auto')}
            >
              <span className="settings-theme-icon">🔄</span>
              <span className="settings-theme-label">Auto</span>
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="settings-section-title">📤 Share All Cards</h3>
          <p className="settings-section-description">
            Share all your cards with friends or family using a secure link and QR code
          </p>
          <div className="settings-actions">
            <Button
              variant="primary"
              onClick={handleShareAllCards}
              fullWidth
              disabled={isSharing}
            >
              {isSharing ? 'Generating...' : '📤 Share All Cards'}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="settings-section-title">💾 Backup & Restore</h3>
          <p className="settings-section-description">
            Export your cards to a file or import from a previous backup
          </p>
          <div className="settings-actions">
            <Button variant="secondary" onClick={handleExport} fullWidth>
              📥 Export Backup
            </Button>
            <Button variant="secondary" onClick={handleImport} fullWidth>
              📤 Import Backup
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </Card>

        <Card>
          <h3 className="settings-section-title">🗑️ Reset Data</h3>
          <p className="settings-section-description">
            Clear all cards and settings. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            onClick={() => setShowResetModal(true)}
            fullWidth
          >
            Reset All Data
          </Button>
        </Card>

        {message && (
          <div className={`settings-message settings-message--${message.type}`}>
            {message.text}
          </div>
        )}

        <Card>
          <h3 className="settings-section-title">📱 Installation</h3>
          <p className="settings-section-description">
            {isInstalled
              ? 'App is installed on your device'
              : 'Install the app on your device for offline access and a better experience'
            }
          </p>
          <div className="settings-actions">
            {!isInstalled && deferredPrompt && (
              <Button variant="primary" onClick={handleInstallApp} fullWidth>
                📲 Install App
              </Button>
            )}
            <Button variant={isInstalled || deferredPrompt ? "secondary" : "primary"} onClick={navigateToHelp} fullWidth>
              📚 View Help Guide
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="settings-section-title">About</h3>
          <p className="settings-section-description">
            Loyalty Card Vault v1.0.0
          </p>
          <p className="settings-section-description">
            Secure loyalty card manager with barcode scanning
          </p>
        </Card>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Data"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Everything
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete all cards and settings? This action cannot be undone.
        </p>
        <p>
          You will need to go through the setup process again after resetting.
        </p>
      </Modal>

      <ShareURLModal
        isOpen={shareUrl !== null}
        onClose={() => setShareUrl(null)}
        url={shareUrl?.url || ''}
        password={shareUrl?.password || ''}
      />

    </div>
  )
}
