import type { DatabaseSync } from 'node:sqlite';
import { SHELF_STATUSES, type ShelfEntry, type ShelfStatus } from '../../shared/models';

/**
 * Półka w tej samej bazie co konta (data/users.db) — to dane osoby, nie katalogu.
 * Książkę wskazujemy slugiem: katalog leży w innym pliku (luska.db), więc klucz obcy między
 * bazami nie jest możliwy. Spójność pilnujemy w kodzie: API przyjmuje tylko slugi z katalogu,
 * a przy odczycie pomijamy książki, których w katalogu już nie ma.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS shelf_items (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  book_slug  TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('tbr', 'reading', 'read')),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  note       TEXT CHECK (length(note) <= 2000), -- = NOTE_MAX
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, book_slug),
  -- Ocena ma sens tylko dla przeczytanej książki.
  CHECK (rating IS NULL OR status = 'read')
);
`;

export const NOTE_MAX = 2000;

export interface StoredItem extends ShelfEntry {
  slug: string;
  updatedAt: string;
}

export class ShelfStore {
  constructor(private readonly db: DatabaseSync) {
    db.exec(SCHEMA);
  }

  list(userId: number): StoredItem[] {
    return (
      this.db
        .prepare('SELECT book_slug, status, rating, note, updated_at FROM shelf_items WHERE user_id = ? ORDER BY updated_at DESC')
        .all(userId) as unknown as Row[]
    ).map(toItem);
  }

  get(userId: number, slug: string): StoredItem | undefined {
    const row = this.db
      .prepare('SELECT book_slug, status, rating, note, updated_at FROM shelf_items WHERE user_id = ? AND book_slug = ?')
      .get(userId, slug) as Row | undefined;
    return row && toItem(row);
  }

  /** Wstawia albo zmienia (UPSERT) — jedna pozycja na książkę, bez wyścigu „sprawdź, potem wstaw”. */
  save(userId: number, slug: string, entry: ShelfEntry): StoredItem {
    const rating = entry.status === 'read' ? (entry.rating ?? null) : null;
    this.db
      .prepare(
        `INSERT INTO shelf_items (user_id, book_slug, status, rating, note) VALUES (:user, :slug, :status, :rating, :note)
         ON CONFLICT (user_id, book_slug) DO UPDATE SET
           status = excluded.status, rating = excluded.rating, note = excluded.note,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
      .run({ user: userId, slug, status: entry.status, rating, note: entry.note?.trim() || null });
    return this.get(userId, slug)!;
  }

  remove(userId: number, slug: string): boolean {
    return Number(this.db.prepare('DELETE FROM shelf_items WHERE user_id = ? AND book_slug = ?').run(userId, slug).changes) > 0;
  }
}

/** Walidacja danych od klienta. Zwraca poprawny wpis albo opis błędu (dla odpowiedzi 400). */
export function parseEntry(body: unknown): ShelfEntry | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!SHELF_STATUSES.includes(b['status'] as ShelfStatus)) return { error: 'Nieznany status półki' };
  const rating = b['rating'];
  if (rating !== undefined && rating !== null && !(Number.isInteger(rating) && (rating as number) >= 1 && (rating as number) <= 5)) {
    return { error: 'Ocena musi być liczbą całkowitą 1–5' };
  }
  const note = b['note'];
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > NOTE_MAX)) {
    return { error: `Notatka: tekst do ${NOTE_MAX} znaków` };
  }
  return { status: b['status'] as ShelfStatus, rating: (rating as number | null) ?? null, note: (note as string | null) ?? null };
}

interface Row {
  book_slug: string;
  status: ShelfStatus;
  rating: number | null;
  note: string | null;
  updated_at: string;
}

function toItem(r: Row): StoredItem {
  return { slug: r.book_slug, status: r.status, rating: r.rating, note: r.note, updatedAt: r.updated_at };
}
