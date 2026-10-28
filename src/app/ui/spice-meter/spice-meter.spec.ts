import { TestBed } from '@angular/core/testing';
import { SpiceMeter } from './spice-meter';

describe('SpiceMeter', () => {
  it('lights as many flames as the spice level and names the level', async () => {
    const fixture = TestBed.createComponent(SpiceMeter);
    fixture.componentRef.setInput('spice', 3);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('svg').length).toBe(5);
    expect(el.querySelectorAll('svg.lit').length).toBe(3);
    expect(el.textContent).toContain('3/5 · Płomień');
  });
});
