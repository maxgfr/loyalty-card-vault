/**
 * WebRTC connection manager for P2P sync
 */

import { SyncError, SyncErrorCode } from './types'

/**
 * WebRTC configuration with public STUN servers
 */
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
}

/**
 * Data channel configuration for reliable, ordered messaging
 */
const DATA_CHANNEL_OPTIONS: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 10,
}

/**
 * Timeout for ICE gathering in milliseconds
 */
const ICE_GATHERING_TIMEOUT = 10000 // 10 seconds

/**
 * WebRTC connection manager
 */
export class WebRTCManager {
  private readonly config: RTCConfiguration
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private iceCandidates: RTCIceCandidateInit[] = []
  private onMessageCallback: ((data: string) => void) | null = null
  private onStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null
  private onDataChannelStateCallback: ((state: RTCDataChannelState) => void) | null = null

  constructor(config: RTCConfiguration = RTC_CONFIG) {
    this.config = config
    this.checkWebRTCSupport()
  }

  /**
   * Check if WebRTC is supported in current browser
   */
  private checkWebRTCSupport(): void {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new SyncError(
        'WebRTC is not supported in this browser',
        SyncErrorCode.WEBRTC_NOT_SUPPORTED
      )
    }
  }

  /**
   * Wait for ICE gathering to complete
   */
  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new SyncError('No peer connection', SyncErrorCode.DATA_CHANNEL_FAILED))
        return
      }

      const timeout = setTimeout(() => {
        reject(
          new SyncError(
            'ICE gathering timed out',
            SyncErrorCode.CONNECTION_TIMEOUT,
            true // recoverable
          )
        )
      }, ICE_GATHERING_TIMEOUT)

      const checkState = () => {
        if (!this.peerConnection) return

        if (this.peerConnection.iceGatheringState === 'complete') {
          clearTimeout(timeout)
          resolve()
        }
      }

      this.peerConnection.addEventListener('icegatheringstatechange', checkState)
      checkState() // Check immediately in case already complete
    })
  }

  /**
   * Setup event handlers for peer connection
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return

    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate.toJSON())
      }
    })

    this.peerConnection.addEventListener('connectionstatechange', () => {
      if (!this.peerConnection) return
      const state = this.peerConnection.connectionState

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(state)
      }

      // Handle connection failures
      if (state === 'failed') {
        this.handleConnectionFailed()
      }
    })

    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      if (!this.peerConnection) return
      const state = this.peerConnection.iceConnectionState

      if (state === 'failed') {
        this.handleConnectionFailed()
      }
    })
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailed(): void {
    throw new SyncError(
      'ICE connection failed. Both devices may be behind strict firewalls.',
      SyncErrorCode.ICE_CONNECTION_FAILED,
      true // recoverable
    )
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    channel.addEventListener('open', () => {
      if (this.onDataChannelStateCallback) {
        this.onDataChannelStateCallback('open')
      }
    })

    channel.addEventListener('close', () => {
      if (this.onDataChannelStateCallback) {
        this.onDataChannelStateCallback('closed')
      }
    })

    channel.addEventListener('error', (event) => {
      throw new SyncError(
        `Data channel error: ${event}`,
        SyncErrorCode.DATA_CHANNEL_FAILED
      )
    })

    channel.addEventListener('message', (event) => {
      if (this.onMessageCallback && typeof event.data === 'string') {
        this.onMessageCallback(event.data)
      }
    })
  }

  /**
   * Create an offer (host side)
   * Returns SDP and ICE candidates
   */
  async createOffer(): Promise<{ sdp: string; candidates: RTCIceCandidateInit[] }> {
    try {
      this.peerConnection = new RTCPeerConnection(this.config)
      this.setupPeerConnectionHandlers()

      // Create data channel
      this.dataChannel = this.peerConnection.createDataChannel('sync', DATA_CHANNEL_OPTIONS)
      this.setupDataChannel(this.dataChannel)

      // Create and set local offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Wait for ICE candidates
      await this.waitForIceGathering()

      return {
        sdp: this.peerConnection.localDescription!.sdp,
        candidates: this.iceCandidates,
      }
    } catch (error) {
      this.close()
      throw error instanceof SyncError
        ? error
        : new SyncError(
            `Failed to create offer: ${error instanceof Error ? error.message : 'Unknown error'}`,
            SyncErrorCode.DATA_CHANNEL_FAILED
          )
    }
  }

  /**
   * Create an answer (guest side)
   * Accepts offer SDP and candidates, returns answer SDP and candidates
   */
  async createAnswer(
    offerSdp: string,
    offerCandidates: RTCIceCandidateInit[]
  ): Promise<{ sdp: string; candidates: RTCIceCandidateInit[] }> {
    try {
      this.peerConnection = new RTCPeerConnection(this.config)
      this.setupPeerConnectionHandlers()

      // Handle incoming data channel
      this.peerConnection.addEventListener('datachannel', (event) => {
        this.dataChannel = event.channel
        this.setupDataChannel(this.dataChannel)
      })

      // Set remote offer
      await this.peerConnection.setRemoteDescription({
        type: 'offer',
        sdp: offerSdp,
      })

      // Add ICE candidates
      for (const candidate of offerCandidates) {
        await this.peerConnection.addIceCandidate(candidate)
      }

      // Create and set local answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Wait for ICE candidates
      await this.waitForIceGathering()

      return {
        sdp: this.peerConnection.localDescription!.sdp,
        candidates: this.iceCandidates,
      }
    } catch (error) {
      this.close()
      throw error instanceof SyncError
        ? error
        : new SyncError(
            `Failed to create answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
            SyncErrorCode.DATA_CHANNEL_FAILED
          )
    }
  }

  /**
   * Accept answer (host side)
   * Accepts answer SDP and candidates to complete connection
   */
  async acceptAnswer(
    answerSdp: string,
    answerCandidates: RTCIceCandidateInit[]
  ): Promise<void> {
    try {
      if (!this.peerConnection) {
        throw new SyncError('No peer connection', SyncErrorCode.DATA_CHANNEL_FAILED)
      }

      // Set remote answer
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      })

      // Add ICE candidates
      for (const candidate of answerCandidates) {
        await this.peerConnection.addIceCandidate(candidate)
      }
    } catch (error) {
      this.close()
      throw error instanceof SyncError
        ? error
        : new SyncError(
            `Failed to accept answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
            SyncErrorCode.DATA_CHANNEL_FAILED
          )
    }
  }

  /**
   * Send a message through the data channel
   */
  send(data: string): void {
    if (!this.dataChannel) {
      throw new SyncError('Data channel not initialized', SyncErrorCode.DATA_CHANNEL_FAILED)
    }

    if (this.dataChannel.readyState !== 'open') {
      throw new SyncError(
        `Data channel not open (state: ${this.dataChannel.readyState})`,
        SyncErrorCode.DATA_CHANNEL_FAILED
      )
    }

    this.dataChannel.send(data)
  }

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (data: string) => void): void {
    this.onMessageCallback = callback
  }

  /**
   * Register callback for connection state changes
   */
  onStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onStateChangeCallback = callback
  }

  /**
   * Register callback for data channel state changes
   */
  onDataChannelStateChange(callback: (state: RTCDataChannelState) => void): void {
    this.onDataChannelStateCallback = callback
  }

  /**
   * Get current connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }

  /**
   * Get current data channel state
   */
  getDataChannelState(): RTCDataChannelState | null {
    return this.dataChannel?.readyState ?? null
  }

  /**
   * Close the connection and clean up resources
   */
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.iceCandidates = []
    this.onMessageCallback = null
    this.onStateChangeCallback = null
    this.onDataChannelStateCallback = null
  }
}
