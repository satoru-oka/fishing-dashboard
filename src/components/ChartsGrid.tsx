import { MonthlyStackedChart } from './charts/MonthlyStackedChart';
import { TopSpeciesChart } from './charts/TopSpeciesChart';
import { ScatterChart } from './charts/ScatterChart';
import { HeatmapChart } from './charts/HeatmapChart';
import { WaterTempChart } from './charts/WaterTempChart';
import { SpotChart } from './charts/SpotChart';

export function ChartsGrid() {
  return (
    <section className="grid grid-cols-1 gap-3 p-8 md:grid-cols-2 xl:grid-cols-3">
      <MonthlyStackedChart delay={0} />
      <TopSpeciesChart delay={60} />
      <ScatterChart delay={120} />
      <HeatmapChart delay={180} />
      <WaterTempChart delay={240} />
      <SpotChart delay={300} />
    </section>
  );
}
