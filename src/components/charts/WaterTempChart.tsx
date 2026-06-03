import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { waterTempBins } from '../../lib/aggregations';
import { axisTitle, baseConfig, baseLayout, palette, plotlyColorscale, tempStops } from '../../theme';
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
              colorscale: plotlyColorscale(tempStops),
              cmin: 0,
              cmax: max,
              line: { width: 0 },
            },
            text: data.map((d) => `${d.count}`),
            textposition: 'outside',
            textfont: { color: palette.foam, size: 11 },
            hovertemplate: '%{x}<br><b>%{y}</b> 尾<extra></extra>',
          },
        ]}
        layout={{
          ...baseLayout,
          showlegend: false,
          xaxis: { ...baseLayout.xaxis, ...axisTitle('水温帯') },
          yaxis: { ...baseLayout.yaxis, ...axisTitle('釣果数 (尾)') },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
