import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { topSpecies } from '../../lib/aggregations';
import { axisTitle, baseConfig, baseLayout, coralSunGoldStops, lerpHex, palette } from '../../theme';
import { ChartCard } from './ChartCard';

function gradient(i: number, n: number): string {
  const t = n <= 1 ? 0 : i / (n - 1);
  return lerpHex(coralSunGoldStops, t);
}

export function TopSpeciesChart({ delay = 0 }: { delay?: number }) {
  const { filtered, filter, setSpecies } = useData();
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
            textfont: { color: palette.foam, size: 11 },
            hovertemplate: '<b>%{y}</b><br>%{x} 尾<extra></extra>',
          },
        ]}
        layout={{
          ...baseLayout,
          margin: { l: 92, r: 28, t: 24, b: 36 },
          showlegend: false,
          xaxis: { ...baseLayout.xaxis, ...axisTitle('釣果数 (尾)') },
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
          setSpecies(already ? [] : [sp]);
        }}
      />
    </ChartCard>
  );
}
