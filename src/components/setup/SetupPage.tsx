import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { createVault } from '../../lib/storage'
import { passwordSchema } from '../../lib/validation'
import './SetupPage.css'

interface SetupPageProps {
  /** Cards an earlier version kept unencrypted: sealed when the vault is created. */
  plainCardCount: number
  onComplete: () => void
}

export function SetupPage({ plainCardCount, onComplete }: SetupPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validation = passwordSchema.safeParse(password)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsCreating(true)
    try {
      await createVault(password)
      onComplete()
    } catch {
      setError(
        plainCardCount > 0
          ? 'Could not encrypt your cards. Nothing was changed: your cards are still here. Please try again.'
          : 'Could not create the vault. Please try again.'
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-content">
        <div className="setup-header">
          <h1 className="setup-title">Welcome to Loyalty Card Vault</h1>
          <p className="setup-subtitle">
            {plainCardCount > 0 ? 'Protect your cards with a password' : 'Set up your secure card storage'}
          </p>
        </div>

        <Card className="setup-card">
          <form onSubmit={handleSubmit} className="setup-form" data-testid="setup-form">
            <div className="setup-info">
              <h2 className="setup-info-title">🔒 Secure Encryption</h2>
              <p className="setup-info-description">
                Your loyalty cards are encrypted on this device with AES-256, under a key derived from
                your password. Nobody can read them without it.
              </p>
              {plainCardCount > 0 && (
                <p className="setup-info-description" data-testid="setup-migration">
                  {plainCardCount === 1 ? 'Your card is' : `Your ${plainCardCount} cards are`} currently
                  stored unencrypted. Choose a password to encrypt {plainCardCount === 1 ? 'it' : 'them'}.
                </p>
              )}
              <p className="setup-info-note">
                <strong>There is no way to recover a forgotten password.</strong> Without it, your cards
                are lost. Keep an exported backup somewhere safe.
              </p>
            </div>

            <div className="setup-password">
              <Input
                type="password"
                label="Create Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                fullWidth
                required
                autoFocus
              />
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                fullWidth
                required
              />
              <p className="setup-password-hint">
                Minimum 8 characters with at least one letter and one number
              </p>
            </div>

            {error && <p className="setup-error" role="alert">{error}</p>}

            <Button type="submit" variant="primary" fullWidth loading={isCreating}>
              {plainCardCount > 0 ? 'Encrypt My Cards' : 'Get Started'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
