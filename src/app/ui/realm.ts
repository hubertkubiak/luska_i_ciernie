import type { Realm } from '../../shared/models';

/** Nazwy krain z SPEC §2.2, w kolejności, w jakiej pokazujemy je na listach. */
export const REALMS: { id: Realm; name: string }[] = [
  { id: 'turnie', name: 'Smocze Turnie' },
  { id: 'mgly', name: 'Dwór Mgieł' },
  { id: 'skryptorium', name: 'Skryptorium' },
];

export function realmName(realm: Realm): string {
  return REALMS.find((r) => r.id === realm)!.name;
}
