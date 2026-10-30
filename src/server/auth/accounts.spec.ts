import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SESSION_TTL_MS, openAccounts } from './accounts';

describe('accounts', () => {
  const fresh = () => openAccounts(':memory:');
  const violet = { email: ' Violet@Example.com ', password: 'smoczy-ogien-123', displayName: ' Violet ' };

  it('registers, normalizes e-mail and logs in case-insensitively', async () => {
    const accounts = fresh();
    const result = await accounts.register(violet);
    expect(result).toEqual({ user: { id: 1, email: 'violet@example.com', displayName: 'Violet' } });
    expect(await accounts.login('VIOLET@example.com', 'smoczy-ogien-123')).toMatchObject({ displayName: 'Violet' });
    expect(await accounts.login('violet@example.com', 'zle')).toBeNull();
    expect(await accounts.login('nikt@example.com', 'smoczy-ogien-123')).toBeNull();
  });

  it('validates input and rejects a taken e-mail', async () => {
    const accounts = fresh();
    expect(await accounts.register({ ...violet, email: 'bez-malpy' })).toEqual({ error: 'email' });
    expect(await accounts.register({ ...violet, password: 'krotkie' })).toEqual({ error: 'haslo' });
    expect(await accounts.register({ ...violet, displayName: 'V' })).toEqual({ error: 'imie' });
    await accounts.register(violet);
    expect(await accounts.register({ ...violet, email: 'violet@EXAMPLE.com' })).toEqual({ error: 'zajety' });
  });

  it('stores the cover consent with its time, and its withdrawal', async () => {
    const accounts = fresh();
    const { user } = (await accounts.register({ ...violet, coversConsent: true }, 1_000)) as { user: { id: number } };
    expect(accounts.hasCoversConsent(user.id)).toBe(true);
    const row = () => accounts.db.prepare('SELECT covers_consent_at AS at FROM users WHERE id = ?').get(user.id);
    expect(row()).toEqual({ at: 1_000 });
    accounts.setCoversConsent(user.id, false);
    expect(accounts.hasCoversConsent(user.id)).toBe(false);
    expect(row()).toEqual({ at: null });

    const { user: other } = (await accounts.register({ ...violet, email: 'x@example.com' })) as { user: { id: number } };
    expect(accounts.hasCoversConsent(other.id)).toBe(false); // unticked = no consent
  });

  it('adds the consent column to a users.db created before it existed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'luska-'));
    const path = join(dir, 'users.db');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    old.close();
    const accounts = openAccounts(path);
    expect(accounts.db.prepare('SELECT covers_consent_at FROM users').all()).toEqual([]);
    accounts.db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('sessions: lookup, expiry and logout', async () => {
    const accounts = fresh();
    const { user } = (await accounts.register(violet)) as { user: { id: number } };
    const now = Date.now();
    const token = accounts.createSession(user.id, now);

    expect(accounts.userForSession(token, now)).toEqual({ id: user.id, email: 'violet@example.com', displayName: 'Violet' });
    expect(accounts.userForSession('wymyslony-token', now)).toBeNull();
    expect(accounts.userForSession(token, now + SESSION_TTL_MS + 1)).toBeNull(); // expired and deleted
    expect(accounts.userForSession(token, now)).toBeNull();

    const second = accounts.createSession(user.id, now);
    accounts.destroySession(second);
    expect(accounts.userForSession(second, now)).toBeNull();
  });

  it('extends an active session (sliding expiration)', async () => {
    const accounts = fresh();
    const { user } = (await accounts.register(violet)) as { user: { id: number } };
    const start = Date.now();
    const token = accounts.createSession(user.id, start);
    // Activity after 20 days extends the session by another 30 — so after 40 days it is still alive.
    expect(accounts.userForSession(token, start + 20 * 86_400_000)).not.toBeNull();
    expect(accounts.userForSession(token, start + 40 * 86_400_000)).not.toBeNull();
  });

  it('purges expired sessions', async () => {
    const accounts = fresh();
    const { user } = (await accounts.register(violet)) as { user: { id: number } };
    accounts.createSession(user.id, 0);
    expect(accounts.purgeExpiredSessions(SESSION_TTL_MS + 1)).toBe(1);
  });
});
