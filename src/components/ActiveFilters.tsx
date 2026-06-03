import { format } from 'date-fns';
import { useData } from '../context/DataContext';

type Tone = 'sun' | 'gold' | 'coral' | 'algae' | 'sky';

interface Pill {
  key: string;
  label: string;
  value: string;
  onClear: () => void;
  tone: Tone;
}

const toneClass: Record<Tone, string> = {
  sun: 'border-[var(--sun)] bg-[var(--sun)]/15 text-[var(--sun)]',
  gold: 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]',
  coral: 'border-[var(--coral)] bg-[var(--coral)]/15 text-[var(--coral)]',
  algae: 'border-[var(--algae)] bg-[var(--algae)]/15 text-[var(--algae)]',
  sky: 'border-[var(--sky)] bg-[var(--sky)]/15 text-[var(--sky)]',
};

type MultiField = 'species' | 'spots' | 'weather' | 'tides';
const MULTI_FIELDS: Array<{ key: MultiField; label: string; tone: Tone }> = [
  { key: 'species', label: '魚種', tone: 'sun' },
  { key: 'spots', label: '釣り場', tone: 'coral' },
  { key: 'weather', label: '天気', tone: 'sky' },
  { key: 'tides', label: '潮', tone: 'sky' },
];

export function ActiveFilters() {
  const {
    rows,
    filter,
    dataRange,
    reset,
    setDateRange,
    setSpecies,
    setSpots,
    setWeather,
    setTides,
    setExcludeReleased,
  } = useData();

  const multiSetters: Record<MultiField, (v: string[]) => void> = {
    species: setSpecies,
    spots: setSpots,
    weather: setWeather,
    tides: setTides,
  };

  const pills: Pill[] = [];

  if (filter.dateRange) {
    const [a, b] = filter.dateRange;
    const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    const dataFull =
      dataRange &&
      a.getTime() <= dataRange[0].getTime() &&
      b.getTime() >= dataRange[1].getTime();
    if (!dataFull) {
      pills.push({
        key: 'date',
        label: '期間',
        value: sameMonth ? format(a, 'yyyy年MM月') : `${format(a, 'yyyy.MM')} – ${format(b, 'yyyy.MM')}`,
        tone: 'gold',
        onClear: () => setDateRange(null),
      });
    }
  }

  for (const { key, label, tone } of MULTI_FIELDS) {
    const values = filter[key] as string[];
    for (const v of values) {
      pills.push({
        key: `${key}:${v}`,
        label,
        value: v,
        tone,
        onClear: () => multiSetters[key](values.filter((s) => s !== v)),
      });
    }
  }

  if (filter.excludeReleased) {
    pills.push({
      key: 'rel',
      label: 'リリース',
      value: '除外',
      tone: 'algae',
      onClear: () => setExcludeReleased(false),
    });
  }

  if (pills.length === 0) {
    return (
      <section className="reveal flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-8 py-2.5">
        <span className="font-mincho text-[10px] uppercase tracking-[0.3em] text-[var(--sky-dim)]">
          Active Filters
        </span>
        <span className="font-sans text-[11px] text-[var(--foam-dim)]">
          フィルタなし — 全 {rows.length} 件の釣果を表示中
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
