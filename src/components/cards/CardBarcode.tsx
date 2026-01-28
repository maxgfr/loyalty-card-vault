import { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'
import type { BarcodeFormat } from '../../types'
import './CardBarcode.css'

interface CardBarcodeProps {
  data: string
  format: BarcodeFormat
  scale?: number
}

const formatMap: Record<BarcodeFormat, string> = {
  QR_CODE: 'qrcode',
  EAN_13: 'ean13',
  EAN_8: 'ean8',
  CODE_128: 'code128',
  CODE_39: 'code39',
  UPC_A: 'upca',
  UPC_E: 'upce',
  ITF: 'interleaved2of5',
  CODABAR: 'rationalizedCodabar',
  DATA_MATRIX: 'datamatrix',
}

export function CardBarcode({ data, format, scale = 3 }: CardBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data) return

    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: formatMap[format] || 'qrcode',
        text: data,
        scale,
        height: format === 'QR_CODE' || format === 'DATA_MATRIX' ? 10 : 15,
        includetext: true,
        textxalign: 'center',
      })
    } catch (error) {
      console.error('Failed to generate barcode:', error)
    }
  }, [data, format, scale])

  return (
    <div className="barcode-container">
      <canvas ref={canvasRef} className="barcode-canvas" />
    </div>
  )
}
