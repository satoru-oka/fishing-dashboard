import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { computeSeasonalSummary, forecastDays, type ForecastPoint } from '../lib/forecast';
import { uniqueValues } from '../lib/aggregations';
import { lerpRgb, type ColorStop } from '../theme';

const STOPS: ColorStop[] = [
  { t: 0, rgb: [40, 60, 90], hex: '#283c5a' },
  { t: 0.25, rgb: [80, 140, 200], hex: '#508cc8' },
  { t: 0.5, rgb: [240, 200, 80], hex: '#f0c850' },
  { t: 0.75, rgb: [240, 130, 80], hex: '#f08250' },
  { t: 1, rgb: [220, 60, 60], hex: '#dc3c3c' },
];

function scoreColor(score: number): string {
  const [r, g, b] = lerpRgb(STOPS, score);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function ForecastView() {
  const { rows } = useData();
  const species = useMemo(() => uniqueValues(rows, (r) => r.species).sort(), [rows]);
  const spots = useMemo(() => uniqueValues(rows, (r) => r.spot_name).sort(), [rows]);
  const [selSpecies, setSelSpecies] = useState<string>('');
  const [selSpot, setSelSpot] = useState<string>('');

  const summary = useMemo(
    () => computeSeasonalSummary(rows, { species: selSpecies || undefined, spot: selSpot || undefined }),
    [rows, selSpecies, selSpot],
  );

  const forecast = useMemo(
    () =>
      forecastDays(rows, {
        species: selSpecies || undefined,
        spot: selSpot || undefined,
        days: 30,
      }),
    [rows, selSpecies, selSpot],
  );

  const peak = useMemo<ForecastPoint | null>(() => {
    if (forecast.length === 0) return null;
    let best = forecast[0];
    for (const p of forecast) if (p.score > best.score) best = p;
    return best;
  }, [forecast]);

  return (
    <section className="reveal border-y border-[var(--border)] bg-[var(--bg)] px-8 py-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-4">
        <div>
          <div className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sun)]">
            Forecast
          </div>
          <div className="font-serif text-lg text-[var(--foam)]">次に釣れそうな日</div>
          <p className="mt-1 font-sans text-[11px] text-[var(--foam-dim)]">
            過去釣果から季節周期 (Fourier 第 1〜3 次) を抽出し、向こう 30 日のスコアを算出します。TF.js は使わず、推論はすべてブラウザで完結。
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
              魚種
            </span>
            <select
              value={selSpecies}
              onChange={(e) => setSelSpecies(e.target.value)}
              className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-sans text-sm text-[var(--foam)]"
            >
              <option value="">指定なし</option>
              {species.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
              釣り場
            </span>
            <select
              value={selSpot}
              onChange={(e) => setSelSpot(e.target.value)}
              className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-sans text-sm text-[var(--foam)]"
            >
              <option value="">指定なし</option>
              {spots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {summary.sampleCount === 0 ? (
        <p className="font-sans text-xs text-[var(--foam-dim)]">条件に該当する釣果がありません。</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
          <div>
            <div className="mb-2 font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
              向こう 30 日
            </div>
            <div className="flex flex-wrap gap-1">
              {forecast.map((p) => (
                <div
                  key={p.date.toISOString()}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded-sm border border-[var(--border)] text-center"
                  style={{ backgroundColor: scoreColor(p.score), color: p.score > 0.5 ? '#1b1b1b' : '#e0e0e0' }}
                  title={`${format(p.date, 'yyyy-MM-dd')}\nスコア: ${Math.round(p.score * 100)}\n季節: ${Math.round(
                    p.reasons.season * 100,
                  )} / 釣り場: ${Math.round(p.reasons.spot * 100)}`}
                >
                  <div className="font-mono text-[10px] leading-none">{format(p.date, 'M/d')}</div>
                  <div className="mt-0.5 font-mincho text-[10px] leading-none opacity-80">
                    {Math.round(p.score * 100)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-[var(--sky-dim)]">
              <span>低</span>
              <div
                className="h-1.5 w-32 rounded-sm"
                style={{
                  background:
                    'linear-gradient(to right, rgb(40,60,90), rgb(80,140,200), rgb(240,200,80), rgb(240,130,80), rgb(220,60,60))',
                }}
              />
              <span>高</span>
            </div>
          </div>

          <div className="rounded-sm border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sun)]">
              Insights
            </div>
            <ul className="mt-2 space-y-1.5 font-sans text-[12px] text-[var(--foam)]">
              <li>
                サンプル数 :{' '}
                <span className="font-mono text-[var(--gold)]">{summary.sampleCount}</span>
              </li>
              <li>
                季節のピーク :{' '}
                <span className="font-mono text-[var(--gold)]">
                  {MONTH_LABELS[summary.peakMonth - 1]}
                </span>
              </li>
              {Number.isFinite(summary.waterTempMean) && (
                <li>
                  平均水温 :{' '}
                  <span className="font-mono text-[var(--gold)]">
                    {summary.waterTempMean.toFixed(1)} °C
                  </span>
                </li>
              )}
              {peak && (
                <li>
                  30 日内の最良候補 :{' '}
                  <span className="font-mono text-[var(--coral)]">
                    {format(peak.date, 'M/d (E)')}
                  </span>
                  <span className="ml-1 font-mono text-[var(--sky)]">
                    {Math.round(peak.score * 100)} pt
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-3">
              <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
                月別スコア
              </div>
              <div className="mt-1 grid grid-cols-12 gap-0.5">
                {summary.fittedMonths.map((m) => (
                  <div
                    key={m.month}
                    className="flex h-10 flex-col items-center justify-center text-center"
                    style={{ backgroundColor: scoreColor(m.score) }}
                    title={`${m.month}月 - スコア ${Math.round(m.score * 100)}`}
                  >
                    <div
                      className="font-mono text-[9px]"
                      style={{ color: m.score > 0.5 ? '#1b1b1b' : '#e0e0e0' }}
                    >
                      {m.month}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
