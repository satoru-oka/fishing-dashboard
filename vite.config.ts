import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Serve /data/* from the repo-root `data/` folder during dev, and copy on build.
function dataFolderPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  return {
    name: 'fishing-dashboard:data-folder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/data/')) return next();
        const rel = decodeURIComponent(req.url.replace(/^\/data\//, '').split('?')[0]);
        const filePath = path.join(dataDir, rel);
        if (!filePath.startsWith(dataDir)) return next();
        if (!fs.existsSync(filePath)) return next();
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

export default defineConfig({
  plugins: [react(), dataFolderPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
  },
});
