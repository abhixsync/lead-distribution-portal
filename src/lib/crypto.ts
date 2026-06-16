import crypto from 'crypto'

/**
 * Symmetric encryption for secrets at rest (HubSpot OAuth tokens in the
 * Settings row). Uses AES-256-GCM, which is authenticated — tampering is
 * detected on decrypt.
 *
 * Key resolution (first wins):
 *   1. TOKEN_ENCRYPTION_KEY env var
 *   2. JWT_SECRET env var (already required by the app)
 * The string is hashed to a 32-byte key, so any sufficiently random value works.
 *
 * Backward compatibility: encrypted values are tagged with a version prefix.
 * decryptSecret() returns any UNprefixed value unchanged, so tokens written
 * before encryption was introduced keep working until they're next rotated.
 */

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'enc:v1:'
const IV_BYTES = 12
const TAG_BYTES = 16

function getKey(): Buffer {
  const material = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!material) {
    throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set to encrypt secrets')
  }
  return crypto.createHash('sha256').update(material).digest()
}

/** Encrypts a string and returns a self-describing `enc:v1:<base64>` token. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

/**
 * Decrypts a value produced by encryptSecret(). If the value is not prefixed
 * (legacy plaintext), it is returned as-is for backward compatibility.
 */
export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const data = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** True if the value is in the encrypted-at-rest format. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}
