import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  computeKpi,
  aggregateMonthlyBySpecies,
  topSpecies,
} from './aggregations';
import type { FilterState } from '../types';
import { makeCatch } from '../test/make-catch';

const emptyFilter: FilterState = {
  dateRange: null,
  species: [],
  spots: [],
  weather: [],
  tides: [],
  excludeReleased: false,
};

describe('applyFilters', () => {
  const rows = [
    makeCatch({ catch_id: 'a', species: 'シーバス', spot_name: '若洲', release_flag: false, caught_at: new Date(2024, 0, 10) }),
    makeCatch({ catch_id: 'b', species: 'クロダイ', spot_name: '本牧', release_flag: true, caught_at: new Date(2024, 2, 10) }),
    makeCatch({ catch_id: 'c', species: 'シーバス', spot_name: '本牧', release_flag: false, caught_at: new Date(2024, 5, 10) }),
  ];

  it('returns all rows when no filter is set', () => {
    expect(applyFilters(rows, emptyFilter)).toHaveLength(3);
  });

  it('excludes released rows when excludeReleased is set', () => {
    const out = applyFilters(rows, { ...emptyFilter, excludeReleased: true });
    expect(out.map((r) => r.catch_id)).toEqual(['a', 'c']);
  });

  it('filters by species', () => {
    const out = applyFilters(rows, { ...emptyFilter, species: ['シーバス'] });
    expect(out.map((r) => r.catch_id)).toEqual(['a', 'c']);
  });

  it('filters by spot', () => {
    const out = applyFilters(rows, { ...emptyFilter, spots: ['本牧'] });
    expect(out.map((r) => r.catch_id)).toEqual(['b', 'c']);
  });

  it('filters by inclusive date range', () => {
    const out = applyFilters(rows, {
      ...emptyFilter,
      dateRange: [new Date(2024, 1, 1), new Date(2024, 3, 1)],
    });
    expect(out.map((r) => r.catch_id)).toEqual(['b']);
  });
});

describe('computeKpi', () => {
  it('returns zeroed KPIs for an empty array', () => {
    expect(computeKpi([])).toEqual({
      totalCount: 0,
      tripCount: 0,
      avgLength: 0,
      maxWeight: 0,
      maxWeightSpecies: '',
      releaseRate: 0,
    });
  });

  it('sums counts, counts unique trips, and tracks the heaviest fish', () => {
    const rows = [
      makeCatch({ trip_id: 't1', count: 2, length_cm: 30, weight_g: 500, species: 'A' }),
      makeCatch({ trip_id: 't1', count: 3, length_cm: 50, weight_g: 1500, species: 'B' }),
      makeCatch({ trip_id: 't2', count: 1, length_cm: 40, weight_g: 800, species: 'C' }),
    ];
    const kpi = computeKpi(rows);
    expect(kpi.totalCount).toBe(6);
    expect(kpi.tripCount).toBe(2);
    expect(kpi.avgLength).toBe(40); // (30+50+40)/3
    expect(kpi.maxWeight).toBe(1500);
    expect(kpi.maxWeightSpecies).toBe('B');
  });

  it('ignores NaN length / weight when averaging and finding the max', () => {
    const rows = [
      makeCatch({ length_cm: NaN, weight_g: NaN, count: 1 }),
      makeCatch({ length_cm: 60, weight_g: 1000, count: 1 }),
    ];
    const kpi = computeKpi(rows);
    expect(kpi.avgLength).toBe(60); // NaN row excluded, not averaged in
    expect(kpi.maxWeight).toBe(1000);
  });

  it('computes release rate as a percentage of total count', () => {
    const rows = [
      makeCatch({ count: 3, release_flag: true }),
      makeCatch({ count: 1, release_flag: false }),
    ];
    expect(computeKpi(rows).releaseRate).toBe(75); // 3 of 4
  });
});

describe('aggregateMonthlyBySpecies', () => {
  it('returns empty months with only the その他 bucket for no rows', () => {
    const out = aggregateMonthlyBySpecies([]);
    expect(out.months).toEqual([]);
    expect(out.species).toEqual(['その他']);
  });

  it('sorts months and rolls species beyond topN into その他', () => {
    const rows = [
      makeCatch({ species: 'A', count: 5, caught_at: new Date(2024, 0, 5) }),
      makeCatch({ species: 'B', count: 4, caught_at: new Date(2024, 0, 6) }),
      makeCatch({ species: 'C', count: 3, caught_at: new Date(2024, 1, 5) }),
    ];
    const out = aggregateMonthlyBySpecies(rows, 2);
    expect(out.months).toEqual(['2024-01', '2024-02']);
    // top 2 by count are A and B; C falls into その他
    expect(out.species).toEqual(['A', 'B', 'その他']);
    const otherRow = out.matrix[out.species.indexOf('その他')];
    expect(otherRow).toEqual([0, 3]); // C's 3 fish in 2024-02
  });
});

describe('topSpecies', () => {
  it('returns an empty list for no rows', () => {
    expect(topSpecies([])).toEqual([]);
  });

  it('aggregates counts and sorts descending, honouring topN', () => {
    const rows = [
      makeCatch({ species: 'A', count: 2 }),
      makeCatch({ species: 'B', count: 5 }),
      makeCatch({ species: 'A', count: 1 }),
      makeCatch({ species: 'C', count: 4 }),
    ];
    const out = topSpecies(rows, 2);
    expect(out).toEqual([
      { species: 'B', count: 5 },
      { species: 'C', count: 4 },
    ]);
  });
});
