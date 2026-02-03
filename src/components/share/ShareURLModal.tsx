import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import './ShareURLModal.css'

interface ShareURLModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  password: string
}

export function ShareURLModal({ isOpen, onClose, url, password }: ShareURLModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isOpen && url && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }).catch((err) => {
        console.error('Failed to generate QR code:', err)
      })
    }
  }, [isOpen, url])

  const copyToClipboard = async (text: string, type: 'url' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedPassword(true)
        setTimeout(() => setCopiedPassword(false), 2000)
      }
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        if (type === 'url') {
          setCopiedUrl(true)
          setTimeout(() => setCopiedUrl(false), 2000)
        } else {
          setCopiedPassword(true)
          setTimeout(() => setCopiedPassword(false), 2000)
        }
      } catch {
        console.error('Failed to copy')
      }
      document.body.removeChild(textarea)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Cards"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="share-url-modal">
        <div className="share-url-modal-info">
          <p className="share-url-modal-description">
            Share this URL and password with the recipient. They will need both to access the shared cards.
          </p>
        </div>

        <div className="share-url-modal-field">
          <label className="share-url-modal-label">Password</label>
          <div className="share-url-modal-password">
            <code className="share-url-modal-password-text">{password}</code>
            <Button
              variant="secondary"
              size="small"
              onClick={() => copyToClipboard(password, 'password')}
            >
              {copiedPassword ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
          <p className="share-url-modal-hint">
            Share this password separately via a secure channel (message, email, etc.)
          </p>
        </div>

        <div className="share-url-modal-field">
          <label className="share-url-modal-label">Share URL</label>
          <div className="share-url-modal-url">
            <Input
              value={url}
              readOnly
              fullWidth
              className="share-url-modal-url-input"
            />
            <Button
              variant="secondary"
              size="small"
              onClick={() => copyToClipboard(url, 'url')}
            >
              {copiedUrl ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="share-url-modal-qr">
          <label className="share-url-modal-label">QR Code</label>
          <div className="share-url-modal-qr-container">
            <canvas ref={qrCanvasRef} className="share-url-modal-qr-canvas" />
          </div>
          <p className="share-url-modal-qr-hint">
            💡 Scan this QR code to share the URL quickly
          </p>
        </div>
      </div>
    </Modal>
  )
}
