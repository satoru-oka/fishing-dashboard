import { describe, it, expect } from 'vitest';
import { filterToParams, paramsToFilter } from './url-state';
import type { FilterState } from '../types';

const emptyFilter: FilterState = {
  dateRange: null,
  species: [],
  spots: [],
  weather: [],
  tides: [],
  excludeReleased: false,
};

describe('filterToParams / paramsToFilter', () => {
  it('empty filter produces no params and round-trips to {}', () => {
    const params = filterToParams(emptyFilter);
    expect(params.toString()).toBe('');
    expect(paramsToFilter(params)).toEqual({});
  });

  it('round-trips species / spots / weather / tides / noRelease', () => {
    const f: FilterState = {
      dateRange: null,
      species: ['シーバス', 'クロダイ'],
      spots: ['若洲'],
      weather: ['晴れ'],
      tides: ['中潮', '大潮'],
      excludeReleased: true,
    };
    const restored = paramsToFilter(filterToParams(f));
    expect(restored.species).toEqual(f.species);
    expect(restored.spots).toEqual(f.spots);
    expect(restored.weather).toEqual(f.weather);
    expect(restored.tides).toEqual(f.tides);
    expect(restored.excludeReleased).toBe(true);
  });

  it('writes date range as local YYYY-MM-DD (#52 timezone fix)', () => {
    const f: FilterState = {
      ...emptyFilter,
      dateRange: [new Date(2024, 0, 5, 13, 30), new Date(2024, 2, 20, 8, 0)],
    };
    const params = filterToParams(f);
    // Local calendar date, not UTC-shifted.
    expect(params.get('from')).toBe('2024-01-05');
    expect(params.get('to')).toBe('2024-03-20');
  });

  it('restores `to` boundary as local end-of-day 23:59:59.999 (#52)', () => {
    const params = new URLSearchParams({ from: '2024-01-05', to: '2024-03-20' });
    const restored = paramsToFilter(params);
    expect(restored.dateRange).toBeDefined();
    const [from, to] = restored.dateRange!;
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(from.getSeconds()).toBe(0);
    expect(from.getMilliseconds()).toBe(0);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
    expect(to.getSeconds()).toBe(59);
    expect(to.getMilliseconds()).toBe(999);
    // Local calendar day preserved through the round trip.
    expect(from.getFullYear()).toBe(2024);
    expect(from.getMonth()).toBe(0);
    expect(from.getDate()).toBe(5);
    expect(to.getDate()).toBe(20);
  });

  it('date range survives a full to-params-and-back round trip', () => {
    const f: FilterState = {
      ...emptyFilter,
      dateRange: [new Date(2023, 5, 1, 0, 0, 0, 0), new Date(2023, 5, 30, 23, 59, 59, 999)],
    };
    const restored = paramsToFilter(filterToParams(f));
    expect(restored.dateRange![0].getTime()).toBe(f.dateRange![0].getTime());
    expect(restored.dateRange![1].getTime()).toBe(f.dateRange![1].getTime());
  });

  it('ignores malformed date params', () => {
    expect(paramsToFilter(new URLSearchParams({ from: 'nope', to: '2024-03-20' })).dateRange).toBeUndefined();
    expect(paramsToFilter(new URLSearchParams({ from: '2024-13-40', to: '2024-03-20' })).dateRange).toBeUndefined();
    // `from` without `to` is incomplete → ignored.
    expect(paramsToFilter(new URLSearchParams({ from: '2024-01-05' })).dateRange).toBeUndefined();
  });

  it('rejects an inverted range where from is after to', () => {
    const restored = paramsToFilter(new URLSearchParams({ from: '2024-03-20', to: '2024-01-05' }));
    expect(restored.dateRange).toBeUndefined();
  });

  it('drops empty entries from comma lists', () => {
    const restored = paramsToFilter(new URLSearchParams({ species: 'シーバス,,クロダイ,' }));
    expect(restored.species).toEqual(['シーバス', 'クロダイ']);
  });
});
