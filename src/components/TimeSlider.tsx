import { useEffect, useMemo, useRef, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { useData } from '../context/DataContext';

function monthsBetween(a: Date, b: Date): Date[] {
  const months: Date[] = [];
  let cur = startOfMonth(a);
  const end = startOfMonth(b);
  while (cur.getTime() <= end.getTime()) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }
  return months;
}

function monthIndexForDate(date: Date, months: Date[]): number {
  if (months.length === 0) return 0;
  const first = months[0];
  const raw = (date.getFullYear() - first.getFullYear()) * 12 + date.getMonth() - first.getMonth();
  return Math.max(0, Math.min(months.length - 1, raw));
}

function indicesFromDateRange(dateRange: [Date, Date] | null, months: Date[]): [number, number] {
  if (months.length === 0) return [0, 0];
  if (!dateRange) return [0, months.length - 1];
  const start = monthIndexForDate(dateRange[0], months);
  const end = monthIndexForDate(dateRange[1], months);
  return [Math.min(start, end), Math.max(start, end)];
}

export function TimeSlider() {
  const { dataRange, filter, setDateRange } = useData();
  const months = useMemo(
    () => (dataRange ? monthsBetween(dataRange[0], dataRange[1]) : []),
    [dataRange],
  );
  const total = months.length;

  const [startIdx, endIdx] = useMemo(
    () => indicesFromDateRange(filter.dateRange, months),
    [filter.dateRange, months],
  );

  const applyIndices = (sIdx: number, eIdx: number) => {
    if (total === 0) return;
    const clampedStart = Math.max(0, Math.min(sIdx, total - 1));
    const clampedEnd = Math.max(clampedStart, Math.min(eIdx, total - 1));
    const isFull = clampedStart === 0 && clampedEnd === total - 1;
    if (isFull) {
      setDateRange(null);
    } else {
      setDateRange([months[clampedStart], endOfMonth(months[clampedEnd])]);
    }
  };

  const [playing, setPlaying] = useState(false);
  const latestRef = useRef<[number, number]>([startIdx, endIdx]);
  useEffect(() => {
    latestRef.current = [startIdx, endIdx];
  }, [startIdx, endIdx]);

  useEffect(() => {
    if (!playing || total <= 1) return;
    const id = window.setInterval(() => {
      const [s, e] = latestRef.current;
      if (e + 1 >= total) {
        setPlaying(false);
        return;
      }
      applyIndices(s + 1, e + 1);
    }, 500);
    return () => window.clearInterval(id);
    // applyIndices closes over months/total only; both move together with deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, total]);

  const togglePlay = () => {
    if (total <= 1) return;
    if (!playing && endIdx >= total - 1) {
      applyIndices(0, 0);
    }
    setPlaying((p) => !p);
  };

  if (total === 0) {
    return (
      <div className="border-y border-[var(--border)] bg-[var(--bg)] px-8 py-4 font-sans text-xs text-[var(--foam-dim)]">
        期間データなし
      </div>
    );
  }

  const startLabel = format(months[startIdx], 'yyyy年MM月');
  const endLabel = format(months[endIdx], 'yyyy年MM月');

  return (
    <section className="reveal border-y border-[var(--border)] bg-[var(--bg)] px-8 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? '一時停止' : '再生'}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sun)] bg-[var(--sun)]/10 text-[var(--sun)] transition hover:bg-[var(--sun)]/25 focus:outline-none focus:ring-2 focus:ring-[var(--sun)]/50"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex flex-col">
          <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            Timeline
          </div>
          <div className="font-mono text-sm text-[var(--foam)]">
            {startLabel} <span className="text-[var(--sky-dim)]">━━</span> {endLabel}
          </div>
        </div>
        <div className="ml-auto font-mono text-[11px] text-[var(--sky)]">
          {endIdx - startIdx + 1} / {total} months
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div>
          <label className="block font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            Start
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={startIdx}
            onChange={(e) => applyIndices(Math.min(Number(e.target.value), endIdx), endIdx)}
            className="w-full accent-[var(--sun)]"
            aria-label="開始月"
          />
        </div>
        <div>
          <label className="block font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            End
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={endIdx}
            onChange={(e) => applyIndices(startIdx, Math.max(Number(e.target.value), startIdx))}
            className="w-full accent-[var(--coral)]"
            aria-label="終了月"
          />
        </div>
      </div>
    </section>
  );
}
