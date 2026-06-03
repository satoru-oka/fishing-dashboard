import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { fetchForecast, type DailyForecast } from '../lib/weather';
import {
  buildSpotProfiles,
  rankRecommendations,
  scoreSpotForDay,
  type Recommendation,
} from '../lib/recommendation';
import { tidePhraseAt } from '../lib/tide';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function Recommendations() {
  const { rows } = useData();
  const profiles = useMemo(() => buildSpotProfiles(rows), [rows]);
  const totalCatchMax = useMemo(
    () => profiles.reduce((m, p) => Math.max(m, p.catchCount), 0),
    [profiles],
  );

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recsByDay, setRecsByDay] = useState<{ date: string; items: Recommendation[] }[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const handleLoad = async () => {
    if (profiles.length === 0) {
      setError('釣り場データがありません');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const results = await Promise.all(
        profiles.map(async (p) => {
          try {
            const days = await fetchForecast(p.latitude, p.longitude, 3);
            return { profile: p, days };
          } catch {
            return { profile: p, days: [] as DailyForecast[] };
          }
        }),
      );
      const byDate = new Map<string, Recommendation[]>();
      for (const { profile, days } of results) {
        for (const d of days) {
          const rec = scoreSpotForDay(profile, d, totalCatchMax);
          const list = byDate.get(d.date) ?? [];
          list.push(rec);
          byDate.set(d.date, list);
        }
      }
      const sorted = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, items]) => ({ date, items: rankRecommendations(items) }));
      if (sorted.length === 0) {
        setError('予報を取得できませんでした');
        setStatus('error');
        return;
      }
      setRecsByDay(sorted);
      setLoadedAt(new Date());
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー');
      setStatus('error');
    }
  };

  return (
    <section className="reveal border-y border-[var(--border)] bg-[var(--bg)] px-8 py-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-4">
        <div>
          <div className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sun)]">
            Recommendation
          </div>
          <div className="font-serif text-lg text-[var(--foam)]">明日の釣り場おすすめ</div>
          <p className="mt-1 font-sans text-[11px] text-[var(--foam-dim)]">
            Open-Meteo の天気・海況予報 + 過去釣果の月別実績 + 簡易潮汐推定でスコアリングします。
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoad}
          disabled={status === 'loading'}
          className="ml-auto rounded-sm border border-[var(--sun)] bg-[var(--sun)]/15 px-4 py-2 font-mincho text-xs tracking-[0.2em] text-[var(--sun)] transition hover:bg-[var(--sun)]/25 disabled:opacity-50"
        >
          {status === 'loading' ? '取得中…' : status === 'ready' ? '再取得' : '予報を取得'}
        </button>
      </div>
      {loadedAt && status === 'ready' && (
        <div className="mb-3 font-mono text-[10px] text-[var(--sky)]">
          更新 {format(loadedAt, 'yyyy.MM.dd HH:mm')}
        </div>
      )}
      {error && status === 'error' && (
        <div className="rounded-sm border border-[var(--coral)] bg-[var(--coral)]/10 px-3 py-2 font-sans text-[12px] text-[var(--coral)]">
          {error}
        </div>
      )}
      {status === 'idle' && (
        <p className="font-sans text-[11px] text-[var(--foam-dim)]">
          「予報を取得」を押すと、外部 API から各釣り場の天気予報を取り寄せておすすめを並べます。
        </p>
      )}
      {status === 'ready' && (
        <div className="space-y-4">
          {recsByDay.map(({ date, items }) => (
            <DayBlock key={date} date={date} items={items} />
          ))}
        </div>
      )}
    </section>
  );
}

function DayBlock({ date, items }: { date: string; items: Recommendation[] }) {
  const day = new Date(date + 'T12:00:00');
  const top = items.slice(0, 3);
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div className="font-mincho text-sm text-[var(--foam)]">
          {format(day, 'M月d日 (E)')}
        </div>
        <div className="font-mono text-[11px] text-[var(--sky)]">{tidePhraseAt(day)}</div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {top.map((r, idx) => (
          <RecommendationCard key={r.spot} rec={r} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-mincho text-[10px] text-[var(--sun)]">#{rank}</span>
          <span className="ml-2 font-serif text-base text-[var(--foam)]">{rec.spot}</span>
        </div>
        <span className="font-mono text-xs text-[var(--gold)]">
          {Math.round(rec.score * 100)} pt
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-[var(--foam-dim)]">
        <div>天気</div>
        <div className="text-right text-[var(--foam)]">{rec.forecast.summary}</div>
        <div>気温</div>
        <div className="text-right">
          {rec.forecast.tempMin.toFixed(0)} – {rec.forecast.tempMax.toFixed(0)} °C
        </div>
        <div>風 (最大)</div>
        <div className="text-right">{rec.forecast.windMax.toFixed(1)} m/s</div>
        <div>降水</div>
        <div className="text-right">{rec.forecast.precip.toFixed(1)} mm</div>
        {Number.isFinite(rec.forecast.waveHeight) && (
          <>
            <div>波高</div>
            <div className="text-right">{rec.forecast.waveHeight.toFixed(1)} m</div>
          </>
        )}
      </div>
      {rec.reasons.length > 0 && (
        <ul className="mt-2 list-disc pl-5 font-sans text-[11px] text-[var(--algae)]">
          {rec.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {rec.warnings.length > 0 && (
        <ul className="mt-1 list-disc pl-5 font-sans text-[11px] text-[var(--coral)]">
          {rec.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
