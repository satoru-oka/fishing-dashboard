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

export function TimeSlider() {
  const { dataRange, filter, dispatch } = useData();
  const months = useMemo(() => (dataRange ? monthsBetween(dataRange[0], dataRange[1]) : []), [dataRange]);

  // Index into months[]; range = [startIdx, endIdx]
  const total = months.length;
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(Math.max(0, total - 1));
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setStartIdx(0);
    setEndIdx(Math.max(0, total - 1));
  }, [total]);

  // sync filter dateRange from indices
  useEffect(() => {
    if (total === 0) return;
    const s = months[Math.min(startIdx, total - 1)];
    const e = endOfMonth(months[Math.min(endIdx, total - 1)]);
    const isFull = startIdx === 0 && endIdx === total - 1;
    dispatch({ type: 'SET_DATE_RANGE', payload: isFull ? null : [s, e] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIdx, endIdx, total]);

  // if filter.dateRange is externally reset (e.g. from RESET), realign
  useEffect(() => {
    if (filter.dateRange === null && total > 0) {
      setStartIdx(0);
      setEndIdx(total - 1);
    }
  }, [filter.dateRange, total]);

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
      setEndIdx((prevEnd) => {
        const nextEnd = prevEnd + 1;
        if (nextEnd >= total) {
          setPlaying(false);
          return total - 1;
        }
        return nextEnd;
      });
      setStartIdx((prevStart) => {
        const nextStart = prevStart + 1;
        if (nextStart >= total - 1) return Math.max(0, total - 2);
        return nextStart;
      });
    }, 500);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, total]);

  const togglePlay = () => {
    if (total <= 1) return;
    if (!playing) {
      // if at end, restart
      if (endIdx >= total - 1) {
        setStartIdx(0);
        setEndIdx(0);
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
              setStartIdx(Math.min(v, endIdx));
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
              setEndIdx(Math.max(v, startIdx));
            }}
            className="w-full accent-[var(--coral)]"
            aria-label="終了月"
          />
        </div>
      </div>
    </section>
  );
}
