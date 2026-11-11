/**
 * WebAuthn & Web Crypto Helper for Sienna
 * Enables biometric authentication (Face ID on iOS Safari, Touch ID on macOS, Windows Hello)
 */

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(window.location.origin + ':sienna:device-vault-key'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptVault(secret: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(salt)
  const enc = new TextEncoder()
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(secret)
  )
  const bundle = {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  }
  return JSON.stringify(bundle)
}

async function decryptVault(bundleStr: string): Promise<string> {
  const bundle = JSON.parse(bundleStr)
  const salt = base64ToBuffer(bundle.salt)
  const iv = base64ToBuffer(bundle.iv)
  const ciphertext = base64ToBuffer(bundle.ciphertext)
  const key = await deriveKey(salt)
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  )
  return new TextDecoder().decode(decrypted)
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return false
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function hasBiometricEnrollment(): boolean {
  if (typeof window === 'undefined') return false
  const credId = localStorage.getItem('sienna_bio_cred_id')
  const vault = localStorage.getItem('sienna_bio_vault')
  return Boolean(credId && vault)
}

export async function enrollBiometrics(password: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window not available' }
  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32))
    const userId = window.crypto.getRandomValues(new Uint8Array(16))

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        rp: {
          name: 'Sienna',
          id: window.location.hostname,
        },
        user: {
          id: userId as unknown as BufferSource,
          name: 'sienna',
          displayName: 'Sienna Admin',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    if (!credential) {
      return { success: false, error: 'Registration cancelled' }
    }

    const vault = await encryptVault(password)
    localStorage.setItem('sienna_bio_vault', vault)
    localStorage.setItem('sienna_bio_cred_id', bufferToBase64(credential.rawId))
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Biometric enrollment failed'
    return { success: false, error: message }
  }
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; password?: string; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window not available' }
  try {
    const credIdBase64 = localStorage.getItem('sienna_bio_cred_id')
    const vaultStr = localStorage.getItem('sienna_bio_vault')
    if (!credIdBase64 || !vaultStr) {
      return { success: false, error: 'No biometrics enrolled' }
    }

    const rawId = base64ToBuffer(credIdBase64)
    const challenge = window.crypto.getRandomValues(new Uint8Array(32))

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        allowCredentials: [
          {
            id: rawId as unknown as BufferSource,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (!assertion) {
      return { success: false, error: 'Authentication cancelled' }
    }

    const recoveredPassword = await decryptVault(vaultStr)
    return { success: true, password: recoveredPassword }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Biometric authentication failed'
    return { success: false, error: message }
  }
}

export function clearBiometrics(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('sienna_bio_cred_id')
  localStorage.removeItem('sienna_bio_vault')
}
