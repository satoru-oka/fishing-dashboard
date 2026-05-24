import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  delay?: number;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, delay = 0, children }: Props) {
  return (
    <div
      className="reveal flex flex-col rounded-sm border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--sun)]/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <h3 className="font-mincho text-base text-[var(--foam)]">{title}</h3>
          {subtitle && (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--sky-dim)]">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-[280px] flex-1">{children}</div>
    </div>
  );
}
