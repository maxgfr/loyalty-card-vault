import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import {
  clearAllData,
  hasPasskeyUnlock,
  hasPassword,
  setVaultPassword,
  unlockVault,
  unlockWithPasskey,
  WrongPasswordError,
} from '../../lib/storage'
import { passwordSchema } from '../../lib/validation'
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
  const [showForgot, setShowForgot] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  /** How this vault opens; null until read */
  const [methods, setMethods] = useState<{ passkey: boolean; password: boolean } | null>(null)
  const [isPasskeyUnlocking, setIsPasskeyUnlocking] = useState(false)
  const passkeyPrompted = useRef(false)
  // Forgotten password: unlocked with the passkey, a new password is chosen
  const [choosingPassword, setChoosingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

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
    Promise.all([hasPasskeyUnlock(), hasPassword()])
      .then(([passkey, withPassword]) => {
        if (!active) return
        setMethods({ passkey, password: withPassword })
        if (passkey && promptPasskey && !passkeyPrompted.current) {
          passkeyPrompted.current = true
          handlePasskey()
        }
      })
      .catch(err => {
        console.error('Failed to read how the vault unlocks:', err)
        if (active) setMethods({ passkey: false, password: true })
      })
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

  const handleResetWithPasskey = async () => {
    setError('')
    setIsPasskeyUnlocking(true)
    try {
      await unlockWithPasskey()
      setShowForgot(false)
      setChoosingPassword(true)
    } catch (err) {
      setShowForgot(false)
      setError(passkeyErrorMessage(err) ?? '')
    } finally {
      setIsPasskeyUnlocking(false)
    }
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validation = passwordSchema.safeParse(newPassword)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid password')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsSavingPassword(true)
    try {
      await setVaultPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      onUnlock()
    } catch (err) {
      setError(passkeyErrorMessage(err) ?? 'Could not change the password. Please try again.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleErase = async () => {
    setIsErasing(true)
    try {
      await clearAllData()
      setShowForgot(false)
      onErased()
    } catch {
      setError('Could not erase the vault. Please try again.')
    } finally {
      setIsErasing(false)
    }
  }

  if (methods === null) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (choosingPassword) {
    return (
      <div className="setup-page">
        <div className="setup-content">
          <div className="setup-header">
            <h1 className="setup-title">Choose a New Password</h1>
            <p className="setup-subtitle">Your cards are unlocked and kept</p>
          </div>

          <Card className="setup-card">
            <form onSubmit={handleNewPassword} className="setup-form" data-testid="new-password-form">
              <div className="setup-password">
                <Input
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  fullWidth
                  required
                  autoFocus
                />
                <Input
                  type="password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  fullWidth
                  required
                />
                <p className="setup-password-hint">Minimum 8 characters with at least one letter and one number</p>
              </div>

              {error && <p className="setup-error" role="alert">{error}</p>}

              <Button type="submit" variant="primary" fullWidth loading={isSavingPassword}>
                Save Password
              </Button>
              <Button type="button" variant="ghost" fullWidth disabled={isSavingPassword} onClick={onUnlock}>
                Not Now
              </Button>
            </form>
          </Card>
        </div>
      </div>
    )
  }

  const passkeyButton = methods.passkey && (
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
  )

  return (
    <div className="setup-page">
      <div className="setup-content">
        <div className="setup-header">
          <h1 className="setup-title">Loyalty Card Vault</h1>
          <p className="setup-subtitle">
            {methods.passkey ? 'Unlock your cards' : 'Enter your password to unlock your cards'}
          </p>
        </div>

        <Card className="setup-card">
          {methods.password ? (
            <>
              {passkeyButton && (
                <div className="setup-passkey">
                  {passkeyButton}
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
                    autoFocus={!methods.passkey}
                  />
                </div>

                {error && <p className="setup-error" role="alert">{error}</p>}

                <Button
                  type="submit"
                  variant={methods.passkey ? 'secondary' : 'primary'}
                  fullWidth
                  loading={isUnlocking}
                  disabled={!password}
                >
                  Unlock
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setShowForgot(true)}>
                  Forgot your password?
                </Button>
              </form>
            </>
          ) : (
            <div className="setup-form" data-testid="passkey-only">
              {passkeyButton}
              {error && <p className="setup-error" role="alert">{error}</p>}
              <Button type="button" variant="ghost" fullWidth onClick={() => setShowForgot(true)}>
                Lost access to your passkey?
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        title={methods.password ? 'Forgot your password?' : 'Lost access to your passkey?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForgot(false)} disabled={isErasing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleErase} loading={isErasing}>
              Erase All Cards
            </Button>
          </>
        }
      >
        {methods.password && methods.passkey ? (
          <>
            <p>
              Unlock with biometrics, then choose a new password: your cards are kept.
            </p>
            <Button
              variant="primary"
              fullWidth
              loading={isPasskeyUnlocking}
              onClick={handleResetWithPasskey}
              data-testid="reset-with-passkey"
            >
              Reset with Biometrics
            </Button>
            <p>
              Without biometrics, the password cannot be recovered. You can erase the vault and start over,
              then import a backup if you have one (it opens with the password it was exported with).
            </p>
          </>
        ) : methods.password ? (
          <p>
            The password cannot be recovered, and without it your cards cannot be decrypted. You can erase
            the vault and start over, then import a backup if you have one (it opens with the password it
            was exported with).
          </p>
        ) : (
          <p>
            This vault has no password: without its passkey, your cards cannot be decrypted. You can erase
            the vault and start over, then import a backup if you have one (it opens with the password it
            was exported with).
          </p>
        )}
      </Modal>
    </div>
  )
}
