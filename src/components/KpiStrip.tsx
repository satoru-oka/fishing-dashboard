import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { computeKpi } from '../lib/aggregations';

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay?: number;
}

function Card({ label, value, sub, accent = 'var(--sun)', delay = 0 }: CardProps) {
  return (
    <div
      className="reveal group relative overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--card)] px-5 py-4 transition hover:bg-[var(--card-2)] hover:border-[var(--sun)]/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="font-mincho text-[10px] uppercase tracking-[0.25em] text-[var(--sky-dim)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-serif text-3xl font-light leading-none text-[var(--foam)]" style={{ color: accent }}>
          {value}
        </div>
        {sub && <div className="font-mono text-[11px] text-[var(--foam-dim)]">{sub}</div>}
      </div>
    </div>
  );
}

export function KpiStrip() {
  const { filtered } = useData();
  const kpi = useMemo(() => computeKpi(filtered), [filtered]);

  return (
    <section className="grid grid-cols-2 gap-3 px-8 py-5 md:grid-cols-3 xl:grid-cols-5">
      <Card label="Total Catches" value={kpi.totalCount.toLocaleString()} sub="尾" delay={0} accent="var(--sun)" />
      <Card label="Trips" value={kpi.tripCount.toLocaleString()} sub="出船" delay={50} accent="var(--gold)" />
      <Card label="Avg Length" value={kpi.avgLength ? kpi.avgLength.toFixed(1) : '—'} sub="cm" delay={100} accent="var(--foam)" />
      <Card
        label="Max Weight"
        value={kpi.maxWeight ? kpi.maxWeight.toLocaleString() : '—'}
        sub={kpi.maxWeightSpecies ? `g · ${kpi.maxWeightSpecies}` : 'g'}
        delay={150}
        accent="var(--coral)"
      />
      <Card
        label="Release Rate"
        value={`${kpi.releaseRate.toFixed(1)}`}
        sub="%"
        delay={200}
        accent="var(--algae)"
      />
    </section>
  );
}
