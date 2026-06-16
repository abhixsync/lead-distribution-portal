/**
 * Unit tests for secret encryption at rest.
 *
 * @jest-environment node
 */

// Ensure a key is available before the module loads.
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-please-change'

import { encryptSecret, decryptSecret, isEncrypted } from '@/lib/crypto'

describe('crypto (secrets at rest)', () => {
  it('round-trips a value through encrypt → decrypt', () => {
    const secret = 'hubspot-access-token-abc123'
    const enc = encryptSecret(secret)
    expect(enc).not.toBe(secret)
    expect(decryptSecret(enc)).toBe(secret)
  })

  it('tags encrypted values and detects them', () => {
    const enc = encryptSecret('x')
    expect(enc.startsWith('enc:v1:')).toBe(true)
    expect(isEncrypted(enc)).toBe(true)
    expect(isEncrypted('plain')).toBe(false)
    expect(isEncrypted(null)).toBe(false)
  })

  it('passes through legacy plaintext unchanged (backward compatible)', () => {
    // A token stored before encryption was introduced has no prefix.
    expect(decryptSecret('legacy-plaintext-token')).toBe('legacy-plaintext-token')
  })

  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('rejects tampered ciphertext (auth tag)', () => {
    const enc = encryptSecret('secret')
    const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A')
    expect(() => decryptSecret(tampered)).toThrow()
  })
})
