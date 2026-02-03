import { useState } from 'react'
import { Button } from './Button'
import './InstallBanner.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallBannerProps {
  deferredPrompt: BeforeInstallPromptEvent | null
  onInstalled: () => void
  onDismiss: () => void
}

export function InstallBanner({ deferredPrompt, onInstalled, onDismiss }: InstallBannerProps) {
  const [isInstalling, setIsInstalling] = useState(false)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        onInstalled()
      } else {
        onDismiss()
      }
    } catch (error) {
      console.error('Install error:', error)
      onDismiss()
    } finally {
      setIsInstalling(false)
    }
  }

  if (isIOS) {
    return (
      <div className="install-banner install-banner--ios">
        <div className="install-banner-content">
          <span className="install-banner-icon">📱</span>
          <div className="install-banner-text">
            <strong>Installer l'app</strong>
            <p>Appuyez sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong></p>
          </div>
        </div>
        <button
          type="button"
          className="install-banner-close"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    )
  }

  if (!deferredPrompt) return null

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-banner-icon">📲</span>
        <div className="install-banner-text">
          <strong>Installer l'app</strong>
          <p>Accès rapide depuis votre écran d'accueil</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <Button
          variant="primary"
          size="small"
          onClick={handleInstall}
          disabled={isInstalling}
        >
          {isInstalling ? 'Installation...' : 'Installer'}
        </Button>
        <button
          type="button"
          className="install-banner-close"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
