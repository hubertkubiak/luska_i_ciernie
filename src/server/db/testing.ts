// Test helper: a fresh in-memory database from the real seed — tests never touch data/luska.db.
import authors from '../../../seed/authors.json';
import books from '../../../seed/books.json';
import series from '../../../seed/series.json';
import releases from '../../../seed/releases.json';
import tropes from '../../../seed/tropes.json';
import { createDatabase, type SeedData } from './database';

export function repoSeed(): SeedData {
  return structuredClone({ books, tropes, authors, series, releases }) as SeedData;
}

export function memoryDatabase(data: SeedData = repoSeed()) {
  return createDatabase(':memory:', data);
}
