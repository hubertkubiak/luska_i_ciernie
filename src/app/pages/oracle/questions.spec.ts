import tropes from '../../../../seed/tropes.json';
import { QUESTIONS, pickTrope } from './questions';

describe('Wyrocznia — pickTrope', () => {
  it('wybiera trop z największą sumą punktów', () => {
    // smoki: q1a (1) + q3d (3) = 4; akademie: q1a (2) + q3d (1) = 3
    expect(pickTrope([0, 0, 3, 0])).toBe('jezdzcy-smokow');
    expect(pickTrope([3, 3, 1, 3])).toBe('wampiry');
  });

  it('przy remisie wygrywa trop, który pojawił się wcześniej — wynik jest deterministyczny', () => {
    const questions = [
      { title: 'a', answers: [{ label: 'x', weights: { pierwszy: 2, drugi: 2 } }] },
      { title: 'b', answers: [{ label: 'y', weights: { drugi: 1, pierwszy: 1 } }] },
    ];
    expect(pickTrope([0, 0], questions)).toBe('pierwszy');
    expect(pickTrope([0, 0, 0, 0])).toBe(pickTrope([0, 0, 0, 0]));
  });

  it('pomija brakujące odpowiedzi', () => {
    expect(pickTrope([1])).toBe('dwory-fae');
    expect(pickTrope([])).toBe('');
  });

  it('każdy trop z pytań istnieje w katalogu tropów', () => {
    const known = new Set(tropes.map((t) => t.slug));
    for (const q of QUESTIONS) for (const a of q.answers) for (const slug of Object.keys(a.weights)) {
      expect(known.has(slug), slug).toBe(true);
    }
  });
});
