import type { FilterState } from '../types';

export function filterToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.dateRange) {
    p.set('from', f.dateRange[0].toISOString().slice(0, 10));
    p.set('to', f.dateRange[1].toISOString().slice(0, 10));
  }
  if (f.species.length) p.set('species', f.species.join(','));
  if (f.spots.length) p.set('spots', f.spots.join(','));
  if (f.weather.length) p.set('weather', f.weather.join(','));
  if (f.tides.length) p.set('tides', f.tides.join(','));
  if (f.excludeReleased) p.set('noRelease', '1');
  return p;
}

export function paramsToFilter(p: URLSearchParams): Partial<FilterState> {
  const out: Partial<FilterState> = {};
  const from = p.get('from');
  const to = p.get('to');
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
      out.dateRange = [f, t];
    }
  }
  const species = p.get('species');
  if (species) out.species = species.split(',').filter(Boolean);
  const spots = p.get('spots');
  if (spots) out.spots = spots.split(',').filter(Boolean);
  const weather = p.get('weather');
  if (weather) out.weather = weather.split(',').filter(Boolean);
  const tides = p.get('tides');
  if (tides) out.tides = tides.split(',').filter(Boolean);
  if (p.get('noRelease') === '1') out.excludeReleased = true;
  return out;
}

export function syncUrl(f: FilterState) {
  const params = filterToParams(f);
  const qs = params.toString();
  const next = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', next);
}

export function readUrlFilter(): Partial<FilterState> {
  return paramsToFilter(new URLSearchParams(window.location.search));
}
