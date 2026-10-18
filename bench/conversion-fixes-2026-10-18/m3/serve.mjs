import http from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import omggif from 'omggif';

const root = path.resolve('.tmp/conversion-fixes-m3');
await mkdir(path.join(root, 'fixtures'), { recursive: true });
const buf = new Uint8Array(1024);
const writer = new omggif.GifWriter(buf, 2, 2, { palette: [0xff0000, 0x00ff00] });
writer.addFrame(0, 0, 2, 2, [0, 1, 1, 0]);
const good = buf.slice(0, writer.end()), zero = good.slice(); zero[6] = zero[7] = 0;
await writeFile(path.join(root, 'fixtures', 'valid.gif'), good);
await writeFile(path.join(root, 'fixtures', 'invalid-geometry.gif'), zero);
await writeFile(path.join(root, 'fixtures', 'damaged.png'), 'damaged synthetic image data');
await writeFile(path.join(root, 'fixtures', 'unsupported.txt'), 'synthetic unsupported data');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.txt': 'text/plain' };
const frozen = new Map();
async function snapshot(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await snapshot(file);
    else frozen.set(file, await readFile(file));
  }
}
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isDirectory() && /^(before|after-v\d+|fixtures)$/.test(entry.name)) await snapshot(path.join(root, entry.name));
}
const port = Number(process.argv[2] || 5202);
const preferredBuild = port === 5203 ? 'after-v4' : 'before', events = [];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`), parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/events.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(events)); return;
    }
    if (url.pathname === '/harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end(await readFile(new URL('./harness.html', import.meta.url))); return;
    }
    if (url.pathname === '/fixtures/slow.gif') {
      const event = { started: Date.now() }; events.push(event);
      res.on('close', () => { event.closed = Date.now(); event.finished = res.writableFinished; });
      await new Promise(resolve => setTimeout(resolve, 15000));
      res.writeHead(200, { 'Content-Type': 'image/gif' }); res.end(good); return;
    }
    if (!parts.length) { res.writeHead(302, { Location: `/${preferredBuild}/` }); res.end(); return; }
    if (!/^(before|after-v\d+|fixtures)$/.test(parts[0]) || parts.some(x => x === '..')) throw new Error('Not found');
    const file = path.resolve(root, ...parts, ...(url.pathname.endsWith('/') ? ['index.html'] : []));
    if (!file.startsWith(root + path.sep)) throw new Error('Not found');
    const content = frozen.get(file);
    if (!content) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`M3 audit server http://127.0.0.1:${port}/${preferredBuild}/`));
