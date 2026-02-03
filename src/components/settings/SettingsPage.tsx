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

type ThemeOption = 'light' | 'dark' | 'auto'

export function SettingsPage({ onBack, onRefreshCards }: SettingsPageProps) {
  const [showResetModal, setShowResetModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [shareUrl, setShareUrl] = useState<{ url: string; password: string } | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [openHelpSection, setOpenHelpSection] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

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
      // 1. Clear all data (IndexedDB)
      await clearAllData()

      // 2. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(registration => registration.unregister()))
      }

      // 3. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
      }

      setMessage({ type: 'success', text: 'All data and cache cleared. App will reset.' })
      setShowResetModal(false)

      // 4. Hard reload (bypass cache)
      setTimeout(() => {
        window.location.href = window.location.href.split('#')[0] + '?t=' + Date.now()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}` })
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

  const toggleHelpSection = (section: string) => {
    setOpenHelpSection(openHelpSection === section ? null : section)
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

        {!isInstalled && deferredPrompt && (
          <Card>
            <h3 className="settings-section-title">📱 Installation</h3>
            <p className="settings-section-description">
              Install the app on your device for offline access and a better experience
            </p>
            <div className="settings-actions">
              <Button variant="primary" onClick={handleInstallApp} fullWidth>
                📲 Install App
              </Button>
            </div>
          </Card>
        )}

        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleHelpSection('installation')}
          >
            <span className="help-icon">📱</span>
            <span className="help-section-title">Installation</span>
            <span className="help-arrow">{openHelpSection === 'installation' ? '▼' : '▶'}</span>
          </button>

          {openHelpSection === 'installation' && (
            <div className="help-section-content">
              <p className="help-highlight">
                ✨ This app takes <strong>NO space</strong> on your phone!
              </p>

              {isIOS && (
                <div className="help-platform">
                  <h3>📱 iPhone/iPad</h3>
                  <ol>
                    <li>Tap the <strong>Share</strong> button 📤 at the bottom</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong></li>
                    <li>The app appears on your home screen! 🎉</li>
                  </ol>
                </div>
              )}

              {isAndroid && (
                <div className="help-platform">
                  <h3>📱 Android</h3>
                  <ol>
                    <li>Tap the <strong>3 dots</strong> ⋮ at the top right</li>
                    <li>Select <strong>"Add to Home screen"</strong></li>
                    <li>Tap <strong>"Add"</strong></li>
                    <li>The app appears on your home screen! 🎉</li>
                  </ol>
                </div>
              )}

              {!isIOS && !isAndroid && (
                <div className="help-platform">
                  <h3>💻 Desktop</h3>
                  <ol>
                    <li>Look for the <strong>"Install"</strong> icon ⊕ in the address bar</li>
                    <li>Click <strong>"Install"</strong></li>
                    <li>The app opens in a dedicated window! 🎉</li>
                  </ol>
                </div>
              )}

              <div className="help-info">
                <strong>💡 Why install?</strong>
                <ul>
                  <li>No space used (only a few KB)</li>
                  <li>Works offline after the first visit</li>
                  <li>Quick access from home screen</li>
                  <li>Automatic updates</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleHelpSection('usage')}
          >
            <span className="help-icon">📖</span>
            <span className="help-section-title">Usage Guide</span>
            <span className="help-arrow">{openHelpSection === 'usage' ? '▼' : '▶'}</span>
          </button>

          {openHelpSection === 'usage' && (
            <div className="help-section-content">
              <div className="help-step">
                <h4>1️⃣ Scan a card</h4>
                <p>Tap the <strong>Scan</strong> tab and point your camera at your loyalty card's barcode.</p>
              </div>

              <div className="help-step">
                <h4>2️⃣ Add manually</h4>
                <p>Tap <strong>Add</strong>, enter the card name and number. Store suggestions appear automatically!</p>
              </div>

              <div className="help-step">
                <h4>3️⃣ Use in store</h4>
                <p>Open your card and show the barcode to the cashier. Simple and fast!</p>
              </div>

              <div className="help-step">
                <h4>4️⃣ Make a backup</h4>
                <p>Go to <strong>Settings</strong> → <strong>Export Backup</strong> to save all your cards.</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleHelpSection('security')}
          >
            <span className="help-icon">🔒</span>
            <span className="help-section-title">Security & Privacy</span>
            <span className="help-arrow">{openHelpSection === 'security' ? '▼' : '▶'}</span>
          </button>

          {openHelpSection === 'security' && (
            <div className="help-section-content">
              <div className="help-info">
                <h4>✅ Your data is 100% secure</h4>
                <ul>
                  <li><strong>Local storage only</strong>: Nothing is sent over the Internet</li>
                  <li><strong>Mandatory encryption</strong>: All cards are encrypted with AES-256-GCM</li>
                  <li><strong>No server</strong>: The app runs entirely on your device</li>
                  <li><strong>No tracking</strong>: No cookies, no analytics</li>
                  <li><strong>Open source</strong>: Code is publicly auditable</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleHelpSection('faq')}
          >
            <span className="help-icon">❓</span>
            <span className="help-section-title">FAQ</span>
            <span className="help-arrow">{openHelpSection === 'faq' ? '▼' : '▶'}</span>
          </button>

          {openHelpSection === 'faq' && (
            <div className="help-section-content">
              <div className="help-faq">
                <h4>Does the app take up space on my phone?</h4>
                <p>No! Only a few KB for your card data. The app itself stays cached on the web and takes virtually no storage.</p>
              </div>

              <div className="help-faq">
                <h4>Does it work offline?</h4>
                <p>Yes! After your first visit, the app works 100% offline. Your cards are always accessible, even without Internet.</p>
              </div>

              <div className="help-faq">
                <h4>How do I share cards with family or switch phones?</h4>
                <p>Open a card, tap <strong>Share Card</strong>, and you'll get a secure URL and password. Share them separately (URL by link, password by text). The recipient opens the URL and enters the password to import the card.</p>
              </div>

              <div className="help-faq">
                <h4>What's the difference between Share and Export Backup?</h4>
                <p><strong>Share</strong> creates a temporary encrypted URL for specific cards (great for quick sharing). <strong>Export Backup</strong> saves all your cards in a file for safekeeping or phone transfers.</p>
              </div>

              <div className="help-faq">
                <h4>Which barcode formats are supported?</h4>
                <p>Almost all formats: QR Code, EAN-13/8, UPC-A/E, CODE-128/39, ITF-14, Codabar, Data Matrix, and more.</p>
              </div>

              <div className="help-faq">
                <h4>Can I use tags to organize my cards?</h4>
                <p>Yes! Tags help you categorize cards (e.g., "Grocery", "Retail", "Gas"). Add tags when creating or editing a card.</p>
              </div>

              <div className="help-faq">
                <h4>How do I delete the app and all data?</h4>
                <p>Go to <strong>Settings</strong> → <strong>Reset All Data</strong>. For complete removal, also uninstall the app: long-press the icon and tap "Uninstall" or "Remove".</p>
              </div>
            </div>
          )}
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
