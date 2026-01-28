/**
 * Sync progress display component
 */

import type { SyncProgress as SyncProgressType } from '../../lib/sync/types'

interface SyncProgressProps {
  progress: SyncProgressType
  show: boolean
}

/**
 * Display sync progress with bar and statistics
 */
export function SyncProgress({ progress, show }: SyncProgressProps) {
  if (!show) {
    return null
  }

  const { sent, received, total, percentage } = progress

  return (
    <div className="sync-progress">
      <div className="progress-header">
        <span className="progress-title">Syncing Cards</span>
        <span className="progress-percentage">{percentage}%</span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="progress-stats">
        <div className="progress-stat">
          <span className="stat-label">Sent</span>
          <span className="stat-value">{sent}</span>
        </div>
        <div className="progress-stat">
          <span className="stat-label">Received</span>
          <span className="stat-value">{received}</span>
        </div>
        <div className="progress-stat">
          <span className="stat-label">Total</span>
          <span className="stat-value">{total}</span>
        </div>
      </div>
    </div>
  )
}
