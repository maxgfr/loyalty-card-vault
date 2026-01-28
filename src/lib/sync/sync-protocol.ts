/**
 * Sync protocol state machine
 * Orchestrates the entire synchronization flow
 */

import type { LoyaltyCard } from '../../types'
import type {
  SyncMessage,
  SyncState,
  CardSummary,
  SyncProgress,
  SyncStats,
  HelloPayload,
  CardListPayload,
  RequestCardsPayload,
  CardDataPayload,
} from './types'
import { SyncError, SyncErrorCode } from './types'
import {
  createHelloMessage,
  createCardListMessage,
  createRequestCardsMessage,
  createCardDataMessage,
  createCompleteMessage,
  createErrorMessage,
  createPongMessage,
} from './sync-messages'
import { computeSyncActions } from './conflict-resolver'
import { PROTOCOL_VERSION } from './schemas'

interface SyncProtocolConfig {
  readonly deviceId: string
  readonly cards: readonly LoyaltyCard[]
  readonly encryptionEnabled: boolean
}

/**
 * Sync protocol state machine
 */
export class SyncProtocol {
  private state: SyncState = 'idle'
  private readonly deviceId: string
  private readonly encryptionEnabled: boolean
  private cards: Map<string, LoyaltyCard>

  // Sync tracking
  private cardsToSend: string[] = []
  private cardsToRequest: string[] = []
  private cardsSent = 0
  private cardsReceived = 0
  private conflicts = 0
  private startTime = 0

  // Callbacks
  public onOutgoingMessage: ((message: SyncMessage) => void) | null = null
  public onCardReceived: ((card: LoyaltyCard) => void) | null = null
  public onProgress: ((progress: SyncProgress) => void) | null = null
  public onComplete: (() => void) | null = null
  public onError: ((error: Error) => void) | null = null

  constructor(config: SyncProtocolConfig) {
    this.deviceId = config.deviceId
    this.encryptionEnabled = config.encryptionEnabled
    this.cards = new Map(config.cards.map((card) => [card.id, card]))
  }

  /**
   * Get current state
   */
  public getState(): SyncState {
    return this.state
  }

  /**
   * Get device ID
   */
  public getDeviceId(): string {
    return this.deviceId
  }

  /**
   * Check if encryption is enabled
   */
  public isEncryptionEnabled(): boolean {
    return this.encryptionEnabled
  }

  /**
   * Start sync protocol
   */
  public start(): void {
    if (this.state !== 'idle') {
      this.handleError(
        new SyncError('Sync already started', SyncErrorCode.INVALID_MESSAGE, false)
      )
      return
    }

    this.startTime = Date.now()
    this.setState('exchanging_hello')
    this.sendHello()
  }

  /**
   * Handle incoming message
   */
  public handleMessage(message: SyncMessage): void {
    try {
      switch (message.type) {
        case 'hello':
          this.handleHello(message.payload as HelloPayload)
          break
        case 'card-list':
          this.handleCardList(message.payload as CardListPayload)
          break
        case 'request-cards':
          this.handleRequestCards(message.payload as RequestCardsPayload)
          break
        case 'card-data':
          this.handleCardData(message.payload as CardDataPayload)
          break
        case 'complete':
          this.handleComplete()
          break
        case 'error':
          this.handleRemoteError(message.payload)
          break
        case 'ping':
          this.handlePing()
          break
        case 'pong':
          // Keep-alive response, no action needed
          break
        default:
          this.handleError(
            new SyncError(
              `Unknown message type: ${message.type}`,
              SyncErrorCode.INVALID_MESSAGE,
              false
            )
          )
      }
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Unknown error handling message')
      )
    }
  }

  /**
   * Handle hello message
   */
  private handleHello(payload: HelloPayload): void {
    if (this.state !== 'exchanging_hello') {
      this.handleError(
        new SyncError(
          'Received hello in wrong state',
          SyncErrorCode.INVALID_MESSAGE,
          false
        )
      )
      return
    }

    // Check protocol version
    if (payload.protocolVersion !== PROTOCOL_VERSION) {
      this.handleError(
        new SyncError(
          `Protocol version mismatch: ${payload.protocolVersion} vs ${PROTOCOL_VERSION}`,
          SyncErrorCode.PROTOCOL_VERSION_MISMATCH,
          false
        )
      )
      return
    }

    // Check encryption compatibility
    if (payload.encryptionEnabled !== this.encryptionEnabled) {
      this.handleError(
        new SyncError(
          'Encryption settings mismatch between devices',
          SyncErrorCode.ENCRYPTION_MISMATCH,
          false
        )
      )
      return
    }

    this.setState('exchanging_manifests')
    this.sendCardList()
  }

  /**
   * Handle card-list message
   */
  private handleCardList(payload: CardListPayload): void {
    if (this.state !== 'exchanging_manifests') {
      this.handleError(
        new SyncError(
          'Received card-list in wrong state',
          SyncErrorCode.INVALID_MESSAGE,
          false
        )
      )
      return
    }

    const localManifest: CardSummary[] = Array.from(this.cards.values()).map(
      (card) => ({
        id: card.id,
        updatedAt: card.updatedAt,
      })
    )

    const remoteManifest = payload.cards

    // Compute sync actions
    const actions = computeSyncActions(localManifest, remoteManifest)
    this.cardsToSend = [...actions.toSend]
    this.cardsToRequest = [...actions.toRequest]
    this.conflicts = actions.conflicts

    // Send cards that remote needs
    if (this.cardsToSend.length > 0) {
      this.setState('sending_cards')
      const cardsToSendData = this.cardsToSend
        .map((id) => this.cards.get(id))
        .filter((card): card is LoyaltyCard => card !== undefined)

      this.sendCards(cardsToSendData)
      this.cardsSent = cardsToSendData.length
      this.updateProgress()
    }

    // Request cards we need
    if (this.cardsToRequest.length > 0) {
      this.setState('requesting_cards')
      this.sendRequestCards(this.cardsToRequest)
    }

    // If nothing to sync, we're done
    if (this.cardsToSend.length === 0 && this.cardsToRequest.length === 0) {
      this.completeSync()
    }
  }

  /**
   * Handle request-cards message
   */
  private handleRequestCards(payload: RequestCardsPayload): void {
    const requestedCards = payload.ids
      .map((id) => this.cards.get(id))
      .filter((card): card is LoyaltyCard => card !== undefined)

    if (requestedCards.length > 0) {
      this.sendCards(requestedCards)
      this.cardsSent += requestedCards.length
      this.updateProgress()
    }
  }

  /**
   * Handle card-data message
   */
  private handleCardData(payload: CardDataPayload): void {
    if (
      this.state !== 'requesting_cards' &&
      this.state !== 'sending_cards' &&
      this.state !== 'applying_changes'
    ) {
      this.handleError(
        new SyncError(
          'Received card-data in wrong state',
          SyncErrorCode.INVALID_MESSAGE,
          false
        )
      )
      return
    }

    if (this.state !== 'applying_changes') {
      this.setState('applying_changes')
    }

    // Process received cards
    for (const card of payload.cards) {
      if ('iv' in card && 'data' in card) {
        // Encrypted card - can't process without decryption
        // In a real implementation, would decrypt here
        continue
      }

      const loyaltyCard = card as LoyaltyCard

      // Apply card
      this.cards.set(loyaltyCard.id, loyaltyCard)
      this.cardsReceived++

      // Notify callback
      if (this.onCardReceived) {
        this.onCardReceived(loyaltyCard)
      }
    }

    this.updateProgress()

    // Check if we're done
    if (this.cardsReceived >= this.cardsToRequest.length) {
      this.completeSync()
    }
  }

  /**
   * Handle complete message from remote
   */
  private handleComplete(): void {
    if (this.state === 'complete') {
      // Already complete
      return
    }

    this.completeSync()
  }

  /**
   * Handle error from remote
   */
  private handleRemoteError(payload: unknown): void {
    const errorPayload = payload as { code: string; message: string; recoverable: boolean }
    this.handleError(new Error(`Remote error: ${errorPayload.message}`))
  }

  /**
   * Handle ping message
   */
  private handlePing(): void {
    this.sendMessage(createPongMessage())
  }

  /**
   * Complete sync
   */
  private completeSync(): void {
    this.setState('complete')

    const stats: SyncStats = {
      sent: this.cardsSent,
      received: this.cardsReceived,
      conflicts: this.conflicts,
      errors: 0,
      duration: Date.now() - this.startTime,
    }

    this.sendMessage(createCompleteMessage(stats))

    if (this.onComplete) {
      this.onComplete()
    }
  }

  /**
   * Send hello message
   */
  private sendHello(): void {
    const message = createHelloMessage(
      this.deviceId,
      this.cards.size,
      this.encryptionEnabled
    )
    this.sendMessage(message)
  }

  /**
   * Send card list message
   */
  private sendCardList(): void {
    const cardSummaries: CardSummary[] = Array.from(this.cards.values()).map(
      (card) => ({
        id: card.id,
        updatedAt: card.updatedAt,
      })
    )

    const message = createCardListMessage(cardSummaries)
    this.sendMessage(message)
  }

  /**
   * Send request cards message
   */
  private sendRequestCards(ids: string[]): void {
    const message = createRequestCardsMessage(ids)
    this.sendMessage(message)
  }

  /**
   * Send cards data message
   */
  private sendCards(cards: LoyaltyCard[]): void {
    const message = createCardDataMessage(cards, this.encryptionEnabled)
    this.sendMessage(message)
  }

  /**
   * Send message via callback
   */
  private sendMessage(message: SyncMessage): void {
    if (this.onOutgoingMessage) {
      this.onOutgoingMessage(message)
    }
  }

  /**
   * Update state
   */
  private setState(newState: SyncState): void {
    this.state = newState
  }

  /**
   * Update progress
   */
  private updateProgress(): void {
    if (!this.onProgress) return

    const total = this.cardsToSend.length + this.cardsToRequest.length
    const completed = this.cardsSent + this.cardsReceived

    const progress: SyncProgress = {
      sent: this.cardsSent,
      received: this.cardsReceived,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
    }

    this.onProgress(progress)
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error)
    }

    // Send error message to remote
    if (error instanceof SyncError) {
      const message = createErrorMessage(error.code, error.message, error.recoverable)
      this.sendMessage(message)
    }
  }
}
