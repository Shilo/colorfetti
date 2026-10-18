import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('.tmp/conversion-fixes-m1'), frozen = new Map();
async function snapshot(directory, prefix) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name), url = prefix + '/' + entry.name;
    if (entry.isDirectory()) await snapshot(file, url); else frozen.set(url, await readFile(file));
  }
}
await snapshot(path.resolve('.tmp/conversion-fixes-m3/after-v4'), '/baseline');
for (const entry of await readdir(root, { withFileTypes: true })) if (entry.isDirectory() && /^(app-v\d+|harness-v\d+|fixtures)$/.test(entry.name)) await snapshot(path.join(root,entry.name),'/' + entry.name);
const port = Number(process.argv[2] || 5210), types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.gif':'image/gif', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer((req,res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + port), file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const bytes = frozen.get(file);
  res.writeHead(bytes ? 200 : 404, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  res.end(bytes || 'Not found');
});
server.listen(port,'127.0.0.1',()=>console.log('M1 frozen audit server http://127.0.0.1:' + port));
