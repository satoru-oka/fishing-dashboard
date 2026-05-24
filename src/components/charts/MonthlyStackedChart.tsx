import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { aggregateMonthlyBySpecies } from '../../lib/aggregations';
import { baseConfig, baseLayout, speciesPalette } from '../../theme';
import { ChartCard } from './ChartCard';

export function MonthlyStackedChart({ delay = 0 }: { delay?: number }) {
  const { filtered } = useData();
  const data = useMemo(() => aggregateMonthlyBySpecies(filtered, 6), [filtered]);

  const traces = data.species.map((sp, i) => ({
    type: 'bar' as const,
    name: sp,
    x: data.months,
    y: data.matrix[i],
    marker: {
      color: sp === 'その他' ? '#5a7385' : speciesPalette[i % speciesPalette.length],
      line: { width: 0 },
    },
    hovertemplate: '%{x}<br>' + sp + ': <b>%{y}</b><extra></extra>',
  }));

  return (
    <ChartCard title="月別 × 魚種" subtitle="Monthly stacked by species (top 6)" delay={delay}>
      <Plot
        data={traces}
        layout={{
          ...baseLayout,
          barmode: 'stack',
          xaxis: { ...baseLayout.xaxis, type: 'category', tickangle: -30 },
          yaxis: { ...baseLayout.yaxis, title: { text: '釣果数 (尾)', font: { color: '#c8c5b1', size: 11 } } },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
