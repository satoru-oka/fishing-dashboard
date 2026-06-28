import createPlotlyComponentDefault from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';

// vite 8 / rolldown changed CJS interop: the factory's default import can arrive
// wrapped as { default: fn } instead of the function itself. Normalize so it stays
// callable regardless of the bundler's interop behavior.
const createPlotlyComponent =
  typeof createPlotlyComponentDefault === 'function'
    ? createPlotlyComponentDefault
    : (createPlotlyComponentDefault as unknown as { default: typeof createPlotlyComponentDefault })
        .default;

const Plot = createPlotlyComponent(Plotly as object);
export default Plot;
