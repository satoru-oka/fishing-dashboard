import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function clampIndex(value: number, total: number): number {
  return Math.max(0, Math.min(value, Math.max(0, total - 1)));
}

function findMonthIndex(months: Date[], date: Date): number {
  const target = startOfMonth(date).getTime();
  const exact = months.findIndex((month) => month.getTime() === target);
  if (exact !== -1) return exact;
  const after = months.findIndex((month) => month.getTime() > target);
  return after === -1 ? months.length - 1 : Math.max(0, after - 1);
}

function indicesForRange(months: Date[], dateRange: [Date, Date] | null): [number, number] {
  if (months.length === 0) return [0, 0];
  if (!dateRange) return [0, months.length - 1];
  const start = clampIndex(findMonthIndex(months, dateRange[0]), months.length);
  const end = clampIndex(findMonthIndex(months, dateRange[1]), months.length);
  return start <= end ? [start, end] : [end, start];
}

export function TimeSlider() {
  const { dataRange, filter, dispatch } = useData();
  const months = useMemo(() => (dataRange ? monthsBetween(dataRange[0], dataRange[1]) : []), [dataRange]);

  // Index into months[]; range = [startIdx, endIdx]
  const total = months.length;
  const [[startIdx, endIdx], setRangeIdx] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  const rangeIdxRef = useRef<[number, number]>([0, 0]);

  const commitRange = useCallback(
    (next: [number, number]) => {
      if (total === 0) return;
      const nextStart = clampIndex(Math.min(next[0], next[1]), total);
      const nextEnd = clampIndex(Math.max(next[0], next[1]), total);
      const clamped: [number, number] = [nextStart, nextEnd];
      rangeIdxRef.current = clamped;
      setRangeIdx(clamped);

      const isFull = nextStart === 0 && nextEnd === total - 1;
      dispatch({
        type: 'SET_DATE_RANGE',
        payload: isFull ? null : [months[nextStart], endOfMonth(months[nextEnd])],
      });
    },
    [dispatch, months, total],
  );

  // Keep the slider handles aligned with URL hydration, Reset, and filter pill clears.
  useEffect(() => {
    if (total === 0) return;
    const next = indicesForRange(months, filter.dateRange);
    rangeIdxRef.current = next;
    setRangeIdx(next);
  }, [filter.dateRange, months, total]);

  // playback: 1-month sliding window
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      const [currentStart, currentEnd] = rangeIdxRef.current;
      if (currentEnd >= total - 1) {
        setPlaying(false);
        return;
      }
      commitRange([Math.min(currentStart + 1, Math.max(0, total - 2)), currentEnd + 1]);
    }, 500);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [commitRange, playing, total]);

  const togglePlay = () => {
    if (total <= 1) return;
    if (!playing) {
      // if at end, restart
      if (endIdx >= total - 1) {
        commitRange([0, 0]);
      }
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

  const startLabel = format(months[Math.min(startIdx, total - 1)], 'yyyy年MM月');
  const endLabel = format(months[Math.min(endIdx, total - 1)], 'yyyy年MM月');

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
            onChange={(e) => {
              const v = Number(e.target.value);
              commitRange([Math.min(v, endIdx), endIdx]);
            }}
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
            onChange={(e) => {
              const v = Number(e.target.value);
              commitRange([startIdx, Math.max(v, startIdx)]);
            }}
            className="w-full accent-[var(--coral)]"
            aria-label="終了月"
          />
        </div>
      </div>
    </section>
  );
}
