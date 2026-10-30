import type { Realm } from '../../shared/models';

/** Realm names from SPEC §2.2, in the order we show them on lists. */
export const REALMS: { id: Realm; name: string }[] = [
  { id: 'turnie', name: $localize`:@@realm.turnie:Smocze Turnie` },
  { id: 'mgly', name: $localize`:@@realm.mgly:Dwór Mgieł` },
  { id: 'skryptorium', name: $localize`:@@realm.skryptorium:Skryptorium` },
];

export function realmName(realm: Realm): string {
  return REALMS.find((r) => r.id === realm)!.name;
}
