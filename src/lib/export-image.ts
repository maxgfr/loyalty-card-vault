import type { LoyaltyCard } from '../types'
import bwipjs from 'bwip-js'

/**
 * Export a loyalty card as a PNG image
 */
export async function exportCardAsImage(card: LoyaltyCard): Promise<void> {
  try {
    // Create a canvas for the card
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    // Card dimensions
    const width = 800
    const height = 500
    const padding = 40
    const cornerRadius = 20

    canvas.width = width
    canvas.height = height

    // Draw card background with rounded corners
    ctx.fillStyle = card.color
    drawRoundedRect(ctx, 0, 0, width, height, cornerRadius)
    ctx.fill()

    // Add subtle gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)')
    ctx.fillStyle = gradient
    drawRoundedRect(ctx, 0, 0, width, height, cornerRadius)
    ctx.fill()

    // Draw card name
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 2
    ctx.fillText(card.name, padding, padding + 36)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // Draw store name if exists
    if (card.storeName) {
      ctx.font = '24px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillText(card.storeName, padding, padding + 72)
    }

    // Generate barcode
    const barcodeCanvas = document.createElement('canvas')
    const barcodeFormat = mapBarcodeFormat(card.barcodeFormat)

    try {
      bwipjs.toCanvas(barcodeCanvas, {
        bcid: barcodeFormat,
        text: card.barcodeData,
        scale: 3,
        height: 15,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
      })

      // Draw white background for barcode
      const barcodeWidth = barcodeCanvas.width
      const barcodeHeight = barcodeCanvas.height
      const barcodeX = (width - barcodeWidth) / 2
      const barcodeY = height - barcodeHeight - padding

      ctx.fillStyle = '#FFFFFF'
      const barcodePadding = 20
      drawRoundedRect(
        ctx,
        barcodeX - barcodePadding,
        barcodeY - barcodePadding,
        barcodeWidth + barcodePadding * 2,
        barcodeHeight + barcodePadding * 2,
        10
      )
      ctx.fill()

      // Draw barcode
      ctx.drawImage(barcodeCanvas, barcodeX, barcodeY)
    } catch (error) {
      // If barcode generation fails, just show the text
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(card.barcodeData, width / 2, height - padding)
      ctx.textAlign = 'left'
    }

    // Draw notes if exists (small text at bottom left)
    if (card.notes) {
      ctx.font = '14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      const maxWidth = width - padding * 2
      const lines = wrapText(ctx, card.notes, maxWidth)
      lines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, padding, height - 180 - (i * 20))
      })
    }

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Failed to create image')

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `${card.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-card.png`
      link.download = fileName
      link.href = url
      link.click()

      // Cleanup
      URL.revokeObjectURL(url)
    }, 'image/png')
  } catch (error) {
    throw new Error(`Failed to export card: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Wrap text to fit within a maximum width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}

/**
 * Map our barcode format to bwip-js format
 */
function mapBarcodeFormat(format: string): string {
  const mapping: Record<string, string> = {
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
  return mapping[format] || 'code128'
}
