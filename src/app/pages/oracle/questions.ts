import type { Spice } from '../../../shared/models';

/** One answer: points for tropes (slugs from seed/tropes.json). */
export interface Answer {
  label: string;
  weights: Record<string, number>;
}

export interface Question {
  title: string;
  answers: Answer[];
}

/**
 * Trope questions. Every answer adds points to a few tropes; the one with the highest sum wins.
 * The last question (spice) scores no tropes — it only picks the upper spice limit.
 */
export const QUESTIONS: Question[] = [
  {
    title: $localize`:@@oracle.q1:Którędy wchodzisz do opowieści?`,
    answers: [
      { label: $localize`:@@oracle.q1a:Przez bramę akademii, z mieczem w dłoni`, weights: { 'wojenne-akademie': 2, 'proby-i-turnieje': 2, 'jezdzcy-smokow': 1 } },
      { label: $localize`:@@oracle.q1b:Przez mgłę, prosto na bal na dworze fae`, weights: { 'dwory-fae': 3, 'smiertelniczka-wsrod-niesmiertelnych': 1, 'pakty-i-targi': 1 } },
      { label: $localize`:@@oracle.q1c:Przez bibliotekę — powoli, z herbatą`, weights: { 'slow-burn': 2, 'found-family': 2, 'forced-proximity': 1 } },
      { label: $localize`:@@oracle.q1d:Nocą, przez okno, a nikt nie wie, kim jestem`, weights: { 'ukryta-tozsamosc': 3, wampiry: 1, 'morally-grey': 1 } },
    ],
  },
  {
    title: $localize`:@@oracle.q2:Kim jest ta druga osoba, gdy się spotykacie?`,
    answers: [
      { label: $localize`:@@oracle.q2a:Moim największym wrogiem`, weights: { 'enemies-to-lovers': 3, 'rivals-to-lovers': 1 } },
      { label: $localize`:@@oracle.q2b:Rywalem, który chce wygrać to samo co ja`, weights: { 'rivals-to-lovers': 3, 'proby-i-turnieje': 1 } },
      { label: $localize`:@@oracle.q2c:Kimś, kogo przeznaczenie wybrało za mnie`, weights: { 'fated-mates': 3, 'malzenstwo-z-rozsadku': 1 } },
      { label: $localize`:@@oracle.q2d:Kimś mrocznym, kto nie przeprasza za swoje grzechy`, weights: { 'morally-grey': 3, wampiry: 1 } },
    ],
  },
  {
    title: $localize`:@@oracle.q3:Jaką cenę płacisz za magię?`,
    answers: [
      { label: $localize`:@@oracle.q3a:Pakt podpisany krwią`, weights: { 'pakty-i-targi': 3, klatwy: 1 } },
      { label: $localize`:@@oracle.q3b:Klątwę, którą trzeba złamać`, weights: { klatwy: 3, 'pakty-i-targi': 1 } },
      { label: $localize`:@@oracle.q3c:Śmiertelne ciało wśród nieśmiertelnych`, weights: { 'smiertelniczka-wsrod-niesmiertelnych': 3, 'dwory-fae': 1 } },
      { label: $localize`:@@oracle.q3d:Więź ze smokiem — na życie i śmierć`, weights: { 'jezdzcy-smokow': 3, 'wojenne-akademie': 1 } },
    ],
  },
  {
    title: $localize`:@@oracle.q4:Gdzie spędzacie pierwszą wspólną noc?`,
    answers: [
      { label: $localize`:@@oracle.q4a:W jednym namiocie, bo drugiego nie ma`, weights: { 'forced-proximity': 3, 'slow-burn': 1 } },
      { label: $localize`:@@oracle.q4b:W komnacie po ślubie z rozsądku`, weights: { 'malzenstwo-z-rozsadku': 3, 'forced-proximity': 1 } },
      { label: $localize`:@@oracle.q4c:Przy ognisku, z całą drużyną`, weights: { 'found-family': 3 } },
      { label: $localize`:@@oracle.q4d:W krypcie, gdzie coś głodnego czeka na zmrok`, weights: { wampiry: 3, klatwy: 1 } },
    ],
  },
];

/** The spice question: the answer = the upper spice limit (0–5). */
export const SPICE_QUESTION = {
  title: $localize`:@@oracle.spice:Jak gorący ma być smoczy ogień?`,
  answers: [
    { label: $localize`:@@oracle.spice1:Wystarczy iskra`, maxSpice: 1 as Spice },
    { label: $localize`:@@oracle.spice3:Niech się żarzy`, maxSpice: 3 as Spice },
    { label: $localize`:@@oracle.spice5:Smoczy ogień, bez litości`, maxSpice: 5 as Spice },
  ],
};

/**
 * The trope with the highest score. `answers[i]` = the index of the answer to question i.
 * Ties go to the trope that appeared first in the questions — the result is
 * deterministic (the same answers → the same trope, also after a page reload).
 */
export function pickTrope(answers: readonly number[], questions: readonly Question[] = QUESTIONS): string {
  const scores = new Map<string, number>();
  questions.forEach((q, i) => {
    const answer = q.answers[answers[i]];
    if (!answer) return;
    for (const [trope, points] of Object.entries(answer.weights)) {
      scores.set(trope, (scores.get(trope) ?? 0) + points);
    }
  });
  let best = '';
  let bestScore = -1;
  // Map keeps insertion order → on a tie the trope added earlier stays.
  for (const [trope, score] of scores) {
    if (score > bestScore) [best, bestScore] = [trope, score];
  }
  return best;
}
