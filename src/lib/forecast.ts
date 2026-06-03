// 軽量な時系列予測。TF.js を使わず、釣果データから抽出した
// 季節周期 (Fourier 第 1〜3 次) と水温適性で「次に釣れそうな日」を
// スコアリングする。ブラウザ内で完結。

import type { Catch } from '../types';

const HARMONICS = [1, 2, 3];

export interface ForecastPoint {
  date: Date;
  score: number; // 0..1
  reasons: { season: number; water: number; spot: number };
}

export interface ForecastOptions {
  species?: string;
  spot?: string;
  fromDate?: Date;
  days?: number;
}

interface SeasonalModel {
  base: number;
  cosCoef: number[];
  sinCoef: number[];
  perDayMean: number;
  speciesSampleCount: number;
  spotSampleCount: number;
  waterTempMean: number;
  waterTempStd: number;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function pickRows(rows: Catch[], species?: string, spot?: string): Catch[] {
  return rows.filter((r) => {
    if (species && r.species !== species) return false;
    if (spot && r.spot_name !== spot) return false;
    return true;
  });
}

function fitSeasonal(rows: Catch[]): SeasonalModel {
  // 日 of year ごとに釣果数をカウントしてフーリエ係数を最小二乗で推定
  const yearLen = 365.25;
  const days: number[] = Array.from({ length: 366 }, () => 0);
  for (const r of rows) {
    const d = dayOfYear(r.caught_at);
    days[d] += r.count;
  }
  const total = days.reduce((a, b) => a + b, 0);
  const mean = total / days.length;

  const cosCoef: number[] = [];
  const sinCoef: number[] = [];
  for (const k of HARMONICS) {
    let c = 0;
    let s = 0;
    for (let d = 0; d < days.length; d += 1) {
      const theta = (2 * Math.PI * k * d) / yearLen;
      c += (days[d] - mean) * Math.cos(theta);
      s += (days[d] - mean) * Math.sin(theta);
    }
    cosCoef.push((2 * c) / days.length);
    sinCoef.push((2 * s) / days.length);
  }

  // 水温平均・標準偏差
  let wSum = 0;
  let wN = 0;
  for (const r of rows) {
    if (Number.isFinite(r.water_temp_c)) {
      wSum += r.water_temp_c;
      wN += 1;
    }
  }
  const wMean = wN > 0 ? wSum / wN : NaN;
  let varSum = 0;
  for (const r of rows) {
    if (Number.isFinite(r.water_temp_c)) {
      varSum += (r.water_temp_c - wMean) ** 2;
    }
  }
  const wStd = wN > 0 ? Math.sqrt(varSum / wN) : 0;

  return {
    base: mean,
    cosCoef,
    sinCoef,
    perDayMean: total / Math.max(1, days.length),
    speciesSampleCount: rows.length,
    spotSampleCount: rows.length,
    waterTempMean: wMean,
    waterTempStd: wStd,
  };
}

function evalSeasonal(model: SeasonalModel, date: Date): number {
  const d = dayOfYear(date);
  const yearLen = 365.25;
  let v = model.base;
  HARMONICS.forEach((k, i) => {
    const theta = (2 * Math.PI * k * d) / yearLen;
    v += model.cosCoef[i] * Math.cos(theta) + model.sinCoef[i] * Math.sin(theta);
  });
  return v;
}

function normalize01(values: number[]): number[] {
  let mn = Infinity;
  let mx = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  if (!Number.isFinite(mn) || !Number.isFinite(mx) || mx === mn) {
    return values.map(() => 0.5);
  }
  return values.map((v) => Math.max(0, Math.min(1, (v - mn) / (mx - mn))));
}

export interface SeasonalSummary {
  fittedMonths: { month: number; score: number }[]; // 1..12
  peakMonth: number; // 1..12
  sampleCount: number;
  waterTempMean: number;
}

export function computeSeasonalSummary(
  rows: Catch[],
  opts: Pick<ForecastOptions, 'species' | 'spot'>,
): SeasonalSummary {
  const filtered = pickRows(rows, opts.species, opts.spot);
  const model = fitSeasonal(filtered);
  const monthValues: number[] = [];
  for (let m = 0; m < 12; m += 1) {
    const mid = new Date(2024, m, 15);
    monthValues.push(evalSeasonal(model, mid));
  }
  const norm = normalize01(monthValues);
  const peakIdx = norm.indexOf(Math.max(...norm));
  return {
    fittedMonths: norm.map((s, i) => ({ month: i + 1, score: s })),
    peakMonth: peakIdx + 1,
    sampleCount: filtered.length,
    waterTempMean: model.waterTempMean,
  };
}

export function forecastDays(rows: Catch[], opts: ForecastOptions = {}): ForecastPoint[] {
  const from = opts.fromDate ?? new Date();
  const days = opts.days ?? 30;
  const filtered = pickRows(rows, opts.species, opts.spot);
  if (filtered.length === 0) return [];

  const model = fitSeasonal(filtered);

  // 各釣り場の平均釣果と比較した \"釣り場プレミアム\" を 0..1 に正規化
  const spotCounts = new Map<string, number>();
  for (const r of rows) spotCounts.set(r.spot_name, (spotCounts.get(r.spot_name) ?? 0) + r.count);
  const maxSpot = Math.max(...spotCounts.values(), 1);

  const dates: Date[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(12, 0, 0, 0);
    dates.push(d);
  }
  const rawSeason = dates.map((d) => evalSeasonal(model, d));
  const normSeason = normalize01(rawSeason);

  return dates.map((d, i) => {
    const season = normSeason[i];
    const water = Number.isFinite(model.waterTempMean) && model.waterTempStd > 0 ? 0.7 : 0.5;
    const spotScore = opts.spot ? (spotCounts.get(opts.spot) ?? 0) / maxSpot : 0.5;
    const composite = season * 0.7 + water * 0.15 + spotScore * 0.15;
    return {
      date: d,
      score: Math.max(0, Math.min(1, composite)),
      reasons: { season, water, spot: spotScore },
    };
  });
}
