import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SessionUser } from '../../shared/models';
import { DUMMY_HASH, hashPassword, verifyPassword } from './passwords';

/**
 * Konta i sesje mieszkają w OSOBNEJ bazie (data/users.db) niż katalog (data/luska.db):
 * katalog jest tylko do odczytu i odtwarzany z seeda (npm run db:seed kasuje plik),
 * a danych użytkowników nie wolno tak po prostu skasować.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- W bazie jest tylko SHA-256 tokenu. Sam token zna wyłącznie przeglądarka (ciasteczko), więc
-- ktoś, kto wykradnie plik bazy, nie może się podszyć pod zalogowane osoby.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
`;

/** Czas życia sesji. Przedłużamy ją przy aktywności (sliding expiration). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const LIMITS = {
  email: 254,
  password: { min: 8, max: 128 },
  displayName: { min: 2, max: 40 },
} as const;

export type RegisterError = 'email' | 'haslo' | 'imie' | 'zajety';

/** Osoba po stronie serwera — z wewnętrznym id (do półki). Na zewnątrz wychodzi tylko SessionUser. */
export type Account = SessionUser & { id: number };

export function openAccounts(path: string): Accounts {
  if (path !== ':memory:' && !existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  // WAL: odczyty (sprawdzanie sesji przy każdym żądaniu) nie czekają na zapisy (logowanie).
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return new Accounts(db);
}

export class Accounts {
  /** Ta sama baza służy też półce (src/server/shelf/shelf-store.ts). */
  constructor(readonly db: DatabaseSync) {}

  async register(
    input: { email: string; password: string; displayName: string },
  ): Promise<{ user: Account } | { error: RegisterError }> {
    const email = normalizeEmail(input.email);
    const displayName = input.displayName.trim();
    if (!isEmail(email)) return { error: 'email' };
    if (input.password.length < LIMITS.password.min || input.password.length > LIMITS.password.max) {
      return { error: 'haslo' };
    }
    if (displayName.length < LIMITS.displayName.min || displayName.length > LIMITS.displayName.max) {
      return { error: 'imie' };
    }
    const passwordHash = await hashPassword(input.password);
    try {
      const { lastInsertRowid } = this.db
        .prepare('INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)')
        .run(email, displayName, passwordHash);
      return { user: { id: Number(lastInsertRowid), email, displayName } };
    } catch (e) {
      // UNIQUE na e-mailu sprawdza baza — bez wyścigu „sprawdź, potem wstaw”.
      if (String((e as Error).message).includes('UNIQUE')) return { error: 'zajety' };
      throw e;
    }
  }

  /** Zwraca osobę albo null. Ten sam błąd i (prawie) ten sam czas dla złego e-maila i złego hasła. */
  async login(emailInput: string, password: string): Promise<Account | null> {
    const row = this.db
      .prepare('SELECT id, email, display_name, password_hash FROM users WHERE email = ?')
      .get(normalizeEmail(emailInput)) as
      | { id: number; email: string; display_name: string; password_hash: string }
      | undefined;
    const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
    return row && ok ? { id: row.id, email: row.email, displayName: row.display_name } : null;
  }

  /** Nowa sesja = nowy losowy token (256 bitów). Nigdy nie używamy tokenu podanego przez klienta. */
  createSession(userId: number, now = Date.now()): string {
    const token = randomBytes(32).toString('base64url');
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, now + SESSION_TTL_MS);
    return token;
  }

  userForSession(token: string, now = Date.now()): Account | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.email, u.display_name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`,
      )
      .get(hashToken(token)) as { id: number; email: string; display_name: string; expires_at: number } | undefined;
    if (!row) return null;
    if (row.expires_at <= now) {
      this.destroySession(token);
      return null;
    }
    // Przedłużamy najwyżej raz na dobę — nie piszemy do bazy przy każdym żądaniu.
    if (row.expires_at - now < SESSION_TTL_MS - 24 * 60 * 60 * 1000) {
      this.db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(now + SESSION_TTL_MS, hashToken(token));
    }
    return { id: row.id, email: row.email, displayName: row.display_name };
  }

  destroySession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  purgeExpiredSessions(now = Date.now()): number {
    return Number(this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now).changes);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  // Celowo luźno: pełna składnia adresu (RFC 5322) jest zbyt zawiła, a i tak liczy się to,
  // czy da się na niego coś wysłać. Tu tylko odsiewamy oczywiste pomyłki.
  return email.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}
