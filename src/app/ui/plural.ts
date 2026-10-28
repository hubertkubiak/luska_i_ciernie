/** Polska odmiana: 1 księga, 2–4 księgi, 5–21 ksiąg, 22–24 księgi… (12–14 zawsze „ksiąg”). */
export function books(n: number): string {
  if (n === 1) return 'księga';
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? 'księgi' : 'ksiąg';
}
