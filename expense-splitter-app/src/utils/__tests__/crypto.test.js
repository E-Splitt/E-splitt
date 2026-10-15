import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, timingSafeEqual } from '../crypto';

describe('Argon2id crypto utility', () => {
  it('generates a valid Argon2id PHC formatted hash ($argon2id$v=19$m=4096,t=3,p=1$<salt>$<tag>)', async () => {
    const pin = '1234';
    const hash = await hashPin(pin);

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=4096,t=3,p=1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it('correctly verifies a matching PIN against generated Argon2id hash', async () => {
    const pin = '9876';
    const hash = await hashPin(pin);

    const isValid = await verifyPin(pin, hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect PIN against generated Argon2id hash', async () => {
    const pin = '4321';
    const hash = await hashPin(pin);

    const isValid = await verifyPin('0000', hash);
    expect(isValid).toBe(false);
  });

  it('handles empty or invalid inputs gracefully', async () => {
    expect(await verifyPin('', '$argon2id$v=19$m=4096,t=3,p=1$abc$def')).toBe(false);
    expect(await verifyPin('1234', '')).toBe(false);
    expect(await verifyPin(null, null)).toBe(false);
  });

  it('timingSafeEqual works accurately with constant-time comparison', () => {
    expect(timingSafeEqual('abcdef', 'abcdef')).toBe(true);
    expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
    expect(timingSafeEqual('short', 'longer_string')).toBe(false);
    expect(timingSafeEqual(null, 'test')).toBe(false);
  });

  it('supports backward-compatible verification for legacy short DJB2 hashes', async () => {
    // DJB2 hash of "1234":
    // 5381 -> '1': 177622 -> '2': 5861576 -> '3': 193432059 -> '4': 2090280996 (0x7c975024)
    let hash = 5381;
    const pin = '1234';
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) + hash) + pin.charCodeAt(i);
    }
    const legacyHash = (hash >>> 0).toString(16);

    const isValid = await verifyPin('1234', legacyHash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPin('9999', legacyHash);
    expect(isInvalid).toBe(false);
  });

  it('supports backward-compatible verification for legacy SHA-256 64-hex hashes', async () => {
    // SHA-256 of "1234" is 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
    const sha256Hex = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

    const isValid = await verifyPin('1234', sha256Hex);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPin('0000', sha256Hex);
    expect(isInvalid).toBe(false);
  });
});
