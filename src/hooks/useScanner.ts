import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'
import { BarcodeScanner, mapZXingFormat } from '../lib/scanner'
import type { ScanResult } from '../types'

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)
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
      // Request back camera specifically on mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const constraints: MediaStreamConstraints = {
        video: isMobile ? { facingMode: { ideal: 'environment' } } : true
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)

      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameras(videoDevices)

      // On mobile, leave selectedCamera undefined so startScanning uses
      // facingMode: 'environment' (iOS returns empty labels until a stream is active,
      // making label-based back-camera detection unreliable).
      // On desktop, pick the first available device.
      if (!isMobile && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId)
      }

      return true
    } catch {
      setHasPermission(false)
      setError('Camera permission denied')
      return false
    }
  }, [])

  // Define stopScanning first using a ref to avoid circular dependency issues
  const stopScanningRef = useRef<() => void>(() => {})

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning()
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Update the ref whenever stopScanning changes
  useEffect(() => {
    stopScanningRef.current = stopScanning
  }, [stopScanning])

  const startScanning = useCallback(async (videoRef: RefObject<HTMLVideoElement | null>, cameraId?: string) => {
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

      const deviceId = cameraId || selectedCamera
      await scannerRef.current.startScanning(
        videoRef.current,
        (result) => {
          const scanResult: ScanResult = {
            text: result.getText(),
            format: mapZXingFormat(result.getBarcodeFormat().toString()),
            timestamp: Date.now(),
          }
          setLastResult(scanResult)
          stopScanningRef.current()
        },
        (scanError) => {
          setError(scanError.message)
        },
        deviceId
      )

      // Sync selectedCamera with the actual device in use.
      // On mobile, facingMode is used instead of an explicit deviceId so
      // selectedCamera stays undefined until we read it from the live stream.
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream
        const track = stream?.getVideoTracks()[0]
        const activeDeviceId = track?.getSettings().deviceId
        if (activeDeviceId) {
          setSelectedCamera(activeDeviceId)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scanning')
      setIsScanning(false)
    }
  }, [requestPermission, selectedCamera])

  return {
    isScanning,
    hasPermission,
    error,
    lastResult,
    cameras,
    selectedCamera,
    setSelectedCamera,
    startScanning,
    stopScanning,
    requestPermission,
  }
}
