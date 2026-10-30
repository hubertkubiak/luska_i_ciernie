import { DUMMY_HASH, hashPassword, verifyPassword } from './passwords';

describe('passwords', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('smoczy ogień 123');
    expect(await verifyPassword('smoczy ogień 123', hash)).toBe(true);
    expect(await verifyPassword('smoczy ogien 123', hash)).toBe(false);
  });

  it('salts every hash — the same password gives different hashes', async () => {
    const [a, b] = await Promise.all([hashPassword('to-samo-haslo'), hashPassword('to-samo-haslo')]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$/);
  });

  it('treats differently composed Unicode as the same password (NFC)', async () => {
    const composed = 'żar'; // ż as a single code point
    const decomposed = 'żar'; // z + combining dot above
    expect(await verifyPassword(decomposed, await hashPassword(composed))).toBe(true);
  });

  it('never accepts anything for the dummy hash or garbage', async () => {
    expect(await verifyPassword('', DUMMY_HASH)).toBe(false);
    expect(await verifyPassword('x', 'nie-hash')).toBe(false);
  });
});
