import { createServer } from 'node:http';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const root = resolve('.tmp/conversion-fixes-m8-trace'), files = new Map(), events = [];
function visit(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
  const path = join(dir, entry.name); if (entry.isDirectory()) visit(path); else files.set('/' + relative(root, path).replaceAll('\\', '/'), readFileSync(path));
} } visit(root);
createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/trace') {
    const data = []; let length = 0;
    req.on('data', chunk => { data.push(chunk); length += chunk.length; if (length > 65536) req.destroy(); });
    req.on('end', () => { try {
      if (events.length < 1000) events.push(JSON.parse(Buffer.concat(data)));
      writeFileSync('bench/conversion-fixes-2026-10-18/m8/trace-events.json', JSON.stringify(events, null, 2) + '\n'); res.end('saved');
    } catch { res.writeHead(400); res.end(); } }); return;
  }
  const requested = decodeURIComponent(req.url.split('?')[0]), path = requested === '/' ? '/index.html' : requested, bytes = files.get(path);
  if (!bytes) { res.writeHead(404); res.end(); return; }
  const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); res.end(bytes);
}).listen(5239, '127.0.0.1', () => console.log('Frozen observer trace: http://127.0.0.1:5239/index.html'));
