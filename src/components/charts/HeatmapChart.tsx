import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { spotSpeciesMatrix } from '../../lib/aggregations';
import { baseConfig, baseLayout, sunsetScale } from '../../theme';
import { ChartCard } from './ChartCard';

export function HeatmapChart({ delay = 0 }: { delay?: number }) {
  const { filtered } = useData();
  const data = useMemo(() => spotSpeciesMatrix(filtered), [filtered]);

  return (
    <ChartCard title="釣り場 × 魚種" subtitle="Spot × species heatmap" delay={delay}>
      <Plot
        data={[
          {
            type: 'heatmap',
            x: data.species,
            y: data.spots,
            z: data.matrix,
            colorscale: sunsetScale,
            hovertemplate: '%{y} × %{x}<br><b>%{z}</b> 尾<extra></extra>',
            colorbar: {
              tickfont: { color: '#c8c5b1', size: 10 },
              outlinewidth: 0,
              thickness: 10,
              len: 0.85,
            },
            xgap: 1,
            ygap: 1,
          },
        ]}
        layout={{
          ...baseLayout,
          margin: { l: 110, r: 24, t: 24, b: 80 },
          xaxis: { ...baseLayout.xaxis, tickangle: -30 },
          yaxis: { ...baseLayout.yaxis, automargin: true },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
