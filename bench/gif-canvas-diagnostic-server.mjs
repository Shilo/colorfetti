// Read-only fixture server for diagnosing browser canvas readback. It never
// changes browser settings and writes only reports below .tmp/.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import omggif from 'omggif';
import { decodeGif } from '../src/lib/gif.js';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--gif', '--hex', '--port', '--stills'].includes(args[i]) || args[i + 1] == null) {
    throw new Error('Usage: node bench/gif-canvas-diagnostic-server.mjs [--gif path] [--hex path] [--stills fixture-directory] [--port 5317]');
  }
  options[args[i].slice(2)] = args[i + 1];
}
const port = Number(options.port ?? 5317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
const root = fileURLToPath(new URL('../', import.meta.url));
const reportDirectory = path.join(root, '.tmp', 'gif-palette-diagnostic', 'live');
const html = fs.readFileSync(new URL('./gif-canvas-diagnostic.html', import.meta.url));

function syntheticGif() {
  const width = 128, height = 128;
  const palette = [0x000000, 0x4c382b, 0x513524, 0xb5834c, 0xc28c50, 0xe4b8aa, 0xc48846, 0xddccb3,
    0xe2c9a8, 0x3b2a1f, 0x5a3f2c, 0x3f9abe, 0x91bfcb, 0x2b6179, 0xe3eaed, 0x564035];
  const storage = new Uint8Array(width * height * 4 + 4096);
  const writer = new omggif.GifWriter(storage, width, height, { palette, loop: 0 });
  for (let frame = 0; frame < 2; frame++) {
    const pixels = new Uint8Array(width * height);
    for (let i = 0; i < pixels.length; i++) pixels[i] = ((Math.floor(i / width / 16) + Math.floor((i % width) / 16) + frame) % 15) + 1;
    writer.addFrame(0, 0, width, height, pixels, { delay: 20, disposal: 2 });
  }
  return storage.slice(0, writer.end());
}

const bytes = options.gif ? new Uint8Array(fs.readFileSync(path.resolve(options.gif))) : syntheticGif();
if (bytes.length > 32 * 1024 * 1024) throw new Error('Diagnostic fixtures must be at most 32 MiB.');
const reader = new omggif.GifReader(bytes);
if (reader.width * reader.height * reader.numFrames() > 16 * 1024 * 1024) throw new Error('Diagnostic fixtures must contain at most 16 million total frame pixels.');
const decoded = decodeGif(bytes);
const hex = value => '#' + value.toString(16).padStart(6, '0');
const colors = data => {
  const unique = new Set();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) unique.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  return [...unique].map(hex);
};
const importedHex = options.hex ? fs.readFileSync(path.resolve(options.hex), 'utf8').trim().split(/\s+/).map(x => x.toLowerCase()) : [];
if (importedHex.some(x => !/^#[0-9a-f]{6}$/.test(x)) || importedHex.length > 4096) throw new Error('Diagnostic HEX must contain at most 4096 #rrggbb entries.');
const stillFiles = new Map(), stills = [];
if (options.stills) {
  const directory = path.resolve(options.stills), manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest) || manifest.length > 32) throw new Error('Invalid still fixture manifest.');
  for (const entry of manifest) {
    if (![entry.file, entry.rgbaFile].every(name => typeof name === 'string' && name === path.basename(name))) throw new Error('Still fixture paths must be plain filenames.');
    if (!['image/png', 'image/jpeg', 'image/bmp', 'image/webp'].includes(entry.type) || entry.width * entry.height > 16 * 1024 * 1024) throw new Error('Invalid still fixture type or size.');
    const encoded = fs.readFileSync(path.join(directory, entry.file)), rgba = fs.readFileSync(path.join(directory, entry.rgbaFile));
    if (encoded.length > 32 * 1024 * 1024 || rgba.length !== entry.width * entry.height * 4) throw new Error('Invalid still fixture bytes.');
    stillFiles.set('/still/' + encodeURIComponent(entry.file), { type: entry.type, bytes: encoded });
    stills.push({ file: entry.file, type: entry.type, width: entry.width, height: entry.height, exactSource: entry.exactSource,
      exifOrientation: entry.exifOrientation, referenceNote: entry.referenceNote,
      sha256: crypto.createHash('sha256').update(encoded).digest('hex'), rgbaBase64: rgba.toString('base64') });
  }
}
const metadata = {
  schema: 1,
  file: options.gif ? path.basename(options.gif) : 'synthetic-opaque.gif',
  byteLength: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  width: decoded.width, height: decoded.height, loop: decoded.loop,
  frames: decoded.frames.map(frame => ({ delay: frame.delay, rgbaBase64: Buffer.from(frame.data).toString('base64'), colors: colors(frame.data) })),
  union: [...new Set(decoded.frames.flatMap(frame => colors(frame.data)))],
  suppliedHex: importedHex,
  stills,
};
const metadataJson = Buffer.from(JSON.stringify(metadata));
let reportSequence = 0;

function respond(response, status, type, body) {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(body);
}
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  if (request.method === 'GET' && pathname === '/') return respond(response, 200, 'text/html; charset=utf-8', html);
  if (request.method === 'GET' && pathname === '/fixture.gif') return respond(response, 200, 'image/gif', bytes);
  if (request.method === 'GET' && pathname === '/expected.json') return respond(response, 200, 'application/json', metadataJson);
  if (request.method === 'GET' && stillFiles.has(pathname)) { const fixture = stillFiles.get(pathname); return respond(response, 200, fixture.type, fixture.bytes); }
  if (request.method === 'POST' && pathname === '/report') {
    try {
      // Reports are accepted only from the page served by this loopback server.
      const allowedOrigin = `http://127.0.0.1:${port}`;
      if (request.headers.origin !== allowedOrigin && request.headers.origin !== `http://localhost:${port}`) return respond(response, 403, 'text/plain', 'Origin rejected.');
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 16 * 1024 * 1024) { respond(response, 413, 'text/plain', 'Report too large.'); return; }
        chunks.push(chunk);
      }
      const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (report.schema !== 1 || report.input?.sha256 !== metadata.sha256 || !Array.isArray(report.checks)) return respond(response, 400, 'text/plain', 'Invalid diagnostic report.');
      const browser = report.browser?.brave === true ? 'brave' : 'browser';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${stamp}-${browser}-${++reportSequence}-${crypto.randomBytes(3).toString('hex')}.json`;
      fs.mkdirSync(reportDirectory, { recursive: true });
      fs.writeFileSync(path.join(reportDirectory, filename), JSON.stringify({ ...report, receivedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
      console.log(`Saved ${filename}: ${report.summary ?? 'no summary'}`);
      return respond(response, 200, 'application/json', JSON.stringify({ saved: `.tmp/gif-palette-diagnostic/live/${filename}` }));
    } catch (error) {
      console.error(error.message);
      return respond(response, 400, 'text/plain', 'Could not read diagnostic report.');
    }
  }
  respond(response, 404, 'text/plain', 'Not found.');
});
server.listen(port, '127.0.0.1', () => console.log(`GIF canvas diagnostic: http://127.0.0.1:${port}/ (${metadata.file}; ${metadata.frames.length} frames; ${metadata.union.length} visible RGBs)`));
