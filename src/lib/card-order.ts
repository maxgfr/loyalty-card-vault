import type { LoyaltyCard } from '../types'

/**
 * Timestamp of the latest activity on a card: opened, created or edited
 */
function lastActivity(card: LoyaltyCard): number {
  return Math.max(card.lastUsedAt ?? 0, card.updatedAt)
}

/**
 * Sort cards so the most recently used come first
 */
export function sortByRecentUse(cards: LoyaltyCard[]): LoyaltyCard[] {
  return [...cards].sort((a, b) => lastActivity(b) - lastActivity(a))
}
