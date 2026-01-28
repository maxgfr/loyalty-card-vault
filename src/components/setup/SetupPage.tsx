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
  const [useEncryption, setUseEncryption] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (useEncryption) {
      const validation = validatePassword(password)
      if (!validation.valid) {
        setError(validation.error || 'Invalid password')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    try {
      await saveSettings({
        useEncryption,
        theme: 'auto',
        defaultBarcodeFormat: 'QR_CODE',
      })

      onComplete()
    } catch (err) {
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
            <div className="setup-option">
              <label className="setup-option-label">
                <input
                  type="radio"
                  name="encryption"
                  checked={!useEncryption}
                  onChange={() => setUseEncryption(false)}
                />
                <div>
                  <span className="setup-option-title">Simple Mode</span>
                  <p className="setup-option-description">
                    Cards stored without encryption. Quick and easy.
                  </p>
                </div>
              </label>
            </div>

            <div className="setup-option">
              <label className="setup-option-label">
                <input
                  type="radio"
                  name="encryption"
                  checked={useEncryption}
                  onChange={() => setUseEncryption(true)}
                />
                <div>
                  <span className="setup-option-title">Secure Mode (Recommended)</span>
                  <p className="setup-option-description">
                    Cards encrypted with a password. More secure.
                  </p>
                </div>
              </label>
            </div>

            {useEncryption && (
              <div className="setup-password">
                <Input
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
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
            )}

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
