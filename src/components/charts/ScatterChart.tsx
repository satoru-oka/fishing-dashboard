import { useMemo } from 'react';
import Plot from './Plot';
import { useData } from '../../context/DataContext';
import { axisTitle, baseConfig, baseLayout, palette, speciesPalette } from '../../theme';
import { ChartCard } from './ChartCard';

export function ScatterChart({ delay = 0 }: { delay?: number }) {
  const { filtered } = useData();

  const traces = useMemo(() => {
    const bySpecies = new Map<string, { x: number[]; y: number[]; text: string[] }>();
    for (const r of filtered) {
      if (!Number.isFinite(r.length_cm) || !Number.isFinite(r.weight_g) || r.weight_g <= 0) continue;
      const t = bySpecies.get(r.species) ?? { x: [], y: [], text: [] };
      t.x.push(r.length_cm);
      t.y.push(r.weight_g);
      t.text.push(`${r.spot_name} · ${r.caught_at.toISOString().slice(0, 10)}`);
      bySpecies.set(r.species, t);
    }
    // Sort by sample count desc so legend reads top-down most common
    const entries = Array.from(bySpecies.entries()).sort((a, b) => b[1].x.length - a[1].x.length);
    return entries.map(([sp, t], i) => ({
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: sp,
      x: t.x,
      y: t.y,
      text: t.text,
      marker: {
        color: speciesPalette[i % speciesPalette.length],
        size: 9,
        opacity: 0.75,
        line: { color: palette.bg, width: 1 },
      },
      hovertemplate: '<b>%{fullData.name}</b><br>%{x} cm / %{y} g<br>%{text}<extra></extra>',
    }));
  }, [filtered]);

  return (
    <ChartCard title="体長 × 重量" subtitle="Length vs weight · log Y" delay={delay}>
      <Plot
        data={traces}
        layout={{
          ...baseLayout,
          xaxis: { ...baseLayout.xaxis, ...axisTitle('体長 (cm)') },
          yaxis: { ...baseLayout.yaxis, type: 'log', ...axisTitle('重量 (g, log)') },
          legend: { ...baseLayout.legend, y: -0.28 },
        }}
        config={baseConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </ChartCard>
  );
}
