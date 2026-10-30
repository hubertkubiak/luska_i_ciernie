// Builds the SQLite database from seed/*.json:  npm run db:seed
// Run directly by Node 24 (it strips types from .ts) — no compilation and no extra tools.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDatabase, type SeedData } from '../src/server/db/database.ts';

const target = resolve(process.env['DB_PATH'] ?? 'data/luska.db');
const read = (name: string) => JSON.parse(readFileSync(resolve('seed', `${name}.json`), 'utf8'));

const data: SeedData = {
  books: read('books'),
  tropes: read('tropes'),
  authors: read('authors'),
  series: read('series'),
  releases: read('releases'),
  warnings: read('warnings'),
};

// Always from scratch (in place, in one transaction): the seed is the source of truth, the database only its "compiled" form.
const db = createDatabase(target, data);
const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
console.log(
  `[db] ${target}: ${count('books')} książek, ${count('authors')} autorek, ${count('series')} serii, ${count('tropes')} tropów`,
);
db.close();
