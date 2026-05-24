import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { spotStats } from '../../lib/aggregations';
import { baseConfig, baseLayout } from '../../theme';
import { ChartCard } from './ChartCard';

export function SpotChart({ delay = 0 }: { delay?: number }) {
  const { filtered } = useData();
  const data = useMemo(() => spotStats(filtered), [filtered]);

  return (
    <ChartCard title="釣り場別 釣果＋平均体長" subtitle="Per-spot count + avg length" delay={delay}>
      <Plot
        data={[
          {
            type: 'bar',
            name: '釣果数',
            x: data.map((d) => d.spot),
            y: data.map((d) => d.count),
            marker: { color: '#f4a261', line: { width: 0 } },
            yaxis: 'y',
            hovertemplate: '<b>%{x}</b><br>釣果 %{y} 尾<extra></extra>',
          },
          {
            type: 'scatter',
            mode: 'lines+markers',
            name: '平均体長',
            x: data.map((d) => d.spot),
            y: data.map((d) => d.avgLength),
            line: { color: '#e9c46a', width: 2 },
            marker: { color: '#e76f51', size: 8 },
            yaxis: 'y2',
            hovertemplate: '<b>%{x}</b><br>平均 %{y:.1f} cm<extra></extra>',
          },
        ]}
        layout={{
          ...baseLayout,
          margin: { l: 56, r: 56, t: 24, b: 70 },
          xaxis: { ...baseLayout.xaxis, tickangle: -25 },
          yaxis: { ...baseLayout.yaxis, title: { text: '釣果数 (尾)', font: { color: '#f4a261', size: 11 } } },
          yaxis2: {
            ...baseLayout.yaxis,
            title: { text: '平均体長 (cm)', font: { color: '#e9c46a', size: 11 } },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'rgba(0,0,0,0)',
          },
          legend: { ...baseLayout.legend, y: -0.32 },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
