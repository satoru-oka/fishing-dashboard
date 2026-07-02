import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sendPlain(res: ServerResponse, statusCode: number, body: string) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(body);
}

// Reject paths that escape `baseDir` (via `..` or an absolute segment).
function isInsideDir(baseDir: string, filePath: string) {
  const relative = path.relative(baseDir, filePath);
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

// Only `.csv` files are servable/publishable. Using endsWith (not path.extname)
// so a file literally named `.csv` is still matched.
const isCsv = (filePath: string) => filePath.toLowerCase().endsWith('.csv');

// Serve /data/* from the repo-root `data/` folder during dev, and copy on build.
function dataFolderPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  // Resolve the real dir once so symlink checks compare like-for-like paths
  // (e.g. macOS /tmp -> /private/tmp).
  const realDataDir = fs.existsSync(dataDir) ? fs.realpathSync(dataDir) : dataDir;

  return {
    name: 'fishing-dashboard:data-folder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/data/')) return next();
        let rel: string;
        try {
          // Strip leading slashes so an absolute-looking segment stays relative
          // to dataDir instead of overriding it in path.resolve.
          rel = decodeURIComponent(req.url.replace(/^\/data\//, '').split('?')[0]).replace(/^\/+/, '');
        } catch {
          sendPlain(res, 400, 'Bad request');
          return;
        }
        const filePath = path.resolve(dataDir, rel);
        // Cheap lexical guards before touching the filesystem.
        if (!isInsideDir(dataDir, filePath) || !isCsv(filePath)) {
          sendPlain(res, 404, 'Not found');
          return;
        }
        // Resolve symlinks and stat the real target. realpathSync throws if the
        // path is missing; a single try/catch covers missing/unreadable files.
        let realPath: string;
        let stat: fs.Stats;
        try {
          realPath = fs.realpathSync(filePath);
          stat = fs.statSync(realPath);
        } catch {
          sendPlain(res, 404, 'Not found');
          return;
        }
        // Re-check after symlink resolution so a .csv symlink pointing outside
        // data/ (or at a non-.csv / non-file target) cannot leak data.
        if (!isInsideDir(realDataDir, realPath) || !isCsv(realPath) || !stat.isFile()) {
          sendPlain(res, 404, 'Not found');
          return;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const stream = fs.createReadStream(realPath);
        stream.on('error', () => {
          if (!res.headersSent) sendPlain(res, 500, 'Read error');
          else res.destroy();
        });
        stream.pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist', 'data');
      if (!fs.existsSync(dataDir)) return;
      // Mirror the dev guard at build time: copy only regular .csv files,
      // recursing into subdirectories and skipping symlinks (Dirent.isFile()
      // is false for symlinks) so nothing outside data/ is published.
      const copyCsvTree = (srcDir: string, destDir: string) => {
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
  plugins: [react(), dataFolderPlugin()],
  server: {
    port: 5173,
  },
});
