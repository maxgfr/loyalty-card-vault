import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'
import { BarcodeScanner, mapZXingFormat } from '../lib/scanner'
import type { ScanResult } from '../types'

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const scannerRef = useRef<BarcodeScanner | null>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning()
      }
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)
      return true
    } catch (err) {
      setHasPermission(false)
      setError('Camera permission denied')
      return false
    }
  }, [])

  const startScanning = useCallback(async (videoRef: RefObject<HTMLVideoElement | null>) => {
    if (!videoRef.current) {
      setError('Video element not available')
      return
    }

    try {
      const granted = await requestPermission()
      if (!granted) return

      scannerRef.current = new BarcodeScanner()
      setIsScanning(true)
      setError(null)

      await scannerRef.current.startScanning(
        videoRef.current,
        (result) => {
          const scanResult: ScanResult = {
            text: result.getText(),
            format: mapZXingFormat(result.getBarcodeFormat().toString()),
            timestamp: Date.now(),
          }
          setLastResult(scanResult)
          stopScanning()
        },
        (err) => {
          setError(err.message)
        }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scanning')
      setIsScanning(false)
    }
  }, [requestPermission])

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning()
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  return {
    isScanning,
    hasPermission,
    error,
    lastResult,
    startScanning,
    stopScanning,
    requestPermission,
  }
}
