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

  it('sessions: lookup, expiry and logout', async () => {
    const accounts = fresh();
    const { user } = (await accounts.register(violet)) as { user: { id: number } };
    const now = Date.now();
    const token = accounts.createSession(user.id, now);

    expect(accounts.userForSession(token, now)).toEqual({ email: 'violet@example.com', displayName: 'Violet' });
    expect(accounts.userForSession('wymyslony-token', now)).toBeNull();
    expect(accounts.userForSession(token, now + SESSION_TTL_MS + 1)).toBeNull(); // wygasła i została usunięta
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
    // Aktywność po 20 dniach przedłuża sesję o kolejne 30 — więc po 40 dniach nadal żyje.
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
