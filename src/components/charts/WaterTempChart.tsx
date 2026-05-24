import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { waterTempBins } from '../../lib/aggregations';
import { baseConfig, baseLayout } from '../../theme';
import { ChartCard } from './ChartCard';

export function WaterTempChart({ delay = 0 }: { delay?: number }) {
  const { filtered } = useData();
  const data = useMemo(() => waterTempBins(filtered, 4), [filtered]);
  const max = data.reduce((m, b) => Math.max(m, b.count), 1);

  return (
    <ChartCard title="水温帯 × 釣果" subtitle="Water-temp bins (4°C)" delay={delay}>
      <Plot
        data={[
          {
            type: 'bar',
            x: data.map((d) => d.label),
            y: data.map((d) => d.count),
            marker: {
              color: data.map((d) => d.count),
              colorscale: [
                [0, '#1e3457'],
                [0.5, '#e76f51'],
                [1, '#e9c46a'],
              ],
              cmin: 0,
              cmax: max,
              line: { width: 0 },
            },
            text: data.map((d) => `${d.count}`),
            textposition: 'outside',
            textfont: { color: '#e8e6d8', size: 11 },
            hovertemplate: '%{x}<br><b>%{y}</b> 尾<extra></extra>',
          },
        ]}
        layout={{
          ...baseLayout,
          showlegend: false,
          xaxis: { ...baseLayout.xaxis, title: { text: '水温帯', font: { color: '#c8c5b1', size: 11 } } },
          yaxis: { ...baseLayout.yaxis, title: { text: '釣果数 (尾)', font: { color: '#c8c5b1', size: 11 } } },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
