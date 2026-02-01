import { useState, useRef, useEffect } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { exportBackup, importBackup, downloadBackup } from '../../lib/backup'
import { isEncryptionEnabled, getSettings, updateTheme, clearAllData } from '../../lib/storage'
import type { AppSettings } from '../../types'
import './SettingsPage.css'

interface SettingsPageProps {
  onBack: () => void
  onRefreshCards: () => void
}

function navigateToHelp() {
  window.location.hash = '#help'
}

type ThemeOption = 'light' | 'dark' | 'auto'

export function SettingsPage({ onBack, onRefreshCards }: SettingsPageProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [password, setPassword] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const currentSettings = await getSettings()
    setSettings(currentSettings)
  }

  const handleThemeChange = async (theme: ThemeOption) => {
    await updateTheme(theme)
    setSettings(prev => prev ? { ...prev, theme } : null)
    applyTheme(theme)
  }

  const applyTheme = (theme: ThemeOption) => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark', 'theme-auto')

    if (theme === 'auto') {
      root.classList.add('theme-auto')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('theme-dark', prefersDark)
      root.classList.toggle('theme-light', !prefersDark)
    } else {
      root.classList.add(`theme-${theme}`)
    }
  }

  const handleExport = async () => {
    const encrypted = await isEncryptionEnabled()

    if (encrypted) {
      setIsExporting(true)
      setShowPasswordModal(true)
    } else {
      await performExport()
    }
  }

  const performExport = async (pwd?: string) => {
    try {
      const blob = await exportBackup(pwd)
      downloadBackup(blob)
      setMessage({ type: 'success', text: 'Backup exported successfully' })
      setShowPasswordModal(false)
      setPassword('')
    } catch {
      setMessage({ type: 'error', text: 'Failed to export backup' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Read the file to check if it's encrypted
      const text = await file.text()
      const backupData = JSON.parse(text)

      // Check if the backup file is encrypted
      if (backupData.encrypted) {
        setIsExporting(false)
        setShowPasswordModal(true)
        fileInputRef.current!.dataset.file = 'pending'
      } else {
        await performImport(file)
      }
    } catch {
      setMessage({ type: 'error', text: 'Invalid backup file' })
    }
  }

  const performImport = async (file?: File, pwd?: string) => {
    const targetFile = file || (fileInputRef.current?.dataset.file === 'pending' ? fileInputRef.current?.files?.[0] : null)
    if (!targetFile) return

    try {
      const result = await importBackup(targetFile, pwd)

      if (result.success) {
        setMessage({ type: 'success', text: `Imported ${result.cardCount} cards successfully` })
        onRefreshCards()
        setShowPasswordModal(false)
        setPassword('')
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to import backup' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to import backup' })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
        delete fileInputRef.current.dataset.file
      }
    }
  }

  const handlePasswordSubmit = () => {
    if (isExporting) {
      performExport(password)
    } else {
      performImport(undefined, password)
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
          <h3 className="settings-section-title">🔐 Encryption Status</h3>
          <p className="settings-section-description">
            All your cards are encrypted with AES-256 encryption for maximum security.
          </p>
          <div className="encryption-status">
            <div className="encryption-status-badge">
              <span className="encryption-status-indicator encryption-status-indicator--enabled" />
              <span className="encryption-status-text">Always Enabled</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="settings-section-title">💾 Backup & Restore</h3>
          <p className="settings-section-description">
            Export your cards to a file or import from a previous backup
          </p>
          <div className="settings-actions">
            <Button variant="primary" onClick={handleExport} fullWidth>
              Export Backup
            </Button>
            <Button variant="secondary" onClick={handleImport} fullWidth>
              Import Backup
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
          <h3 className="settings-section-title">Help & Installation</h3>
          <p className="settings-section-description">
            How to install the app, scan cards, and more
          </p>
          <div className="settings-actions">
            <Button variant="primary" onClick={navigateToHelp} fullWidth>
              📱 View Help Guide
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
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={isExporting ? 'Enter Password to Export' : 'Enter Password to Import'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePasswordSubmit}>
              Continue
            </Button>
          </>
        }
      >
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          autoFocus
        />
      </Modal>

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

    </div>
  )
}
