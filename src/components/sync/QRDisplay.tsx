/**
 * QR Code display component for signaling data
 */

import { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'

interface QRDisplayProps {
  data: string
  size?: number
  label?: string
}

/**
 * Display QR code for WebRTC signaling
 */
export function QRDisplay({ data, size = 300, label }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data) return

    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'qrcode',
        text: data,
        scale: 3,
        width: size / 3,
        height: size / 3,
        includetext: false,
      })
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }, [data, size])

  if (!data) {
    return null
  }

  return (
    <div className="qr-display">
      {label && <p className="qr-label">{label}</p>}
      <div className="qr-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
