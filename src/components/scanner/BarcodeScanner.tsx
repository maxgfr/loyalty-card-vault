import { useRef, useEffect } from 'react'
import { useScanner } from '../../hooks/useScanner'
import type { ScanResult } from '../../types'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import './BarcodeScanner.css'

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isScanning, hasPermission, error, lastResult, cameras, selectedCamera, setSelectedCamera, startScanning, stopScanning, requestPermission } = useScanner()

  useEffect(() => {
    if (lastResult) {
      onScan(lastResult)
    }
  }, [lastResult, onScan])

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  // Auto-start scanning when permission is granted and camera is selected
  useEffect(() => {
    if (hasPermission && selectedCamera && !isScanning && videoRef.current) {
      startScanning(videoRef)
    }
  }, [hasPermission, selectedCamera, isScanning, startScanning])

  const handleCameraChange = async (newCameraId: string) => {
    const wasScanning = isScanning
    if (wasScanning) {
      stopScanning()
    }
    setSelectedCamera(newCameraId)
    // Scanning will auto-restart via the useEffect above
  }

  return (
    <div className="scanner">
      <Header title="Scan Barcode" onBack={onClose} />

      <div className="scanner-content">
        {hasPermission === null && (
          <div className="scanner-prompt">
            <p>Camera access is required to scan barcodes</p>
            <Button onClick={requestPermission}>Grant Permission</Button>
          </div>
        )}

        {hasPermission === false && (
          <div className="scanner-error">
            <p>Camera permission denied</p>
            <p className="scanner-error-hint">
              Please enable camera access in your browser settings
            </p>
          </div>
        )}

        {hasPermission && (
          <div className="scanner-view">
            <video ref={videoRef} className="scanner-video" playsInline />
            {isScanning && (
              <>
                <div className="scanner-overlay">
                  <div className="scanner-frame" />
                </div>
                {cameras.length > 1 && (
                  <div className="scanner-camera-overlay">
                    <select
                      value={selectedCamera}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="camera-select-overlay"
                    >
                      {cameras.map(camera => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button onClick={stopScanning} variant="danger" className="scanner-stop">
                  ⏹️ Stop
                </Button>
              </>
            )}
          </div>
        )}

        {error && <p className="scanner-error-message">{error}</p>}
      </div>
    </div>
  )
}
