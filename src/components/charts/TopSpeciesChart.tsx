import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { topSpecies } from '../../lib/aggregations';
import { baseConfig, baseLayout } from '../../theme';
import { ChartCard } from './ChartCard';

function gradient(i: number, n: number): string {
  // coral -> sun -> gold
  const t = n <= 1 ? 0 : i / (n - 1);
  // simple lerp via two stops
  if (t < 0.5) {
    const k = t / 0.5;
    const r = Math.round(231 + (244 - 231) * k);
    const g = Math.round(111 + (162 - 111) * k);
    const b = Math.round(81 + (97 - 81) * k);
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.5) / 0.5;
  const r = Math.round(244 + (233 - 244) * k);
  const g = Math.round(162 + (196 - 162) * k);
  const b = Math.round(97 + (106 - 97) * k);
  return `rgb(${r},${g},${b})`;
}

export function TopSpeciesChart({ delay = 0 }: { delay?: number }) {
  const { filtered, filter, dispatch } = useData();
  const data = useMemo(() => topSpecies(filtered, 10), [filtered]);

  const labels = data.map((d) => d.species).reverse();
  const counts = data.map((d) => d.count).reverse();
  const colors = labels.map((_, i) => gradient(i, labels.length));

  return (
    <ChartCard title="魚種 Top10" subtitle="Catches by species" delay={delay}>
      <Plot
        data={[
          {
            type: 'bar',
            orientation: 'h',
            x: counts,
            y: labels,
            marker: { color: colors, line: { width: 0 } },
            text: counts.map((c) => `${c}`),
            textposition: 'outside',
            textfont: { color: '#e8e6d8', size: 11 },
            hovertemplate: '<b>%{y}</b><br>%{x} 尾<extra></extra>',
          },
        ]}
        layout={{
          ...baseLayout,
          margin: { l: 92, r: 28, t: 24, b: 36 },
          showlegend: false,
          xaxis: { ...baseLayout.xaxis, title: { text: '釣果数 (尾)', font: { color: '#c8c5b1', size: 11 } } },
          yaxis: { ...baseLayout.yaxis, automargin: true },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        onClick={(e) => {
          const pt = e.points?.[0];
          if (!pt) return;
          const sp = String(pt.y);
          const already = filter.species.length === 1 && filter.species[0] === sp;
          dispatch({ type: 'SET_SPECIES', payload: already ? [] : [sp] });
        }}
      />
    </ChartCard>
  );
}
