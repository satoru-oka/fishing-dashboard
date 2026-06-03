import type { Catch } from '../types';
import type { DailyForecast } from './weather';

export interface SpotProfile {
  spot: string;
  latitude: number;
  longitude: number;
  catchCount: number;
  avgWaterTempC: number;
  monthCounts: number[]; // 1..12 → count
}

export function buildSpotProfiles(rows: Catch[]): SpotProfile[] {
  const m = new Map<string, SpotProfile & { tempSum: number; tempN: number }>();
  for (const r of rows) {
    if (!r.spot_name) continue;
    if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) continue;
    let p = m.get(r.spot_name);
    if (!p) {
      p = {
        spot: r.spot_name,
        latitude: r.latitude,
        longitude: r.longitude,
        catchCount: 0,
        avgWaterTempC: 0,
        monthCounts: Array.from({ length: 12 }, () => 0),
        tempSum: 0,
        tempN: 0,
      };
      m.set(r.spot_name, p);
    }
    p.catchCount += r.count;
    const month = r.caught_at.getMonth();
    p.monthCounts[month] += r.count;
    if (Number.isFinite(r.water_temp_c)) {
      p.tempSum += r.water_temp_c;
      p.tempN += 1;
    }
  }
  return Array.from(m.values())
    .map((p) => ({
      spot: p.spot,
      latitude: p.latitude,
      longitude: p.longitude,
      catchCount: p.catchCount,
      avgWaterTempC: p.tempN > 0 ? p.tempSum / p.tempN : NaN,
      monthCounts: p.monthCounts,
    }))
    .sort((a, b) => b.catchCount - a.catchCount);
}

export interface Recommendation {
  spot: string;
  latitude: number;
  longitude: number;
  forecast: DailyForecast;
  score: number; // higher is better
  reasons: string[];
  warnings: string[];
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function scoreSpotForDay(
  profile: SpotProfile,
  forecast: DailyForecast,
  totalCatchMax: number,
): Recommendation {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // 過去釣果ベースの強さ (実績) — 月一致を重視
  const month = new Date(forecast.date + 'T00:00:00').getMonth();
  const monthCount = profile.monthCounts[month] ?? 0;
  const totalMonthCount = profile.monthCounts.reduce((a, b) => a + b, 0);
  const monthShare = totalMonthCount > 0 ? monthCount / totalMonthCount : 1 / 12;
  const seasonScore = clamp01(monthShare * 12 * 0.5); // 平均の 2 倍で 1.0
  if (monthCount > 0 && monthShare > 1 / 12) {
    reasons.push(`${month + 1}月は過去 ${monthCount} 匹の実績`);
  }

  const overallScore = clamp01(profile.catchCount / Math.max(1, totalCatchMax));
  if (overallScore > 0.5) reasons.push('全期間で釣果上位');

  // 天気: 雨が少ない、風が弱いほど良い
  const windScore = clamp01(1 - (forecast.windMax - 3) / 10); // 3m/s 以下満点、13m/s で 0
  const precipScore = clamp01(1 - forecast.precip / 8); // 0mm 満点、8mm 以上で 0
  if (forecast.windMax >= 8) warnings.push(`強風 ${forecast.windMax.toFixed(1)} m/s`);
  if (forecast.precip >= 5) warnings.push(`降水 ${forecast.precip.toFixed(1)} mm`);
  if (forecast.windMax < 4 && forecast.precip < 1) reasons.push('穏やかな天気');

  // 波: < 0.5m なら満点、1.5m で 0
  const waveScore = Number.isFinite(forecast.waveHeight)
    ? clamp01(1 - (forecast.waveHeight - 0.5) / 1.0)
    : 0.7;
  if (Number.isFinite(forecast.waveHeight) && forecast.waveHeight >= 1.0) {
    warnings.push(`波高 ${forecast.waveHeight.toFixed(1)} m`);
  }

  // 気温: 5°C〜28°C 心地よい、外れると軽い減点
  const tempMid = (forecast.tempMax + forecast.tempMin) / 2;
  const tempScore = clamp01(1 - Math.abs(tempMid - 18) / 20);
  if (tempMid >= 5 && tempMid <= 28) reasons.push(`気温 ${tempMid.toFixed(0)}°C`);

  const score =
    seasonScore * 0.3 +
    overallScore * 0.2 +
    windScore * 0.2 +
    precipScore * 0.15 +
    waveScore * 0.1 +
    tempScore * 0.05;

  return {
    spot: profile.spot,
    latitude: profile.latitude,
    longitude: profile.longitude,
    forecast,
    score,
    reasons,
    warnings,
  };
}

export function rankRecommendations(items: Recommendation[]): Recommendation[] {
  return [...items].sort((a, b) => b.score - a.score);
}
