import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { uniqueValues } from '../lib/aggregations';

interface ChipsProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function Chips({ label, options, selected, onChange }: ChipsProps) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">{label}</div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="font-mono text-[10px] text-[var(--sky)] hover:text-[var(--sun)]"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={
                'rounded-sm border px-2.5 py-1 font-sans text-[11px] transition ' +
                (on
                  ? 'border-[var(--sun)] bg-[var(--sun)]/15 text-[var(--sun)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foam-dim)] hover:border-[var(--sky)] hover:text-[var(--foam)]')
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FiltersPanel() {
  const {
    rows,
    filter,
    setSpecies,
    setSpots,
    setWeather,
    setTides,
    toggleExcludeReleased,
  } = useData();

  const speciesList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.species, (counts.get(r.species) ?? 0) + r.count);
    return uniqueValues(rows, (r) => r.species).sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
    );
  }, [rows]);
  const spotList = useMemo(() => uniqueValues(rows, (r) => r.spot_name).sort(), [rows]);
  const weatherList = useMemo(() => uniqueValues(rows, (r) => r.weather).sort(), [rows]);
  const tideList = useMemo(() => uniqueValues(rows, (r) => r.tide).sort(), [rows]);

  return (
    <aside className="reveal flex h-full flex-col gap-5 overflow-y-auto border-l border-[var(--border)] bg-[var(--card)] p-5">
      <div>
        <div className="font-mincho text-xs uppercase tracking-[0.3em] text-[var(--sun)]">Filters</div>
        <div className="mt-1 font-serif text-lg text-[var(--foam)]">条件で絞る</div>
        <p className="mt-1 font-sans text-[11px] text-[var(--foam-dim)]">
          選択した条件は地図・全チャート・KPI に即時反映され、URL にも記録されます。
        </p>
      </div>

      <Chips label="魚種 Species" options={speciesList} selected={filter.species} onChange={setSpecies} />
      <Chips label="釣り場 Spot" options={spotList} selected={filter.spots} onChange={setSpots} />
      <Chips label="天気 Weather" options={weatherList} selected={filter.weather} onChange={setWeather} />
      <Chips label="潮 Tide" options={tideList} selected={filter.tides} onChange={setTides} />

      <label className="mt-auto flex items-center justify-between rounded-sm border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 cursor-pointer">
        <div>
          <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">
            Release
          </div>
          <div className="font-sans text-xs text-[var(--foam)]">リリースを除外</div>
        </div>
        <input
          type="checkbox"
          checked={filter.excludeReleased}
          onChange={toggleExcludeReleased}
          className="h-4 w-4 cursor-pointer accent-[var(--sun)]"
          aria-label="リリースを除外"
        />
      </label>
    </aside>
  );
}
