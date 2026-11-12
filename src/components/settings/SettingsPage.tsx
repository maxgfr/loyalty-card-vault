import { useState, useRef, useEffect, useCallback } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { ShareURLModal } from '../share/ShareURLModal'
import { exportBackup, importBackup, downloadBackup } from '../../lib/backup'
import { importCatima } from '../../lib/catima'
import {
  getSettings,
  updateTheme,
  clearAllData,
  getAllCards,
  disablePasskeyUnlock,
  enablePasskeyUnlock,
  hasPasskeyUnlock,
  isDeviceRemembered,
  setRememberDevice,
  WrongPasswordError,
} from '../../lib/storage'
import { isPasskeyAvailable } from '../../lib/passkey'
import { passkeyErrorMessage } from '../setup/passkeyMessages'
import { createShareURL } from '../../lib/share-url'
import { APP_VERSION } from '../../lib/version'
import { resetSiteData } from '../../lib/site-reset'
import type { AppSettings } from '../../types'
import './SettingsPage.css'

interface SettingsPageProps {
  onBack: () => void
  onRefreshCards: () => void
  /** Forgets the vault key: the unlock screen shows again. */
  onLock: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type ThemeOption = 'light' | 'dark' | 'auto'

export function SettingsPage({ onBack, onRefreshCards, onLock }: SettingsPageProps) {
  const [showResetModal, setShowResetModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [shareUrl, setShareUrl] = useState<{ url: string; password: string } | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [openHelpSection, setOpenHelpSection] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const catimaInputRef = useRef<HTMLInputElement>(null)
  const [catimaFile, setCatimaFile] = useState<File | null>(null)
  const [catimaPassword, setCatimaPassword] = useState('')
  const [catimaPasswordError, setCatimaPasswordError] = useState<string | undefined>()
  const [isImportingCatima, setIsImportingCatima] = useState(false)
  // A backup encrypted under another password than this vault's
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [backupPassword, setBackupPassword] = useState('')
  const [backupPasswordError, setBackupPasswordError] = useState<string | undefined>()
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  // How the vault opens on this device
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [passkeyAvailable, setPasskeyAvailable] = useState(false)
  const [deviceRemembered, setDeviceRemembered] = useState(false)
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [passkeyPassword, setPasskeyPassword] = useState('')
  const [passkeyPasswordError, setPasskeyPasswordError] = useState<string | undefined>()
  const [isEnablingPasskey, setIsEnablingPasskey] = useState(false)
  const [showRememberModal, setShowRememberModal] = useState(false)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  const loadSettings = useCallback(async () => {
    const currentSettings = await getSettings()
    setSettings(currentSettings)
    applyTheme(currentSettings.theme)
    const [enrolled, available, remembered] = await Promise.all([
      hasPasskeyUnlock(),
      isPasskeyAvailable(),
      isDeviceRemembered(),
    ])
    setPasskeyEnabled(enrolled)
    setPasskeyAvailable(available)
    setDeviceRemembered(remembered)
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

  const closePasskeyModal = () => {
    setShowPasskeyModal(false)
    setPasskeyPassword('')
    setPasskeyPasswordError(undefined)
  }

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passkeyPassword) return
    setIsEnablingPasskey(true)
    try {
      await enablePasskeyUnlock(passkeyPassword)
      setPasskeyEnabled(true)
      closePasskeyModal()
      setMessage({ type: 'success', text: 'Biometric unlock is on' })
    } catch (err) {
      // Dismissed prompt: stay in the dialog, to try again or cancel
      const text = passkeyErrorMessage(err)
      if (text) setPasskeyPasswordError(err instanceof WrongPasswordError ? 'Wrong password' : text)
    } finally {
      setIsEnablingPasskey(false)
    }
  }

  const handleDisablePasskey = async () => {
    try {
      await disablePasskeyUnlock()
      setPasskeyEnabled(false)
      setMessage({
        type: 'success',
        text: 'Biometric unlock is off. The passkey can be deleted from your password manager.',
      })
    } catch {
      setMessage({ type: 'error', text: 'Failed to turn off biometric unlock' })
    }
  }

  const handleRememberDevice = async (remember: boolean) => {
    try {
      await setRememberDevice(remember)
      setDeviceRemembered(remember)
      setShowRememberModal(false)
      setMessage({
        type: 'success',
        text: remember ? 'The app will open without asking on this device' : 'The app will ask to unlock again',
      })
    } catch {
      setMessage({ type: 'error', text: 'Failed to change how the app unlocks' })
    }
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

  const closeBackupPasswordModal = () => {
    setBackupFile(null)
    setBackupPassword('')
    setBackupPasswordError(undefined)
  }

  const runBackupImport = async (file: File, password?: string) => {
    setIsImportingBackup(true)
    try {
      const result = await importBackup(file, password)

      if (result.success) {
        closeBackupPasswordModal()
        setMessage({ type: 'success', text: `Imported ${result.cardCount} cards successfully` })
        onRefreshCards()
      } else if (result.needsPassword) {
        setBackupFile(file)
        setBackupPasswordError(password ? 'Wrong password for this backup' : undefined)
      } else {
        closeBackupPasswordModal()
        setMessage({ type: 'error', text: result.error || 'Failed to import backup' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to import backup' })
    } finally {
      setIsImportingBackup(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (!file) return
    await runBackupImport(file)
  }

  const handleBackupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!backupFile || !backupPassword) return
    await runBackupImport(backupFile, backupPassword)
  }

  const closeCatimaPasswordModal = () => {
    setCatimaFile(null)
    setCatimaPassword('')
    setCatimaPasswordError(undefined)
  }

  const runCatimaImport = async (file: File, password?: string) => {
    setIsImportingCatima(true)
    try {
      const result = await importCatima(file, password)

      if (result.success) {
        closeCatimaPasswordModal()
        const skipped = result.skippedCount > 0 ? ` (${result.skippedCount} already in your vault)` : ''
        setMessage({ type: 'success', text: `Imported ${result.cardCount} cards from Catima${skipped}` })
        onRefreshCards()
      } else if (result.needsPassword) {
        setCatimaFile(file)
        setCatimaPasswordError(password ? result.error : undefined)
      } else {
        closeCatimaPasswordModal()
        setMessage({ type: 'error', text: result.error || 'Failed to import Catima export' })
      }
    } finally {
      setIsImportingCatima(false)
    }
  }

  const handleCatimaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (catimaInputRef.current) {
      catimaInputRef.current.value = ''
    }
    if (!file) return
    await runCatimaImport(file)
  }

  const handleCatimaPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catimaFile || !catimaPassword) return
    await runCatimaImport(catimaFile, catimaPassword)
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      // 1. Clear all data (IndexedDB)
      await clearAllData()

      // 2. This app's service worker, caches and localStorage keys only: the origin is shared
      // with every other maxgfr.github.io app
      await resetSiteData()

      setMessage({ type: 'success', text: 'All data and cache cleared. App will reset.' })
      setShowResetModal(false)

      // 4. Hard reload (bypass cache)
      setTimeout(() => {
        window.location.href = window.location.href.split('#')[0] + '?t=' + Date.now()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}` })
      setIsResetting(false)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const updated = await registration.update()
          if (updated.waiting) {
            updated.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }
      }
      window.location.reload()
    } catch {
      setMessage({ type: 'error', text: 'Update failed. Please try again.' })
      setIsUpdating(false)
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
            Export your cards to a file encrypted with your master password, or import a previous backup
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
          <h3 className="settings-section-title">📲 Import from Catima</h3>
          <p className="settings-section-description">
            In Catima, open <strong>Import/Export → Export</strong>, then select the exported <code>.zip</code> file here
          </p>
          <Button
            variant="secondary"
            onClick={() => catimaInputRef.current?.click()}
            fullWidth
            loading={isImportingCatima && !catimaFile}
          >
            Import Catima Export
          </Button>
          <input
            ref={catimaInputRef}
            type="file"
            accept=".zip,.csv,application/zip,text/csv"
            style={{ display: 'none' }}
            onChange={handleCatimaFileChange}
          />
        </Card>

        <Card>
          <h3 className="settings-section-title">🔄 Update App</h3>
          <p className="settings-section-description">
            Check for updates and reload with the latest version
          </p>
          <Button
            variant="secondary"
            onClick={handleUpdate}
            fullWidth
            loading={isUpdating}
          >
            Update App
          </Button>
        </Card>

        <Card>
          <h3 className="settings-section-title">👆 Unlock</h3>
          <p className="settings-section-description">
            How the app opens on this device. Your password always works.
          </p>
          <div className="settings-actions">
            {passkeyEnabled ? (
              <Button variant="secondary" onClick={handleDisablePasskey} fullWidth>
                Turn Off Biometric Unlock
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowPasskeyModal(true)}
                disabled={!passkeyAvailable}
                fullWidth
              >
                Unlock with Touch ID / Face ID
              </Button>
            )}
            {!passkeyEnabled && !passkeyAvailable && (
              <p className="settings-section-description">
                Biometric unlock is not available in this browser or on this device.
              </p>
            )}
            {deviceRemembered ? (
              <Button variant="secondary" onClick={() => handleRememberDevice(false)} fullWidth>
                Ask to Unlock Again
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setShowRememberModal(true)} fullWidth>
                Don't Ask on This Device
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="settings-section-title">🔒 Lock Vault</h3>
          <p className="settings-section-description">
            Forget the key until the vault is unlocked again
            {deviceRemembered ? '. This also turns off “Don’t ask on this device”.' : ''}
          </p>
          <Button variant="secondary" onClick={onLock} fullWidth>
            Lock Now
          </Button>
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
              {!isInstalled && deferredPrompt && (
                <div className="settings-actions">
                  <Button variant="primary" onClick={handleInstallApp} fullWidth>
                    📲 Install App
                  </Button>
                </div>
              )}

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
                  <li><strong>Mandatory encryption</strong>: All cards are encrypted with AES-256-GCM, under a key derived from your password (PBKDF2-SHA256, 600,000 rounds)</li>
                  <li><strong>Password never stored</strong>: The key exists only in memory while the vault is unlocked. A forgotten password cannot be recovered: keep a backup</li>
                  <li><strong>Biometric unlock (optional)</strong>: A passkey (Touch ID, Face ID, fingerprint) releases the key; it is sealed under a secret only your device's authenticator gives back, after verifying you</li>
                  <li><strong>"Don't ask on this device" (optional)</strong>: The key is kept on this device so the app opens unlocked. Anyone holding your unlocked device, and any other site on maxgfr.github.io, could then read your cards. Lock Now turns it off</li>
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

        {/* Version info */}
        <div className="settings-version">
          <p className="settings-version-text">
            Version {APP_VERSION}
          </p>
        </div>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Data"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResetModal(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset} loading={isResetting}>
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

      <Modal
        isOpen={catimaFile !== null}
        onClose={closeCatimaPasswordModal}
        title="Catima Export Password"
        footer={
          <>
            <Button variant="secondary" onClick={closeCatimaPasswordModal} disabled={isImportingCatima}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="catima-password-form"
              loading={isImportingCatima}
              disabled={!catimaPassword}
            >
              Import
            </Button>
          </>
        }
      >
        <form id="catima-password-form" onSubmit={handleCatimaPasswordSubmit}>
          <p>This export is password-protected. Enter the password you chose in Catima.</p>
          <Input
            type="password"
            label="Password"
            value={catimaPassword}
            onChange={e => {
              setCatimaPassword(e.target.value)
              setCatimaPasswordError(undefined)
            }}
            error={catimaPasswordError}
            autoFocus
            fullWidth
          />
        </form>
      </Modal>

      <Modal
        isOpen={backupFile !== null}
        onClose={closeBackupPasswordModal}
        title="Backup Password"
        footer={
          <>
            <Button variant="secondary" onClick={closeBackupPasswordModal} disabled={isImportingBackup}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="backup-password-form"
              loading={isImportingBackup}
              disabled={!backupPassword}
            >
              Import
            </Button>
          </>
        }
      >
        <form id="backup-password-form" onSubmit={handleBackupPasswordSubmit}>
          <p>This backup was encrypted with another master password. Enter that password.</p>
          <Input
            type="password"
            label="Password"
            value={backupPassword}
            onChange={e => {
              setBackupPassword(e.target.value)
              setBackupPasswordError(undefined)
            }}
            error={backupPasswordError}
            autoFocus
            fullWidth
          />
        </form>
      </Modal>

      <Modal
        isOpen={showPasskeyModal}
        onClose={closePasskeyModal}
        title="Biometric Unlock"
        footer={
          <>
            <Button variant="secondary" onClick={closePasskeyModal} disabled={isEnablingPasskey}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="passkey-password-form"
              loading={isEnablingPasskey}
              disabled={!passkeyPassword}
            >
              Continue
            </Button>
          </>
        }
      >
        <form id="passkey-password-form" onSubmit={handlePasskeySubmit}>
          <p>
            Enter your password, then confirm with Touch ID, Face ID or your fingerprint. A passkey is saved
            in your device's password manager.
          </p>
          <Input
            type="password"
            label="Password"
            value={passkeyPassword}
            onChange={e => {
              setPasskeyPassword(e.target.value)
              setPasskeyPasswordError(undefined)
            }}
            error={passkeyPasswordError}
            autoComplete="current-password"
            autoFocus
            fullWidth
          />
        </form>
      </Modal>

      <Modal
        isOpen={showRememberModal}
        onClose={() => setShowRememberModal(false)}
        title="Don't Ask on This Device?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRememberModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleRememberDevice(true)}>
              Don't Ask
            </Button>
          </>
        }
      >
        <p>
          The app will open without a password or biometrics on this device. To do so, the key that
          decrypts your cards is kept on the device.
        </p>
        <p>
          Anyone who can use this device, and any other site hosted on maxgfr.github.io, could then read
          your cards. Lock Now in Settings turns this off.
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
