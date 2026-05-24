import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = createPlotlyComponent(Plotly as any);
export default Plot;
