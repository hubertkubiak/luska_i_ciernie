import { convertToParamMap } from '@angular/router';
import { parseCriteria, toApiUrl, toQueryString } from './search-criteria';

describe('search-criteria', () => {
  it('ignoruje kolejność tropów, duplikaty i domyślne wartości', () => {
    const a = parseCriteria(convertToParamMap({ trop: ['slow-burn', 'dwory-fae', 'slow-burn'], tryb: 'wszystkie' }));
    const b = parseCriteria(convertToParamMap({ trop: ['dwory-fae', 'slow-burn'] }));
    expect(a).toEqual(b);
    expect(toQueryString(a)).toBe('trop=dwory-fae&trop=slow-burn');
  });

  it('odrzuca śmieci zamiast wybuchać', () => {
    const c = parseCriteria(convertToParamMap({ pikanteria: '9', status: 'zgubiona', tryb: 'byle', q: '   ' }));
    expect(c).toEqual({ q: '', tropes: [], mode: 'wszystkie', maxSpice: null, status: null });
    expect(toQueryString(c)).toBe('');
  });

  it('czyta FormData tak samo jak adres URL', () => {
    const form = new FormData();
    form.append('q', ' fae ');
    form.append('trop', 'pakty-i-targi');
    form.append('pikanteria', '0');
    form.append('status', 'pojedyncza');

    const fromForm = parseCriteria(form);
    const fromUrl = parseCriteria(convertToParamMap({ q: 'fae', trop: 'pakty-i-targi', pikanteria: '0', status: 'pojedyncza' }));
    expect(fromForm).toEqual(fromUrl);
  });

  it('pomija tryb przy jednym tropie, zostawia przy dwóch', () => {
    expect(toQueryString(parseCriteria(convertToParamMap({ trop: 'a', tryb: 'dowolny' })))).toBe('trop=a');
    expect(toQueryString(parseCriteria(convertToParamMap({ trop: ['b', 'a'], tryb: 'dowolny' })))).toBe(
      'trop=a&trop=b&tryb=dowolny',
    );
  });

  it('tłumaczy kryteria na parametry API', () => {
    const c = parseCriteria(convertToParamMap({ trop: ['b', 'a'], tryb: 'dowolny', pikanteria: '3', status: 'w-trakcie' }));
    expect(toApiUrl(c)).toBe('/api/books?trope=a&trope=b&match=any&maxSpice=3&status=ongoing');
    expect(toApiUrl(parseCriteria(convertToParamMap({})))).toBe('/api/books');
  });
});
