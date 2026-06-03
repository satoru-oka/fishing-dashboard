import { endOfDay, format, isValid, parse, startOfDay } from 'date-fns';
import type { FilterState } from '../types';

const URL_DATE_FORMAT = 'yyyy-MM-dd';

export function formatLocalDateParam(date: Date): string {
  return format(date, URL_DATE_FORMAT);
}

export function parseLocalDateParam(value: string, edge: 'start' | 'end'): Date | null {
  const parsed = parse(value, URL_DATE_FORMAT, new Date());
  if (!isValid(parsed) || formatLocalDateParam(parsed) !== value) return null;
  return edge === 'start' ? startOfDay(parsed) : endOfDay(parsed);
}

export function filterToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.dateRange) {
    p.set('from', formatLocalDateParam(f.dateRange[0]));
    p.set('to', formatLocalDateParam(f.dateRange[1]));
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
    const f = parseLocalDateParam(from, 'start');
    const t = parseLocalDateParam(to, 'end');
    if (f && t && f.getTime() <= t.getTime()) {
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
