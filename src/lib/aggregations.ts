import { format } from 'date-fns';
import type { Catch, FilterState, SpotAggregate } from '../types';

export function applyFilters(rows: Catch[], f: FilterState): Catch[] {
  return rows.filter((r) => {
    if (f.excludeReleased && r.release_flag) return false;
    if (f.dateRange) {
      const t = r.caught_at.getTime();
      if (t < f.dateRange[0].getTime() || t > f.dateRange[1].getTime()) return false;
    }
    if (f.species.length > 0 && !f.species.includes(r.species)) return false;
    if (f.spots.length > 0 && !f.spots.includes(r.spot_name)) return false;
    if (f.weather.length > 0 && !f.weather.includes(r.weather)) return false;
    if (f.tides.length > 0 && !f.tides.includes(r.tide)) return false;
    return true;
  });
}

export interface Kpi {
  totalCount: number;
  tripCount: number;
  avgLength: number;
  maxWeight: number;
  maxWeightSpecies: string;
  releaseRate: number;
}

export function computeKpi(rows: Catch[]): Kpi {
  let totalCount = 0;
  const trips = new Set<string>();
  let lenSum = 0;
  let lenN = 0;
  let maxWeight = 0;
  let maxWeightSpecies = '';
  let released = 0;
  for (const r of rows) {
    totalCount += r.count;
    trips.add(r.trip_id);
    if (Number.isFinite(r.length_cm)) {
      lenSum += r.length_cm;
      lenN += 1;
    }
    if (Number.isFinite(r.weight_g) && r.weight_g > maxWeight) {
      maxWeight = r.weight_g;
      maxWeightSpecies = r.species;
    }
    if (r.release_flag) released += r.count;
  }
  return {
    totalCount,
    tripCount: trips.size,
    avgLength: lenN ? lenSum / lenN : 0,
    maxWeight,
    maxWeightSpecies,
    releaseRate: totalCount ? (released / totalCount) * 100 : 0,
  };
}

/** Group rows by a derived key, preserving first-seen order of keys. */
export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const arr = m.get(k);
    if (arr) arr.push(item);
    else m.set(k, [item]);
  }
  return m;
}

/** Roll up a group of catches into the metrics shared across spot/species aggregations. */
function summarize(rows: Catch[]): { count: number; avgLength: number; maxWeight: number } {
  let count = 0;
  let lenSum = 0;
  let lenN = 0;
  let maxWeight = 0;
  for (const r of rows) {
    count += r.count;
    if (Number.isFinite(r.length_cm)) {
      lenSum += r.length_cm;
      lenN += 1;
    }
    if (Number.isFinite(r.weight_g) && r.weight_g > maxWeight) maxWeight = r.weight_g;
  }
  return { count, avgLength: lenN ? lenSum / lenN : 0, maxWeight };
}

export function aggregateBySpot(rows: Catch[]): SpotAggregate[] {
  const groups = groupBy(
    rows.filter((r) => r.spot_name),
    (r) => r.spot_name,
  );
  return Array.from(groups.entries()).map(([spot_name, group]) => {
    const s = summarize(group);
    return {
      spot_name,
      latitude: group[0].latitude,
      longitude: group[0].longitude,
      count: s.count,
      avg_length: s.avgLength,
      max_weight: s.maxWeight,
    };
  });
}

export interface MonthlyStack {
  months: string[]; // 'YYYY-MM'
  species: string[]; // up to top6 + 'その他'
  matrix: number[][]; // [species][month]
}

export function aggregateMonthlyBySpecies(rows: Catch[], topN = 6): MonthlyStack {
  const monthSet = new Set<string>();
  const speciesCount = new Map<string, number>();
  for (const r of rows) {
    monthSet.add(format(r.caught_at, 'yyyy-MM'));
    speciesCount.set(r.species, (speciesCount.get(r.species) ?? 0) + r.count);
  }
  const months = Array.from(monthSet).sort();
  const topSpecies = Array.from(speciesCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map((x) => x[0]);
  const speciesLabels = [...topSpecies, 'その他'];
  const matrix: number[][] = speciesLabels.map(() => months.map(() => 0));
  const monthIdx = new Map(months.map((m, i) => [m, i] as const));
  for (const r of rows) {
    const mi = monthIdx.get(format(r.caught_at, 'yyyy-MM'));
    if (mi === undefined) continue;
    const sIdx = topSpecies.indexOf(r.species);
    const idx = sIdx === -1 ? speciesLabels.length - 1 : sIdx;
    matrix[idx][mi] += r.count;
  }
  return { months, species: speciesLabels, matrix };
}

export interface SpeciesCount {
  species: string;
  count: number;
}

export function topSpecies(rows: Catch[], topN = 10): SpeciesCount[] {
  const groups = groupBy(rows, (r) => r.species);
  return Array.from(groups.entries())
    .map(([species, group]) => ({ species, count: summarize(group).count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export interface HeatmapData {
  spots: string[];
  species: string[];
  matrix: number[][]; // [spot][species]
}

export function spotSpeciesMatrix(rows: Catch[]): HeatmapData {
  const spotSet = new Set<string>();
  const speciesSet = new Map<string, number>();
  for (const r of rows) {
    spotSet.add(r.spot_name);
    speciesSet.set(r.species, (speciesSet.get(r.species) ?? 0) + r.count);
  }
  const spots = Array.from(spotSet).sort();
  const species = Array.from(speciesSet.entries())
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);
  const spotIdx = new Map(spots.map((s, i) => [s, i] as const));
  const spIdx = new Map(species.map((s, i) => [s, i] as const));
  const matrix: number[][] = spots.map(() => species.map(() => 0));
  for (const r of rows) {
    const si = spotIdx.get(r.spot_name);
    const pi = spIdx.get(r.species);
    if (si === undefined || pi === undefined) continue;
    matrix[si][pi] += r.count;
  }
  return { spots, species, matrix };
}

export interface TempBin {
  label: string;
  count: number;
}

export function waterTempBins(rows: Catch[], binWidth = 4): TempBin[] {
  const bins = new Map<number, number>();
  for (const r of rows) {
    if (!Number.isFinite(r.water_temp_c)) continue;
    const b = Math.floor(r.water_temp_c / binWidth) * binWidth;
    bins.set(b, (bins.get(b) ?? 0) + r.count);
  }
  return Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([b, count]) => ({ label: `${b}-${b + binWidth}°C`, count }));
}

export interface SpotStat {
  spot: string;
  count: number;
  avgLength: number;
}

export function spotStats(rows: Catch[]): SpotStat[] {
  const groups = groupBy(rows, (r) => r.spot_name);
  return Array.from(groups.entries())
    .map(([spot, group]) => {
      const s = summarize(group);
      return { spot, count: s.count, avgLength: s.avgLength };
    })
    .sort((a, b) => b.count - a.count);
}

export function getDataDateRange(rows: Catch[]): [Date, Date] | null {
  if (rows.length === 0) return null;
  let min = rows[0].caught_at.getTime();
  let max = min;
  for (const r of rows) {
    const t = r.caught_at.getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return [new Date(min), new Date(max)];
}

export function uniqueValues<T>(rows: Catch[], pick: (c: Catch) => T | undefined): T[] {
  const s = new Set<T>();
  for (const r of rows) {
    const v = pick(r);
    if (v !== undefined && v !== null && v !== '') s.add(v);
  }
  return Array.from(s);
}
