// Buduje bazę SQLite z plików seed/*.json:  npm run db:seed
// Uruchamiane wprost przez Node 24 (wycina typy z .ts) — bez kompilacji i bez dodatkowych narzędzi.
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDatabase, type SeedData } from '../src/server/db/database.ts';

const target = resolve(process.env['DB_PATH'] ?? 'data/luska.db');
const read = (name: string) => JSON.parse(readFileSync(resolve('seed', `${name}.json`), 'utf8'));

const data: SeedData = {
  books: read('books'),
  tropes: read('tropes'),
  authors: read('authors'),
  series: read('series'),
};

// Zawsze od zera: seed jest źródłem prawdy, a baza tylko jego „skompilowaną” wersją.
rmSync(target, { force: true });
const db = createDatabase(target, data);
const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
console.log(
  `[db] ${target}: ${count('books')} książek, ${count('authors')} autorek, ${count('series')} serii, ${count('tropes')} tropów`,
);
db.close();
