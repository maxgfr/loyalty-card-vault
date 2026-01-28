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

  const handleStart = async () => {
    await startScanning(videoRef)
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

        {hasPermission && !isScanning && (
          <div className="scanner-prompt">
            {cameras.length > 1 && (
              <div className="scanner-camera-select">
                <label htmlFor="camera-select">Select Camera:</label>
                <select
                  id="camera-select"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="camera-select-dropdown"
                >
                  {cameras.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={handleStart} variant="primary">
              Start Scanning
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="scanner-view">
            <video ref={videoRef} className="scanner-video" playsInline />
            <div className="scanner-overlay">
              <div className="scanner-frame" />
            </div>
            <Button onClick={stopScanning} variant="secondary" className="scanner-stop">
              Stop Scanning
            </Button>
          </div>
        )}

        {error && <p className="scanner-error-message">{error}</p>}
      </div>
    </div>
  )
}
