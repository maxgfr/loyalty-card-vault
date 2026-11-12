import { PasskeyCancelledError, PasskeyUnsupportedError } from '../../lib/passkey'
import { PasskeyMismatchError, WrongPasswordError } from '../../lib/storage'

/** What to tell the person when a passkey step fails; null when they dismissed the prompt. */
export function passkeyErrorMessage(error: unknown): string | null {
  if (error instanceof PasskeyCancelledError) return null
  if (error instanceof WrongPasswordError) return 'Wrong password'
  if (error instanceof PasskeyUnsupportedError) {
    return 'This browser cannot unlock with biometrics (it needs passkeys with the PRF extension: Safari or iOS 18+, Chrome 132+, Firefox 135+).'
  }
  if (error instanceof PasskeyMismatchError) {
    return 'This passkey no longer opens the vault. Use your password, then turn biometric unlock on again in Settings.'
  }
  return 'Biometric unlock failed. Please try again, or use your password.'
}
