import { useState, useRef, useEffect } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { exportBackup, importBackup, downloadBackup } from '../../lib/backup'
import { isEncryptionEnabled, saveSettings } from '../../lib/storage'
import './SettingsPage.css'

interface SettingsPageProps {
  onBack: () => void
  onRefreshCards: () => void
}

function navigateToHelp() {
  window.location.hash = '#help'
}

export function SettingsPage({ onBack, onRefreshCards }: SettingsPageProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    } catch (error) {
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


  return (
    <div className="settings-page">
      <Header title="Settings" onBack={onBack} />

      <div className="settings-content">
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
          <h3 className="settings-section-title">Backup & Restore</h3>
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

    </div>
  )
}
