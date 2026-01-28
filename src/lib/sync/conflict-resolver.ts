/**
 * Conflict resolution logic for sync protocol
 * Uses last-write-wins strategy based on updatedAt timestamps
 */

import type { LoyaltyCard } from '../../types'
import type { CardSummary, SyncAction } from './types'

/**
 * Resolve conflict between two cards with the same ID
 * Uses last-write-wins strategy: the card with newer updatedAt wins
 * If timestamps are equal, local wins (bias towards keeping local data)
 */
export function resolveCardConflict(local: LoyaltyCard, remote: LoyaltyCard): LoyaltyCard {
  if (remote.updatedAt > local.updatedAt) {
    return remote
  }
  return local
}

/**
 * Compute sync actions by comparing local and remote card manifests
 * Returns which cards need to be sent, requested, and conflict count
 */
export function computeSyncActions(
  localManifest: readonly CardSummary[],
  remoteManifest: readonly CardSummary[]
): SyncAction {
  // Convert to maps for efficient lookup (use first occurrence for duplicates)
  const localMap = new Map<string, CardSummary>()
  for (const card of localManifest) {
    if (!localMap.has(card.id)) {
      localMap.set(card.id, card)
    }
  }

  const remoteMap = new Map<string, CardSummary>()
  for (const card of remoteManifest) {
    if (!remoteMap.has(card.id)) {
      remoteMap.set(card.id, card)
    }
  }

  const toSend: string[] = []
  const toRequest: string[] = []
  let conflicts = 0

  // Check cards only in local -> send to remote
  for (const [id] of localMap) {
    if (!remoteMap.has(id)) {
      toSend.push(id)
    }
  }

  // Check cards only in remote -> request from remote
  for (const [id] of remoteMap) {
    if (!localMap.has(id)) {
      toRequest.push(id)
    }
  }

  // Check cards in both -> compare timestamps (last-write-wins)
  for (const [id, local] of localMap) {
    const remote = remoteMap.get(id)
    if (!remote) continue

    if (local.updatedAt > remote.updatedAt) {
      // Local is newer -> send to remote
      toSend.push(id)
      conflicts++
    } else if (remote.updatedAt > local.updatedAt) {
      // Remote is newer -> request from remote
      toRequest.push(id)
      conflicts++
    }
    // Equal timestamps: no action needed (already in sync)
  }

  return {
    toSend,
    toRequest,
    conflicts,
  }
}
