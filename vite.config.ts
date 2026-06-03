import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react(), dataFolderPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
  },
});
