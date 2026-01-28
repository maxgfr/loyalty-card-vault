import type { BackupData, LoyaltyCard } from '../types'
import { getAllCardsRaw, importCardsRaw, isEncryptionEnabled } from './storage'
import { encrypt } from './crypto'
import { validateBackup } from './validation'

export async function exportBackup(password?: string): Promise<Blob> {
  const cards = await getAllCardsRaw()
  const encrypted = await isEncryptionEnabled()

  let backupData: BackupData

  if (encrypted && password) {
    // Export as encrypted backup
    const cardsJson = JSON.stringify(cards)
    const encryptedCards = await encrypt(cardsJson, password)

    backupData = {
      version: 1,
      exportedAt: Date.now(),
      encrypted: true,
      cards: encryptedCards,
    }
  } else {
    // Export as unencrypted backup
    backupData = {
      version: 1,
      exportedAt: Date.now(),
      encrypted: false,
      cards: cards as LoyaltyCard[],
    }
  }

  return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
}

export async function importBackup(
  file: File,
  password?: string
): Promise<{ success: boolean; cardCount: number; error?: string }> {
  try {
    const text = await file.text()
    const backupData = JSON.parse(text)

    validateBackup(backupData)

    const importedCount = await importCardsRaw(
      Array.isArray(backupData.cards) ? backupData.cards : [backupData.cards],
      password
    )

    return { success: true, cardCount: importedCount }
  } catch (error) {
    return {
      success: false,
      cardCount: 0,
      error: error instanceof Error ? error.message : 'Failed to import backup',
    }
  }
}

export function downloadBackup(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `loyalty-cards-backup-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
