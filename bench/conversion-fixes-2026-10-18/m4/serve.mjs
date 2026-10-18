import { createServer } from 'node:http';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
const phase = process.argv[2] ?? 'before', port = Number(process.argv[3] ?? 5204);
const root = resolve(`.tmp/conversion-fixes-m4-${phase}`), frozen = new Map();
function add(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
  const path = join(dir, entry.name); if (entry.isDirectory()) add(path);
  else frozen.set('/' + relative(root, path).replaceAll('\\', '/'), readFileSync(path));
} }
add(root);
createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/capture?')) {
    const name = new URL(req.url, 'http://127.0.0.1').searchParams.get('name');
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) { res.writeHead(400); res.end(); return; }
    const parts = []; let length = 0;
    req.on('data', chunk => { parts.push(chunk); length += chunk.length; if (length > 1000000) req.destroy(); });
    req.on('end', () => { writeFileSync(`bench/conversion-fixes-2026-10-18/m4/${phase}-ui-${name}`, Buffer.concat(parts)); res.end('saved'); }); return;
  }
  if (req.method === 'POST' && req.url === '/receipt') {
    let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 100000) req.destroy(); });
    req.on('end', () => { writeFileSync(`bench/conversion-fixes-2026-10-18/m4/browser-${phase}.json`, data + '\n'); res.end('saved'); }); return;
  }
  const path = decodeURIComponent(req.url.split('?')[0]), data = frozen.get(path === '/' ? '/index.html' : path);
  if (!data) { res.writeHead(404); res.end('Not found'); return; }
  const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); res.end(data);
}).listen(port, '127.0.0.1', () => console.log(`Frozen ${phase} build: http://127.0.0.1:${port}/bench/conversion-fixes-2026-10-18/m4/browser.html`));
