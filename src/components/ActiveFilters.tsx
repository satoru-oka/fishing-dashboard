import { format } from 'date-fns';
import { useData } from '../context/DataContext';

interface Pill {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
  tone: 'sun' | 'gold' | 'coral' | 'algae' | 'sky';
}

const toneClass: Record<Pill['tone'], string> = {
  sun: 'border-[var(--sun)] bg-[var(--sun)]/15 text-[var(--sun)]',
  gold: 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]',
  coral: 'border-[var(--coral)] bg-[var(--coral)]/15 text-[var(--coral)]',
  algae: 'border-[var(--algae)] bg-[var(--algae)]/15 text-[var(--algae)]',
  sky: 'border-[var(--sky)] bg-[var(--sky)]/15 text-[var(--sky)]',
};

export function ActiveFilters() {
  const { filter, dispatch, dataRange, reset } = useData();
  const pills: Pill[] = [];

  if (filter.dateRange) {
    const [a, b] = filter.dateRange;
    const sameMonth =
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    const dataFull =
      dataRange &&
      a.getTime() <= dataRange[0].getTime() &&
      b.getTime() >= dataRange[1].getTime();
    if (!dataFull) {
      const label = sameMonth
        ? format(a, 'yyyy年MM月')
        : `${format(a, 'yyyy.MM')} – ${format(b, 'yyyy.MM')}`;
      pills.push({
        key: 'date',
        label: '期間',
        value: label,
        tone: 'gold',
        onClear: () => dispatch({ type: 'SET_DATE_RANGE', payload: null }),
      });
    }
  }

  for (const sp of filter.species) {
    pills.push({
      key: `sp:${sp}`,
      label: '魚種',
      value: sp,
      tone: 'sun',
      onClear: () =>
        dispatch({
          type: 'SET_SPECIES',
          payload: filter.species.filter((s) => s !== sp),
        }),
    });
  }
  for (const sp of filter.spots) {
    pills.push({
      key: `spot:${sp}`,
      label: '釣り場',
      value: sp,
      tone: 'coral',
      onClear: () =>
        dispatch({
          type: 'SET_SPOTS',
          payload: filter.spots.filter((s) => s !== sp),
        }),
    });
  }
  for (const w of filter.weather) {
    pills.push({
      key: `w:${w}`,
      label: '天気',
      value: w,
      tone: 'sky',
      onClear: () =>
        dispatch({
          type: 'SET_WEATHER',
          payload: filter.weather.filter((s) => s !== w),
        }),
    });
  }
  for (const t of filter.tides) {
    pills.push({
      key: `t:${t}`,
      label: '潮',
      value: t,
      tone: 'sky',
      onClear: () =>
        dispatch({
          type: 'SET_TIDES',
          payload: filter.tides.filter((s) => s !== t),
        }),
    });
  }
  if (filter.excludeReleased) {
    pills.push({
      key: 'rel',
      label: 'リリース',
      value: '除外',
      tone: 'algae',
      onClear: () => dispatch({ type: 'SET_EXCLUDE_RELEASED', payload: false }),
    });
  }

  if (pills.length === 0) {
    return (
      <section className="reveal flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-8 py-2.5">
        <span className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sky-dim)]">
          Active Filters
        </span>
        <span className="font-sans text-[11px] text-[var(--foam-dim)]">
          フィルタなし — 全 166 件の釣果を表示中
        </span>
      </section>
    );
  }

  return (
    <section className="reveal flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-8 py-2.5">
      <span className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sun)]">
        Active Filters
      </span>
      {pills.map((p) => (
        <span
          key={p.key}
          className={
            'inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-sans text-[11px] ' +
            toneClass[p.tone]
          }
        >
          <span className="font-mincho text-[9px] uppercase tracking-[0.15em] opacity-70">
            {p.label}
          </span>
          <span className="font-medium">{p.value}</span>
          <button
            type="button"
            onClick={p.onClear}
            className="ml-1 text-[var(--foam-dim)] hover:text-[var(--foam)] focus:outline-none focus:ring-1 focus:ring-current"
            aria-label={`${p.label} ${p.value} を解除`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={reset}
        className="ml-auto font-mono text-[11px] text-[var(--sky)] underline-offset-2 hover:text-[var(--sun)] hover:underline"
      >
        全解除
      </button>
    </section>
  );
}
