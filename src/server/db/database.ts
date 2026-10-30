// Catalogue database: SQLite built into Node (node:sqlite) — one file, no server, no account.
//
// This file is loaded in three ways: by the Angular build (server.ts), by the tests (Vitest)
// and directly by Node in scripts/seed.ts (Node 24 strips the types from .ts itself). That is why
// there are no relative imports here except `import type` — those vanish when types are stripped,
// and Node would reject a plain import without the .ts extension.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Realm, SeriesStatus } from '../../shared/models';

/** Records from seed/*.json — relations stored as slugs, so the files stay hand-editable. */
export interface SeedData {
  books: SeedBook[];
  tropes: { slug: string; name: string; realm: string; description: string }[];
  authors: { slug: string; name: string; bio: string }[];
  series: { slug: string; name: string; names?: Record<string, string>; status: string; plannedBooks?: number }[];
  /** Release announcements — SAMPLE data in the seed (fictional titles and authors). */
  releases?: { slug: string; title: string; author: string; date: string; note?: string }[];
}

export interface SeedBook {
  slug: string;
  oldSlugs?: string[];
  title: string;
  titles?: Record<string, string>;
  author: string;
  series?: string;
  seriesIndex?: number;
  isbn: string;
  year: number;
  pages?: number;
  coverId: number;
  covers?: Record<string, number>;
  spice: number;
  tropes: string[];
  contentWarnings: string[];
  description: string;
}

/**
 * Schema. Rules that Catalog.validate() used to check by hand are now enforced by the database:
 * foreign keys (unknown author / series / trope), CHECK (spice range, realms, statuses)
 * and a trigger (an old slug may not be the slug of an existing book).
 */
export const SCHEMA = `
CREATE TABLE authors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio  TEXT NOT NULL
);

CREATE TABLE series (
  slug          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('ongoing', 'completed')),
  planned_books INTEGER CHECK (planned_books > 0)
);

-- Tłumaczenia trzymamy w osobnych tabelach (książka × język): nowy język = nowe wiersze, bez zmiany schematu.
CREATE TABLE series_names (
  series TEXT NOT NULL REFERENCES series (slug),
  lang   TEXT NOT NULL,
  name   TEXT NOT NULL,
  PRIMARY KEY (series, lang)
);

CREATE TABLE tropes (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  realm       TEXT NOT NULL CHECK (realm IN ('turnie', 'mgly', 'skryptorium')),
  description TEXT NOT NULL,
  position    INTEGER NOT NULL
);

CREATE TABLE books (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  author       TEXT NOT NULL REFERENCES authors (slug),
  series       TEXT REFERENCES series (slug),
  series_index INTEGER,
  isbn         TEXT NOT NULL,
  year         INTEGER NOT NULL,
  pages        INTEGER CHECK (pages > 0),
  cover_id     INTEGER NOT NULL,
  spice        INTEGER NOT NULL CHECK (spice BETWEEN 0 AND 5),
  description  TEXT NOT NULL,
  -- Wszystkie warianty tytułu, autorka i seria — małymi literami, bez ogonków (fold()).
  -- SQLite nie zna polskich znaków w lower(), więc szukamy po tekście przygotowanym w JS.
  search_text  TEXT NOT NULL,
  CHECK ((series IS NULL) = (series_index IS NULL))
);
CREATE INDEX books_author ON books (author);
CREATE INDEX books_series ON books (series);

CREATE TABLE book_titles (
  book  TEXT NOT NULL REFERENCES books (slug),
  lang  TEXT NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (book, lang)
);

CREATE TABLE book_covers (
  book     TEXT NOT NULL REFERENCES books (slug),
  lang     TEXT NOT NULL,
  cover_id INTEGER NOT NULL,
  PRIMARY KEY (book, lang)
);

CREATE TABLE book_tropes (
  book     TEXT NOT NULL REFERENCES books (slug),
  trope    TEXT NOT NULL REFERENCES tropes (slug),
  -- Kolejność ma znaczenie: pierwszy trop wyznacza krainę książki.
  position INTEGER NOT NULL,
  PRIMARY KEY (book, trope)
);
CREATE INDEX book_tropes_trope ON book_tropes (trope);

CREATE TABLE content_warnings (
  book     TEXT NOT NULL REFERENCES books (slug),
  position INTEGER NOT NULL,
  text     TEXT NOT NULL,
  PRIMARY KEY (book, position)
);

-- Data jako tekst ISO (RRRR-MM-DD): sortuje się poprawnie i porównuje zwykłym < / >.
CREATE TABLE releases (
  slug   TEXT PRIMARY KEY,
  title  TEXT NOT NULL,
  author TEXT NOT NULL,
  date   TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  note   TEXT
);

CREATE TABLE old_slugs (
  old_slug TEXT PRIMARY KEY,
  book     TEXT NOT NULL REFERENCES books (slug)
);

CREATE TRIGGER old_slug_not_a_book BEFORE INSERT ON old_slugs
WHEN EXISTS (SELECT 1 FROM books WHERE slug = NEW.old_slug)
BEGIN
  SELECT RAISE(ABORT, 'stary slug koliduje z istniejącą książką');
END;
`;

/**
 * Opens the database. The file must exist — `npm run db:seed` creates it. We do not create it
 * silently, because an empty database would give a catalogue without books instead of a clear error.
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:' && !existsSync(path)) {
    throw new Error(`[db] Brak bazy ${path}. Utwórz ją poleceniem: npm run db:seed`);
  }
  const db = new DatabaseSync(path, { readOnly: path !== ':memory:' });
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

/** Creates a new database file (or an in-memory database for tests) with the schema and seed data. */
/**
 * Creates the database or rebuilds an existing one IN PLACE — in a single transaction: dropping the old
 * tables, new schema and data. We do not delete the file, because on Windows you cannot delete a file
 * that a running server holds open. The server reads the old data until COMMIT, then the new data;
 * an error in the seed rolls everything back (ROLLBACK) and the database stays as it was.
 */
export function createDatabase(path: string, data: SeedData): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // Foreign keys are off during the rebuild (DROP TABLE in any order); PRAGMA does not work
  // inside a transaction, hence before BEGIN. Consistency is checked by foreign_key_check below.
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN');
  try {
    const objects = db
      .prepare("SELECT type, name FROM sqlite_master WHERE type IN ('table', 'trigger') AND name NOT LIKE 'sqlite_%'")
      .all() as { type: string; name: string }[];
    for (const o of objects) db.exec(`DROP ${o.type.toUpperCase()} IF EXISTS "${o.name}"`);
    db.exec(SCHEMA);
    insertSeed(db, data);
    // Foreign keys are checked at the end, all at once: the first error is shown with the row's content.
    const broken = db.prepare('PRAGMA foreign_key_check').all() as { table: string; rowid: number; parent: string }[];
    if (broken.length) {
      const { table, rowid, parent } = broken[0];
      const row = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(rowid);
      throw new Error(`[seed] ${table} ${JSON.stringify({ ...row })}: odwołanie do nieistniejącego wpisu w „${parent}”`);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    db.close();
    throw e;
  }
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

/** Inserts the data in one transaction: either the whole seed is valid, or the database stays empty. */
export function seedDatabase(db: DatabaseSync, data: SeedData): void {
  db.exec('BEGIN');
  try {
    insertSeed(db, data);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function insertSeed(db: DatabaseSync, data: SeedData): void {
  const seriesById = new Map(data.series.map((s) => [s.slug, s]));
  const authorById = new Map(data.authors.map((a) => [a.slug, a]));
  {
    const author = db.prepare('INSERT INTO authors (slug, name, bio) VALUES (?, ?, ?)');
    for (const a of data.authors) author.run(a.slug, a.name, a.bio);

    const series = db.prepare('INSERT INTO series (slug, name, status, planned_books) VALUES (?, ?, ?, ?)');
    const seriesName = db.prepare('INSERT INTO series_names (series, lang, name) VALUES (?, ?, ?)');
    for (const s of data.series) {
      series.run(s.slug, s.name, s.status as SeriesStatus, s.plannedBooks ?? null);
      for (const [lang, name] of Object.entries(s.names ?? {})) seriesName.run(s.slug, lang, name);
    }

    const trope = db.prepare('INSERT INTO tropes (slug, name, realm, description, position) VALUES (?, ?, ?, ?, ?)');
    data.tropes.forEach((t, i) => trope.run(t.slug, t.name, t.realm as Realm, t.description, i));

    const book = db.prepare(`
      INSERT INTO books (slug, title, author, series, series_index, isbn, year, pages, cover_id, spice, description, search_text)
      VALUES (:slug, :title, :author, :series, :seriesIndex, :isbn, :year, :pages, :coverId, :spice, :description, :searchText)`);
    const title = db.prepare('INSERT INTO book_titles (book, lang, title) VALUES (?, ?, ?)');
    const cover = db.prepare('INSERT INTO book_covers (book, lang, cover_id) VALUES (?, ?, ?)');
    const bookTrope = db.prepare('INSERT INTO book_tropes (book, trope, position) VALUES (?, ?, ?)');
    const warning = db.prepare('INSERT INTO content_warnings (book, position, text) VALUES (?, ?, ?)');
    const oldSlug = db.prepare('INSERT INTO old_slugs (old_slug, book) VALUES (?, ?)');

    for (const b of data.books) {
      if (b.tropes.length === 0) throw new Error(`[seed] ${b.slug}: brak tropów`);
      const s = b.series ? seriesById.get(b.series) : undefined;
      const searchParts = [b.title, ...Object.values(b.titles ?? {}), authorById.get(b.author)?.name ?? ''];
      if (s) searchParts.push(s.name, ...Object.values(s.names ?? {}));
      try {
        book.run({
          slug: b.slug,
          title: b.title,
          author: b.author,
          series: b.series ?? null,
          seriesIndex: b.series ? (b.seriesIndex ?? 1) : null,
          isbn: b.isbn,
          year: b.year,
          pages: b.pages ?? null,
          coverId: b.coverId,
          spice: b.spice,
          description: b.description,
          searchText: fold(searchParts.join(' ')),
        });
        for (const [lang, t] of Object.entries(b.titles ?? {})) title.run(b.slug, lang, t);
        for (const [lang, c] of Object.entries(b.covers ?? {})) cover.run(b.slug, lang, c);
        b.tropes.forEach((t, i) => bookTrope.run(b.slug, t, i));
        b.contentWarnings.forEach((w, i) => warning.run(b.slug, i, w));
      } catch (e) {
        // A constraint error alone does not say which record it is about — we add the slug.
        throw new Error(`[seed] ${b.slug}: ${(e as Error).message}`);
      }
    }
    // Old slugs last: the trigger compares them with the complete list of books.
    for (const b of data.books) {
      for (const old of b.oldSlugs ?? []) {
        try {
          oldSlug.run(old, b.slug);
        } catch (e) {
          throw new Error(`[seed] stary slug "${old}" (→ ${b.slug}): ${(e as Error).message}`);
        }
      }
    }
    const release = db.prepare('INSERT INTO releases (slug, title, author, date, note) VALUES (?, ?, ?, ?, ?)');
    for (const r of data.releases ?? []) release.run(r.slug, r.title, r.author, r.date, r.note ?? null);
  }
}

/** "Łuska Ćmy" → "luska cmy": lowercase, no diacritics (ł does not decompose in NFD, hence separately). */
export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').trim();
}
