import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const filepath = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (filepath !== root && !filepath.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!['.html', '.css', '.mjs', '.js', '.svg', '.png'].includes(extname(filepath))) {
      res.writeHead(404).end('Not found');
      return;
    }
    const info = await stat(filepath);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(filepath);
    res.writeHead(200, { 'Content-Type': `${mime[extname(filepath)]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(port, () => console.log(`BREACHWAVE is running at http://localhost:${port}`));
