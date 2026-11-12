import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { clearAllData, hasPasskeyUnlock, unlockVault, unlockWithPasskey, WrongPasswordError } from '../../lib/storage'
import { passkeyErrorMessage } from './passkeyMessages'
import './SetupPage.css'

interface UnlockPageProps {
  onUnlock: () => void
  /** Show the passkey prompt on arrival (not right after "Lock Now"). */
  promptPasskey?: boolean
  /** The vault was erased (forgotten password): set up a new one. */
  onErased: () => void
}

export function UnlockPage({ onUnlock, onErased, promptPasskey = true }: UnlockPageProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showErase, setShowErase] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [hasPasskey, setHasPasskey] = useState(false)
  const [isPasskeyUnlocking, setIsPasskeyUnlocking] = useState(false)
  const passkeyPrompted = useRef(false)

  const handlePasskey = useCallback(async () => {
    setError('')
    setIsPasskeyUnlocking(true)
    try {
      await unlockWithPasskey()
      onUnlock()
    } catch (err) {
      setError(passkeyErrorMessage(err) ?? '')
    } finally {
      setIsPasskeyUnlocking(false)
    }
  }, [onUnlock])

  // A passkey is set up: show its prompt straight away (once). Dismissed, or refused without a tap
  // (some browsers want one), the button stays.
  useEffect(() => {
    let active = true
    hasPasskeyUnlock()
      .then(enrolled => {
        if (!active || !enrolled) return
        setHasPasskey(true)
        if (promptPasskey && !passkeyPrompted.current) {
          passkeyPrompted.current = true
          handlePasskey()
        }
      })
      .catch(err => console.error('Failed to read the passkey settings:', err))
    return () => {
      active = false
    }
  }, [handlePasskey, promptPasskey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError('')
    setIsUnlocking(true)
    try {
      await unlockVault(password)
      setPassword('')
      onUnlock()
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Wrong password' : 'Could not open the vault. Please try again.')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleErase = async () => {
    setIsErasing(true)
    try {
      await clearAllData()
      setShowErase(false)
      onErased()
    } catch {
      setError('Could not erase the vault. Please try again.')
    } finally {
      setIsErasing(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-content">
        <div className="setup-header">
          <h1 className="setup-title">Loyalty Card Vault</h1>
          <p className="setup-subtitle">
            {hasPasskey ? 'Unlock your cards' : 'Enter your password to unlock your cards'}
          </p>
        </div>

        <Card className="setup-card">
          {hasPasskey && (
            <div className="setup-passkey">
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={isPasskeyUnlocking}
                onClick={handlePasskey}
                data-testid="passkey-unlock"
              >
                Unlock with Biometrics
              </Button>
              <p className="setup-divider">or use your password</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="setup-form" data-testid="unlock-form">
            <div className="setup-password">
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                autoComplete="current-password"
                fullWidth
                required
                autoFocus={!hasPasskey}
              />
            </div>

            {error && <p className="setup-error" role="alert">{error}</p>}

            <Button
              type="submit"
              variant={hasPasskey ? 'secondary' : 'primary'}
              fullWidth
              loading={isUnlocking}
              disabled={!password}
            >
              Unlock
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => setShowErase(true)}>
              Forgot your password?
            </Button>
          </form>
        </Card>
      </div>

      <Modal
        isOpen={showErase}
        onClose={() => setShowErase(false)}
        title="Forgot your password?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowErase(false)} disabled={isErasing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleErase} loading={isErasing}>
              Erase All Cards
            </Button>
          </>
        }
      >
        <p>
          The password cannot be recovered, and without it your cards cannot be decrypted. You can erase
          the vault and start over, then import a backup if you have one (it opens with the password it
          was exported with).
        </p>
      </Modal>
    </div>
  )
}
