import type { BackupData, EncryptedPayload, LoyaltyCard } from '../types'
import { getAllCards, importCardsRaw, vaultKdf } from './storage'
import { decrypt, seal, unseal } from './crypto'
import { validateBackup } from './validation'

/**
 * A backup is a JSON file (BackupData). New backups are always encrypted: `cards` is an
 * EncryptedPayload of the cards' JSON, AES-256-GCM under PBKDF2-SHA256(master password, salt,
 * iterations), so the master password opens it in any vault. Unencrypted backups of earlier
 * versions (`encrypted: false`, `cards` a plain array) can still be imported.
 */
export async function exportBackup(): Promise<Blob> {
  const cards = await getAllCards()
  const { key, salt, iterations } = vaultKdf()
  const sealed = await seal(key, JSON.stringify(cards))
  const payload: EncryptedPayload = { ...sealed, salt, iterations }

  const backupData: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    encrypted: true,
    cards: payload,
  }

  return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
}

export interface BackupImportResult {
  success: boolean
  cardCount: number
  /** The backup is encrypted under another password: ask for it and call again. */
  needsPassword?: boolean
  error?: string
}

/** Only real cards: older exports could hold records this version cannot read. */
function cardsIn(list: unknown[]): LoyaltyCard[] {
  return list.filter(
    (c): c is LoyaltyCard =>
      typeof c === 'object' && c !== null && 'id' in c && 'barcodeData' in c && 'name' in c
  )
}

async function openPayload(payload: EncryptedPayload, password?: string): Promise<string | null> {
  const { key, salt, iterations } = vaultKdf()
  // Exported from this vault: its key opens it without asking.
  if (payload.salt === salt && payload.iterations === iterations) {
    try {
      return await unseal(key, payload)
    } catch {
      // Same salt by chance only: try the password below
    }
  }
  if (!password) return null
  return decrypt(payload, password)
}

export async function importBackup(file: File, password?: string): Promise<BackupImportResult> {
  try {
    const text = await file.text()
    const backupData = validateBackup(JSON.parse(text))

    let list: unknown[]
    if (Array.isArray(backupData.cards)) {
      list = backupData.cards
    } else {
      const json = await openPayload(backupData.cards as EncryptedPayload, password)
      if (json === null) return { success: false, cardCount: 0, needsPassword: true }
      const parsed: unknown = JSON.parse(json)
      list = Array.isArray(parsed) ? parsed : []
    }

    const importedCount = await importCardsRaw(cardsIn(list))
    return { success: true, cardCount: importedCount }
  } catch (error) {
    return {
      success: false,
      cardCount: 0,
      needsPassword: password !== undefined && error instanceof Error && error.message.startsWith('Decryption failed'),
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
