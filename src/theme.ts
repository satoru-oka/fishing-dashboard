import type { Layout, Config } from 'plotly.js-dist-min';

export const palette = {
  bgDeep: '#060d1c',
  bg: '#0a1428',
  card: '#0f1d33',
  card2: '#142544',
  border: '#1e3457',
  foam: '#e8e6d8',
  foamDim: '#c8c5b1',
  sky: '#87a8b8',
  skyDim: '#5a7385',
  sun: '#f4a261',
  coral: '#e76f51',
  gold: '#e9c46a',
  algae: '#8db38b',
};

// sunset gradient: deep navy → coral → gold
export const sunsetScale: Array<[number, string]> = [
  [0, '#1e3457'],
  [0.25, '#5a7385'],
  [0.5, '#e76f51'],
  [0.75, '#f4a261'],
  [1, '#e9c46a'],
];

export const speciesPalette = [
  '#e76f51', // coral
  '#f4a261', // sun
  '#e9c46a', // gold
  '#8db38b', // algae
  '#87a8b8', // sky
  '#b07ba0', // dusk plum
  '#d7d0bd', // foam tint
  '#caa66b', // sand
  '#7b9bc0', // muted blue
  '#c47a51', // burnt orange
  '#94b89a', // moss
  '#a99070', // taupe
  '#bf6a52', // brick
  '#dbb05c', // mustard
];

export const baseLayout: Partial<Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: {
    family: '"Noto Sans JP", system-ui, sans-serif',
    color: palette.foamDim,
    size: 12,
  },
  margin: { l: 56, r: 24, t: 36, b: 48 },
  xaxis: {
    gridcolor: 'rgba(135, 168, 184, 0.08)',
    zerolinecolor: 'rgba(135, 168, 184, 0.15)',
    linecolor: palette.border,
    tickcolor: palette.border,
    tickfont: { color: palette.foamDim, size: 11 },
    automargin: true,
  },
  yaxis: {
    gridcolor: 'rgba(135, 168, 184, 0.08)',
    zerolinecolor: 'rgba(135, 168, 184, 0.15)',
    linecolor: palette.border,
    tickcolor: palette.border,
    tickfont: { color: palette.foamDim, size: 11 },
    automargin: true,
  },
  legend: {
    bgcolor: 'rgba(15, 29, 51, 0.6)',
    bordercolor: palette.border,
    borderwidth: 1,
    font: { color: palette.foam, size: 11 },
    orientation: 'h',
    y: -0.22,
    x: 0,
  },
  hoverlabel: {
    bgcolor: palette.card2,
    bordercolor: palette.sun,
    font: { color: palette.foam, family: '"Noto Sans JP", system-ui, sans-serif' },
  },
  transition: { duration: 300, easing: 'cubic-in-out' },
};

export const baseConfig: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
};
