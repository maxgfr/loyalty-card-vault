import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto'

/**
 * A passkey on this device's platform authenticator (Touch ID, Face ID, fingerprint, device PIN),
 * used only for its PRF output (WebAuthn `prf` extension): a secret the authenticator returns
 * after user verification, the same for the same credential and salt, that seals the vault key.
 * Nothing is sent to a server: the challenge is random and the signature is never checked.
 */

const APP_NAME = 'Loyalty Card Vault'
const TIMEOUT_MS = 60_000

/** The browser or authenticator does not support the `prf` extension. */
export class PasskeyUnsupportedError extends Error {
  constructor() {
    super('This browser cannot unlock with a passkey')
    this.name = 'PasskeyUnsupportedError'
  }
}

/** The person dismissed the prompt, or it timed out. */
export class PasskeyCancelledError extends Error {
  constructor() {
    super('The passkey prompt was dismissed')
    this.name = 'PasskeyCancelledError'
  }
}

/** Whether this device has a user-verifying platform authenticator a passkey can live on. */
export async function isPasskeyAvailable(): Promise<boolean> {
  try {
    return (
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    )
  } catch {
    return false
  }
}

function rethrow(error: unknown): never {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
    throw new PasskeyCancelledError()
  }
  throw error
}

function toArrayBuffer(source: BufferSource): ArrayBuffer {
  if (source instanceof ArrayBuffer) return source
  const view = new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
  return view.slice().buffer
}

function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Creates a passkey and returns its id and PRF output for `prfSalt`. Some browsers only evaluate
 * the PRF on sign-in: a second prompt then follows.
 * @throws PasskeyUnsupportedError, PasskeyCancelledError
 */
export async function createPasskey(prfSalt: ArrayBuffer): Promise<{ credentialId: string; prfOutput: ArrayBuffer }> {
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        rp: { name: APP_NAME },
        user: { id: random(16), name: APP_NAME, displayName: APP_NAME },
        challenge: random(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: TIMEOUT_MS,
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    })) as PublicKeyCredential | null
  } catch (error) {
    rethrow(error)
  }
  if (!credential) throw new PasskeyCancelledError()

  const prf = credential.getClientExtensionResults().prf
  if (!prf || (prf.enabled === false && !prf.results)) throw new PasskeyUnsupportedError()

  const credentialId = arrayBufferToBase64(credential.rawId)
  const first = prf.results?.first
  return { credentialId, prfOutput: first ? toArrayBuffer(first) : await getPrfOutput(credentialId, prfSalt) }
}

/**
 * Asks for the passkey (biometrics or device PIN) and returns its PRF output for `prfSalt`.
 * @throws PasskeyUnsupportedError, PasskeyCancelledError
 */
export async function getPrfOutput(credentialId: string, prfSalt: ArrayBuffer): Promise<ArrayBuffer> {
  let assertion: PublicKeyCredential | null
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: 'public-key', id: base64ToArrayBuffer(credentialId) }],
        userVerification: 'required',
        timeout: TIMEOUT_MS,
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    })) as PublicKeyCredential | null
  } catch (error) {
    rethrow(error)
  }
  if (!assertion) throw new PasskeyCancelledError()

  const first = assertion.getClientExtensionResults().prf?.results?.first
  if (!first) throw new PasskeyUnsupportedError()
  return toArrayBuffer(first)
}
