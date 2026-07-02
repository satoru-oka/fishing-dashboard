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

// Only `.csv` files are served/published. Using endsWith (not path.extname) so
// a file literally named `.csv` is still matched.
const isCsv = (filePath: string): boolean => filePath.toLowerCase().endsWith('.csv');

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
        // Strip leading slashes so an absolute-looking segment (e.g. from a
        // `/data//x.csv` or `/data/%2Fx.csv` request) stays relative to dataDir
        // instead of overriding it in path.resolve and 404-ing a real file.
        rel = rel.replace(/^\/+/, '');
        const filePath = path.resolve(dataDir, rel);
        // Only CSV files are served from data/. Anything else → 404 (no path hints).
        if (!isCsv(filePath)) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        // Reject paths that resolve outside data/ — return 404 to avoid leaking
        // whether a sibling path exists (no 403 "Forbidden" probing hints).
        if (!isInsideDir(dataDir, filePath)) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        // Resolve symlinks and stat the real target in one guarded step:
        // realpathSync/statSync throw on a missing/unreadable file, so catch
        // that and 404 instead of letting it surface as a 500.
        let realPath: string;
        let stat: fs.Stats;
        try {
          realPath = fs.realpathSync(filePath);
          stat = fs.statSync(realPath);
        } catch {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        // Re-check after resolving symlinks: a symlink inside data/ could point
        // outside it (or at a non-CSV / non-file target), bypassing the lexical
        // checks above.
        if (!isInsideDir(dataDir, realPath) || !isCsv(realPath) || !stat.isFile()) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = fs.createReadStream(realPath);
        stream.on('error', () => {
          // A read error after headers are sent can't be turned into a status
          // code; just tear down the response instead of crashing the dev server.
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Read Error');
          } else {
            res.destroy();
          }
        });
        stream.pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist', 'data');
      if (!fs.existsSync(dataDir)) return;
      // Mirror the dev guard at build time: copy only regular .csv files,
      // recursing into subdirectories and skipping symlinks (Dirent.isFile() is
      // false for symlinks) so non-CSV/secret files are not published and a
      // subdirectory doesn't crash the build with EISDIR.
      const copyCsvTree = (srcDir: string, destDir: string): void => {
        for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
          const src = path.join(srcDir, entry.name);
          const dest = path.join(destDir, entry.name);
          if (entry.isDirectory()) {
            copyCsvTree(src, dest);
          } else if (entry.isFile() && isCsv(entry.name)) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
          }
        }
      };
      copyCsvTree(dataDir, outDir);
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
  },
});
