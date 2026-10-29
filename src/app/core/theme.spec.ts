import { parseTheme } from './theme';

describe('parseTheme', () => {
  it('reads the theme cookie among others and falls back to night', () => {
    expect(parseTheme('sid=x; theme=parchment; a=b')).toBe('parchment');
    expect(parseTheme('theme=night')).toBe('night');
    expect(parseTheme('mytheme=parchment')).toBe('night');
    expect(parseTheme('theme=<script>')).toBe('night');
    expect(parseTheme('')).toBe('night');
  });
});
