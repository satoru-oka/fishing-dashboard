import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-deep': 'var(--bg-deep)',
        bg: 'var(--bg)',
        card: 'var(--card)',
        'card-2': 'var(--card-2)',
        border: 'var(--border)',
        foam: 'var(--foam)',
        'foam-dim': 'var(--foam-dim)',
        sky: 'var(--sky)',
        'sky-dim': 'var(--sky-dim)',
        sun: 'var(--sun)',
        coral: 'var(--coral)',
        gold: 'var(--gold)',
        algae: 'var(--algae)',
      },
      fontFamily: {
        serif: ['Fraunces', 'Shippori Mincho B1', 'serif'],
        mincho: ['"Shippori Mincho B1"', 'Fraunces', 'serif'],
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
