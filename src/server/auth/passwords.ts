import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Passwords are hashed with scrypt from node:crypto — deliberately expensive (memory + CPU), so guessing
 * passwords from a stolen database is costly. Every password has its own random salt, so two identical
 * passwords give different hashes. The parameters are stored in the hash itself: they can be raised later
 * and old hashes can still be verified.
 *
 * Format: scrypt$N$r$p$salt(base64)$hash(base64)
 */
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) });
  // Constant-time comparison: a plain === stops at the first differing byte, and the response
  // time would reveal how many bytes match.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A hash "for nobody". When someone signs in with a non-existent e-mail we still run scrypt — otherwise
 * the answer would come noticeably faster and reveal which addresses have an account.
 */
export const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(KEY_LENGTH).toString('base64');

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    // normalize('NFC'): "ż" typed on different keyboards may have different Unicode code points.
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}
