/**
 * Sync connection status indicator
 */

import type { ConnectionState } from '../../lib/sync/types'

interface SyncStatusProps {
  state: ConnectionState
  error?: string | null
}

const STATUS_CONFIG: Record<
  ConnectionState,
  { label: string; color: string; description: string }
> = {
  idle: {
    label: 'Idle',
    color: '#666',
    description: 'Ready to start sync',
  },
  creating_offer: {
    label: 'Preparing...',
    color: '#0ea5e9',
    description: 'Creating connection offer',
  },
  waiting_for_guest: {
    label: 'Waiting for Guest',
    color: '#0ea5e9',
    description: 'Show QR code to guest device',
  },
  processing_offer: {
    label: 'Processing...',
    color: '#0ea5e9',
    description: 'Processing connection offer',
  },
  waiting_for_host: {
    label: 'Waiting for Host',
    color: '#0ea5e9',
    description: 'Show QR code to host device',
  },
  connecting: {
    label: 'Connecting...',
    color: '#f59e0b',
    description: 'Establishing connection',
  },
  connected: {
    label: 'Connected',
    color: '#10b981',
    description: 'Connection established',
  },
  syncing: {
    label: 'Syncing...',
    color: '#8b5cf6',
    description: 'Synchronizing cards',
  },
  sync_complete: {
    label: 'Complete',
    color: '#10b981',
    description: 'Sync completed successfully',
  },
  disconnected: {
    label: 'Disconnected',
    color: '#ef4444',
    description: 'Connection lost',
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    description: 'Connection failed',
  },
}

/**
 * Display connection status with color indicator
 */
export function SyncStatus({ state, error }: SyncStatusProps) {
  const config = STATUS_CONFIG[state]

  return (
    <div className="sync-status">
      <div className="status-indicator">
        <div
          className="status-dot"
          style={{
            backgroundColor: config.color,
            animation:
              state === 'connecting' || state === 'syncing' ? 'pulse 2s infinite' : 'none',
          }}
        />
        <div className="status-text">
          <div className="status-label">{config.label}</div>
          <div className="status-description">
            {error || config.description}
          </div>
        </div>
      </div>
    </div>
  )
}
