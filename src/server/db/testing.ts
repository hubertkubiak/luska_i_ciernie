// Pomoc dla testów: świeża baza w pamięci z prawdziwego seeda — testy nie dotykają data/luska.db.
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
