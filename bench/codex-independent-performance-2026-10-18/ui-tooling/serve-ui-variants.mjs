// Lightweight local-only native/actual-browser diagnostic servers. No timing.
import http from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve('.tmp/codex-independent-performance-2026-10-18/ui-variants');
const variants = ['base', 'tooltip-off', 'swatch-paint-off', 'tooltip-and-paint-off', 'raw-arrays'];
const telemetry = readFileSync(new URL('ui-telemetry.js', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
for (let index = 0; index < variants.length; index++) {
  const variant = variants[index], port = 5401 + index, files = new Map();
  function collect(dir, prefix) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const actual = path.join(dir, entry.name), url = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) collect(actual, url);
      else if (!url.endsWith('.mp4')) files.set(url, readFileSync(actual));
    }
  }
  collect(path.join(root, variant, 'dist'), '');
  files.set('/ui-telemetry.js', telemetry);
  http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let key = url.pathname;
    if (key.endsWith('/')) key += 'index.html';
    let bytes = files.get(key);
    if (bytes && key === '/index.html' && url.searchParams.has('telemetry')) bytes = Buffer.from(bytes.toString().replace('<head>', '<head><script defer src="/ui-telemetry.js"></script>'));
    response.writeHead(bytes ? 200 : 404, { 'Content-Type': types[path.extname(key)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(bytes || 'Not found');
  }).listen(port, '127.0.0.1', () => console.log(`${variant} http://127.0.0.1:${port}/`));
}
