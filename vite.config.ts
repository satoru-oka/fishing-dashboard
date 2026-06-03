import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isInsideDir(parentDir: string, targetPath: string): boolean {
  const relative = path.relative(parentDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Serve /data/* from the repo-root `data/` folder during dev, and copy on build.
function dataFolderPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  return {
    name: 'fishing-dashboard:data-folder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/data/')) return next();
        let rel: string;
        try {
          rel = decodeURIComponent(req.url.replace(/^\/data\//, '').split('?')[0]);
        } catch {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }
        const filePath = path.resolve(dataDir, rel);
        if (!isInsideDir(dataDir, filePath)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist', 'data');
      if (!fs.existsSync(dataDir)) return;
      fs.mkdirSync(outDir, { recursive: true });
      for (const file of fs.readdirSync(dataDir)) {
        fs.copyFileSync(path.join(dataDir, file), path.join(outDir, file));
      }
    },
  };
}

// Pick base path: GitHub Pages serves at /<repo>/. Local dev stays at /.
const base = process.env.GITHUB_ACTIONS ? '/fishing-dashboard/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    dataFolderPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['data/catches_enriched.csv', 'data/tokyo_bay_stations_geo.csv'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,csv}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://api.open-meteo.com' ||
              url.origin === 'https://marine-api.open-meteo.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-forecast',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://basemaps.cartocdn.com' ||
              url.origin === 'https://demotiles.maplibre.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
      manifest: {
        name: '東京湾 釣果ダッシュボード',
        short_name: '釣果DB',
        description: '東京湾の釣果を 3D 地図と分析チャートで可視化',
        theme_color: '#0a1428',
        background_color: '#0a1428',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [],
      },
    }),
  ],
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
  },
});
