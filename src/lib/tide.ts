// 簡易潮汐推定。M2 (主太陰半日) と S2 (主太陽半日) の代表的振幅 + 位相を
// 東京湾の月齢ベースで近似する。気象庁の正式値ではないが、
// 「明日のおすすめ」用に「上げ/下げ」「干満時刻」程度の指標を出す。

const M2_PERIOD_HR = 12.4206;
const S2_PERIOD_HR = 12.0;
const TOKYO_BAY_M2_AMP = 0.6; // m
const TOKYO_BAY_S2_AMP = 0.25; // m

function hoursSinceEpoch(date: Date): number {
  return date.getTime() / 3_600_000;
}

function tideHeightAt(date: Date): number {
  const h = hoursSinceEpoch(date);
  const m2 = TOKYO_BAY_M2_AMP * Math.cos((2 * Math.PI * h) / M2_PERIOD_HR);
  const s2 = TOKYO_BAY_S2_AMP * Math.cos((2 * Math.PI * h) / S2_PERIOD_HR);
  return m2 + s2;
}

export interface TideSample {
  time: Date;
  heightM: number;
  direction: 'up' | 'down';
}

export function sampleDay(date: Date, stepMinutes = 30): TideSample[] {
  const samples: TideSample[] = [];
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const stepMs = stepMinutes * 60_000;
  let prev = tideHeightAt(start);
  for (let i = 0; i < (24 * 60) / stepMinutes; i += 1) {
    const t = new Date(start.getTime() + i * stepMs);
    const h = tideHeightAt(t);
    samples.push({ time: t, heightM: h, direction: h >= prev ? 'up' : 'down' });
    prev = h;
  }
  return samples;
}

export interface TideExtremes {
  high: Date[];
  low: Date[];
}

export function findExtremes(samples: TideSample[]): TideExtremes {
  const high: Date[] = [];
  const low: Date[] = [];
  for (let i = 1; i < samples.length - 1; i += 1) {
    const a = samples[i - 1].heightM;
    const b = samples[i].heightM;
    const c = samples[i + 1].heightM;
    if (b > a && b > c) high.push(samples[i].time);
    if (b < a && b < c) low.push(samples[i].time);
  }
  return { high, low };
}

export function tidePhraseAt(date: Date): string {
  // 直近 1 時間前と現在で上げ/下げを判定
  const now = tideHeightAt(date);
  const prev = tideHeightAt(new Date(date.getTime() - 60 * 60_000));
  if (now > prev) return '上げ潮';
  return '下げ潮';
}
