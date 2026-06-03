import { useMemo } from 'react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { uniqueValues } from '../lib/aggregations';
import { CsvMenu } from './CsvMenu';

export function Header() {
  const { rows, dataRange, filter, reset, filtered, loading } = useData();
  const range = filter.dateRange ?? dataRange;
  const { spotCount, speciesCount } = useMemo(
    () => ({
      spotCount: uniqueValues(rows, (r) => r.spot_name).length,
      speciesCount: uniqueValues(rows, (r) => r.species).length,
    }),
    [rows],
  );

  return (
    <header className="reveal flex items-end justify-between border-b border-[var(--border)] px-8 py-6">
      <div>
        <div className="font-mincho text-xs uppercase tracking-[0.3em] text-[var(--sky-dim)]">
          Tokyo Bay · Angler's Almanac
        </div>
        <h1 className="mt-1 font-serif text-[2.4rem] leading-none text-[var(--foam)]">
          東京湾 <span className="text-[var(--sun)]">釣果</span> ダッシュボード
        </h1>
        <p className="mt-2 font-sans text-sm text-[var(--foam-dim)]">
          {spotCount > 0 && speciesCount > 0
            ? `3D 地図と 6 枚の分析チャートで、湾内 ${spotCount} 釣り場・${speciesCount} 魚種の釣果を読み解く。`
            : '3D 地図と 6 枚の分析チャートで、東京湾の釣果を読み解く。'}
        </p>
      </div>
      <div className="flex items-end gap-6">
        <div className="text-right">
          <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            Period
          </div>
          <div className="font-mono text-sm text-[var(--foam)]">
            {range
              ? `${format(range[0], 'yyyy.MM.dd')} ─ ${format(range[1], 'yyyy.MM.dd')}`
              : '—'}
          </div>
          <div className="font-mono text-[11px] text-[var(--sky)]">
            {loading ? 'loading…' : `${filtered.length} records`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-mincho text-xs tracking-[0.2em] text-[var(--foam-dim)] transition hover:border-[var(--sun)] hover:text-[var(--sun)] focus:outline-none focus:ring-2 focus:ring-[var(--sun)]/50"
          >
            ＲＥＳＥＴ
          </button>
          <CsvMenu />
        </div>
      </div>
    </header>
  );
}
