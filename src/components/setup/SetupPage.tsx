import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { saveSettings } from '../../lib/storage'
import { validatePassword } from '../../lib/validation'
import './SetupPage.css'

interface SetupPageProps {
  onComplete: () => void
}

export function SetupPage({ onComplete }: SetupPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validation = validatePassword(password)
    if (!validation.valid) {
      setError(validation.error || 'Invalid password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      await saveSettings({
        useEncryption: true,
        theme: 'auto',
        defaultBarcodeFormat: 'QR_CODE',
      })

      onComplete()
    } catch {
      setError('Failed to save settings')
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-content">
        <div className="setup-header">
          <h1 className="setup-title">Welcome to Loyalty Card Vault</h1>
          <p className="setup-subtitle">Set up your secure card storage</p>
        </div>

        <Card className="setup-card">
          <form onSubmit={handleSubmit} className="setup-form">
            <div className="setup-info">
              <h2 className="setup-info-title">🔒 Secure Encryption</h2>
              <p className="setup-info-description">
                Your loyalty cards will be encrypted with AES-256 encryption.
                This protects your card numbers and barcodes from unauthorized access.
              </p>
              <p className="setup-info-note">
                You'll need your password to access your cards.
              </p>
            </div>

            <div className="setup-password">
              <Input
                type="password"
                label="Create Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoFocus
              />
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                required
              />
              <p className="setup-password-hint">
                Minimum 8 characters with at least one letter and one number
              </p>
            </div>

            {error && <p className="setup-error">{error}</p>}

            <Button type="submit" variant="primary" fullWidth>
              Get Started
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
