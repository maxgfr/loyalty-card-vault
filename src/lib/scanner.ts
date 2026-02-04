import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import type { Result } from '@zxing/library'
import type { BarcodeFormat } from '../types'

export class BarcodeScanner {
  private reader: BrowserMultiFormatReader
  private videoElement: HTMLVideoElement | null = null
  private isScanning = false
  private controls: IScannerControls | null = null

  constructor() {
    this.reader = new BrowserMultiFormatReader()
  }

  async startScanning(
    videoElement: HTMLVideoElement,
    onResult: (result: Result) => void,
    onError: (error: Error) => void,
    deviceId?: string
  ): Promise<void> {
    this.videoElement = videoElement
    this.isScanning = true

    const callback = (result: Result | undefined, error: Error | undefined) => {
      if (this.isScanning && result) {
        onResult(result)
      }
      if (error) {
        const isExpectedError =
          error.name === 'NotFoundException' ||
          error.message?.includes('No MultiFormat Readers')

        if (!isExpectedError) {
          onError(error as Error)
        }
      }
    }

    try {
      if (deviceId) {
        this.controls = await this.reader.decodeFromVideoDevice(deviceId, videoElement, callback)
      } else {
        // No explicit device selected: use constraints so the browser picks the right camera.
        // On mobile this requests the back camera via facingMode; on desktop it uses the default.
        const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)
        const constraints: MediaStreamConstraints = {
          video: isMobile ? { facingMode: { ideal: 'environment' } } : true,
        }
        this.controls = await this.reader.decodeFromConstraints(constraints, videoElement, callback)
      }
    } catch (error) {
      onError(error as Error)
    }
  }

  stopScanning(): void {
    this.isScanning = false
    if (this.controls) {
      this.controls.stop()
      this.controls = null
    }

    if (this.videoElement) {
      const stream = this.videoElement.srcObject as MediaStream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      this.videoElement.srcObject = null
    }
  }

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'videoinput')
  }
}

export function mapZXingFormat(format: string): BarcodeFormat {
  const formatMap: Record<string, BarcodeFormat> = {
    'QR_CODE': 'QR_CODE',
    'EAN_13': 'EAN_13',
    'EAN_8': 'EAN_8',
    'CODE_128': 'CODE_128',
    'CODE_39': 'CODE_39',
    'UPC_A': 'UPC_A',
    'UPC_E': 'UPC_E',
    'ITF': 'ITF',
    'CODABAR': 'CODABAR',
    'DATA_MATRIX': 'DATA_MATRIX',
  }

  return formatMap[format] || 'QR_CODE'
}
