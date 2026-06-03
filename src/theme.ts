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

export type RGB = readonly [number, number, number];
export interface ColorStop {
  t: number;
  rgb: RGB;
  hex: string;
}

function rgb(r: number, g: number, b: number): RGB {
  return [r, g, b] as const;
}

function toHex(c: RGB): string {
  return (
    '#' +
    c
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function stop(t: number, c: RGB): ColorStop {
  return { t, rgb: c, hex: toHex(c) };
}

// coral → sun → gold: used by Map3D columns, Map3D legend bar, TopSpecies bars
export const coralSunGoldStops: ColorStop[] = [
  stop(0, rgb(231, 111, 81)),
  stop(0.5, rgb(244, 162, 97)),
  stop(1, rgb(233, 196, 106)),
];

// navy → coral → gold: used by WaterTemp bars
export const tempStops: ColorStop[] = [
  stop(0, rgb(30, 52, 87)),
  stop(0.5, rgb(231, 111, 81)),
  stop(1, rgb(233, 196, 106)),
];

// full sunset: deep navy → sky → coral → sun → gold (heatmap)
export const sunsetScale: Array<[number, string]> = [
  [0, palette.border],
  [0.25, palette.skyDim],
  [0.5, palette.coral],
  [0.75, palette.sun],
  [1, palette.gold],
];

export function lerpRgb(stops: ColorStop[], t: number): RGB {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (x <= b.t) {
      const k = b.t === a.t ? 0 : (x - a.t) / (b.t - a.t);
      return rgb(
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
      );
    }
  }
  return stops[stops.length - 1].rgb;
}

export function lerpHex(stops: ColorStop[], t: number): string {
  return toHex(lerpRgb(stops, t));
}

export function plotlyColorscale(stops: ColorStop[]): Array<[number, string]> {
  return stops.map((s) => [s.t, s.hex]);
}

export function cssLinearGradient(stops: ColorStop[], angle = 90): string {
  const inner = stops.map((s) => `${s.hex} ${Math.round(s.t * 100)}%`).join(', ');
  return `linear-gradient(${angle}deg, ${inner})`;
}

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

export function axisTitle(text: string, color: string = palette.foamDim) {
  return { title: { text, font: { color, size: 11 } } };
}
