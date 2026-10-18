// Loopback-only production UI acceptance harness. Private fixtures remain on disk.
// node bench/gif-palette-qa-server.mjs --downloads C:/Users/name/Downloads --port 5306
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, extname, dirname } from 'node:path';
import { inflateSync, crc32 } from 'node:zlib';
import { createHash } from 'node:crypto';
import omggif from 'omggif';
import { unzipSync } from 'fflate';

const args = process.argv.slice(2), option = key => args[args.indexOf(key) + 1];
const port = Number(args.includes('--port') ? option('--port') : 5306);
const root = resolve(args.includes('--dist') ? option('--dist') : 'dist');
const out = resolve(args.includes('--out') ? option('--out') : '.tmp/gif-palette-qa'); mkdirSync(out, { recursive: true });
const privateRoot = args.includes('--downloads') ? resolve(option('--downloads')) : null;
const colors = Array.from({ length: 29 }, (_, i) => ((i * 47 + 31) % 240 + 8) * 65536 + ((i * 83 + 17) % 240 + 8) * 256 + ((i * 29 + 59) % 240 + 8));
const table = [0x00ff00, ...colors, 0, 0];
function makeGif(still = false) {
  const width = still ? 16 : 92, height = still ? 16 : 92;
  const bytes = new Uint8Array(200000), writer = new omggif.GifWriter(bytes, width, height, { palette: table, loop: still ? 3 : 0 });
  for (let f = 0; f < (still ? 1 : 4); f++) {
    const count = still ? 3 : [25, 27, 18, 27][f], pixels = new Uint8Array(width * height);
    for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) pixels[y * width + x] = 1 + ((Math.floor(x / 5) + Math.floor(y / 5) * 18) % count) + (f === 1 ? 2 : 0);
    writer.addFrame(0, 0, width, height, pixels, { transparent: 0, delay: still ? 7 : 20, disposal: 2 });
  }
  return Buffer.from(bytes.subarray(0, writer.end()));
}
function makeAse(entries) {
  const palette = Buffer.alloc(10 + entries.length * 3); palette.writeUInt32LE(palette.length); palette.writeUInt16LE(4, 4); palette.writeUInt16LE(1, 6); palette[8] = 0; palette[9] = entries.length;
  entries.forEach((rgb, i) => palette.set([rgb >>> 16, rgb >>> 8 & 255, rgb & 255], 10 + i * 3));
  const bytes = Buffer.alloc(144 + palette.length); bytes.writeUInt32LE(bytes.length); bytes.writeUInt16LE(0xa5e0, 4); bytes.writeUInt16LE(1, 6); bytes.writeUInt16LE(1, 8); bytes.writeUInt16LE(1, 10); bytes.writeUInt16LE(32, 12); bytes.writeUInt16LE(entries.length, 32);
  bytes.writeUInt32LE(16 + palette.length, 128); bytes.writeUInt16LE(0xf1fa, 132); bytes.writeUInt16LE(1, 134); palette.copy(bytes, 144); return bytes;
}
function makeUnionGif(frameCount) {
  const bytes = new Uint8Array(200000), palette = frame => [0, ...Array.from({ length: 255 }, (_, i) => { const key = frame * 255 + i; return (1 + (key >>> 8)) * 65536 + (key & 255) * 256 + 39; })];
  const writer = new omggif.GifWriter(bytes, 255, 3, { palette: palette(0), loop: 0 });
  for (let frame = 0; frame < frameCount; frame++) writer.addFrame(0, 0, 255, 3, Uint8Array.from({ length: 765 }, (_, i) => i % 255 + 1), { delay: 7, disposal: 2, ...(frame ? { palette: palette(frame) } : {}) });
  return Buffer.from(bytes.subarray(0, writer.end()));
}
const names = { source: 'idle_rotations_4dir (2).gif', output: 'idle_rotations_4dir (2)-colorfetti.gif', sourceAse: 'palette.aseprite', outputAse: 'output_palette.aseprite', hex: 'Auto copy (1).hex', still: 'exact-still.gif', partial: 'partial-opaque.gif', overLimit: 'over-limit.gif', overReview: 'over-review-limit.gif', malformedShort: 'invalid-short-pixels.gif', malformedIndex: 'invalid-palette-index.gif' };
const synthetic = {
  gceScope: Buffer.from('R0lGODlhAQABAIAAAP8AAAAA/yH5BAkUAAAALAAAAAABAAEAAAICTAEALAAAAAABAAEAAAICRAEAOw==', 'base64'),
  source: makeGif(), output: makeGif(), sourceAse: makeAse([0x00ff00, ...colors, 0, 0, 0, 0, 0, 0, 0]),
  outputAse: makeAse([colors[0], ...colors, 0, 0]),
  hex: Buffer.from([...colors, ...colors.slice(0, 22).map(c => c ^ 1)].map(c => '#' + c.toString(16).padStart(6, '0')).join('\n') + '\n'),
  still: makeGif(true),
  partial: Buffer.from('R0lGODlhAgABAIAAAP8AAAAA/yH5BAgUAAAALAAAAAABAAEAAAICTAEAIfkEABQAAAAsAQAAAAEAAQAAAgJMAQA7', 'base64'),
  overLimit: makeUnionGif(2), overReview: makeUnionGif(17),
  // Structurally framed GIFs with invalid decoded pixel counts / palette indexes.
  malformedShort: Buffer.from('R0lGODlhAwADAIAAABEiM6vN7ywAAAAAAwADAAACASwAOw==', 'base64'),
  malformedIndex: Buffer.from('R0lGODlhAwADAIAAABEiM6vN7ywAAAAAAwADAAACA5x/BQA7', 'base64'),
};
const fixtures = Object.fromEntries(Object.entries(synthetic).map(([key, bytes]) => [key, privateRoot && ['source', 'output', 'sourceAse', 'outputAse', 'hex'].includes(key) ? readFileSync(resolve(privateRoot, names[key])) : bytes]));

// Independent reference composition uses only the external GIF reader, not app modules.
function readGif(bytes) {
  const reader = new omggif.GifReader(bytes), { width, height } = reader, frames = [], canvas = new Uint8Array(width * height * 4); let before, saved;
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);
    if (before?.disposal === 2) for (let y = before.y; y < before.y + before.height; y++) canvas.fill(0, (y * width + before.x) * 4, (y * width + before.x + before.width) * 4);
    else if (before?.disposal === 3) canvas.set(saved);
    if (info.disposal === 3) saved = canvas.slice();
    reader.decodeAndBlitFrameRGBA(i, canvas); frames.push({ width, height, data: canvas.slice(), delay: info.delay > 1 ? info.delay * 10 : 100 }); before = info;
  }
  return { width, height, loop: reader.loopCount(), frames };
}
function summary(frames, solid = false) {
  const set = new Set();
  for (const { data, width, height } of frames) for (let p = 0; p < data.length; p += 4) {
    if (!data[p + 3]) continue;
    if (solid) {
      const x = p / 4 % width, y = Math.floor(p / 4 / width); if (!x || !y || x === width - 1 || y === height - 1) continue;
      let flat = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = ((y + dy) * width + x + dx) * 4; if (!data[n + 3] || data[n] !== data[p] || data[n + 1] !== data[p + 1] || data[n + 2] !== data[p + 2]) flat = false; }
      if (!flat) continue;
    }
    set.add('#' + Buffer.from(data.subarray(p, p + 3)).toString('hex'));
  }
  return [...set].sort();
}
function readPng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); let width, height, depth, type, palette, alpha; const parts = [];
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at), body = bytes.subarray(at + 4, at + 8 + length), tag = body.toString('ascii', 0, 4), data = body.subarray(4);
    assert.equal(crc32(body), bytes.readUInt32BE(at + 8 + length), 'PNG CRC');
    if (tag === 'IHDR') { width = data.readUInt32BE(); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; assert.equal(data[12], 0); }
    if (tag === 'PLTE') palette = data; if (tag === 'tRNS') alpha = data; if (tag === 'IDAT') parts.push(data); at += length + 12;
  }
  assert.ok([2, 3, 6].includes(type)); const channels = type === 6 ? 4 : 3, stride = type === 3 ? Math.ceil(width * depth / 8) : width * channels, bpp = type === 3 ? 1 : channels;
  const raw = inflateSync(Buffer.concat(parts)), prior = Buffer.alloc(stride), data = new Uint8Array(width * height * 4); assert.equal(raw.length, (stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))), filter = raw[y * (stride + 1)]; assert.ok(filter < 5);
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? row[i - bpp] : 0, b = prior[i], c = i >= bpp ? prior[i - bpp] : 0, p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); row[i] = (row[i] + (filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    for (let x = 0; x < width; x++) { const p = (y * width + x) * 4; if (type === 3) { const index = row[x * depth >> 3] >>> (8 - depth - x * depth % 8) & (1 << depth) - 1; data.set([palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2], alpha?.[index] ?? 255], p); } else data.set([row[x * channels], row[x * channels + 1], row[x * channels + 2], type === 6 ? row[x * channels + 3] : 255], p); } row.copy(prior);
  }
  return { width, height, data };
}
const source = readGif(fixtures.source), output = readGif(fixtures.output), still = readGif(fixtures.still);
const manifest = { privateFixtures: !!privateRoot, files: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, { name, type: extname(name) === '.gif' ? 'image/gif' : 'application/octet-stream' }])), colors: summary(source.frames), solidColors: summary(source.frames, true), firstFrameColors: summary([source.frames[0]]), sourceFrames: source.frames.length, stillColors: summary(still.frames), suppliedOutputColors: summary(output.frames), sourceAseColors: 31, outputAseColors: 30, hexColors: 51 };
assert.equal(manifest.colors.length, 29, 'QA source must expose exactly 29 visible colors');
// Optional independently produced still-image references remain separate from
// app decoders and browser canvas. Preserve each profile reference's provenance.
// No private fixture bytes enter the repository.
const rasterReferences = new Map();
names.gceScope = 'one-frame-control-scope.gif';
manifest.files.gceScope = { name: names.gceScope, type: 'image/gif' };
// Explicit pixels/times: FFmpeg and native Edge/Firefox independently agree.
// Do not use the old GifReader compositor as an oracle for its own GCE defect.
rasterReferences.set('gceScope', { width: 1, height: 1, loop: null,
  frames: [{ width: 1, height: 1, data: Uint8Array.of(0, 0, 255, 255), delay: 200 },
    { width: 1, height: 1, data: Uint8Array.of(255, 0, 0, 255), delay: 100 }],
  reference: 'Independent FFmpeg and native Edge/Firefox pixels; existing app minimum-delay policy' });
manifest.stills = [];
if (args.includes('--stills')) {
  const path = resolve(option('--stills')), directory = dirname(path);
  for (const [index, entry] of JSON.parse(readFileSync(path, 'utf8')).entries()) {
    const key = 'raster-' + index, expected = { width: entry.width, height: entry.height, data: readFileSync(resolve(directory, entry.rgbaFile)) };
    assert.equal(expected.data.length, expected.width * expected.height * 4, 'Independent RGBA reference size ' + entry.file);
    const colors = summary([expected]);
    let partialAlpha = false;
    for (let p = 3; p < expected.data.length; p += 4) if (expected.data[p] > 0 && expected.data[p] < 255) partialAlpha = true;
    fixtures[key] = readFileSync(resolve(directory, entry.file));
    manifest.files[key] = { name: entry.file, type: entry.type };
    const reference = entry.referenceNote || 'independent FFmpeg RGBA';
    manifest.stills.push({ key, name: entry.file, type: entry.type, width: entry.width, height: entry.height,
      colors, partialAlpha, exactSource: !!entry.exactSource, exifOrientation: entry.exifOrientation ?? null,
      reference, rgbaSha256: createHash('sha256').update(expected.data).digest('hex') });
    rasterReferences.set(key, { ...expected, frames: [expected], reference, partialAlpha });
  }
}
function same(actual, expected, mode = 'identity') {
  assert.equal(actual.width, expected.width, 'Width'); assert.equal(actual.height, expected.height, 'Height');
  for (let p = 0; p < actual.data.length; p += 4) { assert.equal(actual.data[p + 3], expected.data[p + 3], 'Alpha at ' + p / 4); if (mode === 'identity' && actual.data[p + 3]) for (let c = 0; c < 3; c++) assert.equal(actual.data[p + c], expected.data[p + c], 'Visible RGB at ' + p / 4); }
}
function verify(bytes, name, mode = 'identity', maxColors, fixtureKey) {
  const isStill = name.startsWith('exact-still'), expected = fixtureKey ? rasterReferences.get(fixtureKey) : isStill ? still : source;
  assert.ok(expected, 'Unknown independent fixture ' + fixtureKey);
  if (fixtureKey) assert.ok(name.endsWith(expected.frames.length === 1 ? '.png' : '.gif'), 'Fixture Save must preserve still/animation format');
  const actual = name.endsWith('.gif') ? readGif(bytes) : { frames: [readPng(bytes)] };
  assert.equal(actual.frames.length, name.endsWith('.gif') ? expected.frames.length : 1, 'Frame count');
  if (name.endsWith('.gif')) { assert.equal(actual.loop, expected.loop, 'GIF loop'); for (let i = 0; i < actual.frames.length; i++) assert.equal(actual.frames[i].delay, expected.frames[i].delay, 'GIF delay'); }
  for (let i = 0; i < actual.frames.length; i++) {
    if (mode === 'one-bit') { assert.equal(actual.frames[i].width, expected.width); assert.equal(actual.frames[i].height, expected.height); }
    else same(actual.frames[i], expected.frames[i], mode);
  }
  const used = summary(actual.frames); if (maxColors) assert.ok(used.length <= maxColors, `Used ${used.length} colors exceeds ${maxColors}`);
  if (mode === 'cap') for (const color of used) assert.ok(manifest.colors.includes(color), 'Output outside source/Auto palette ' + color);
  return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), frames: actual.frames.length, colors: used.length, pixels: mode === 'identity' ? 'exact visible RGBA' : mode === 'cap' ? 'alpha and palette membership exact' : '1-bit format and dimensions smoke', delays: true, loop: true,
    ...(fixtureKey ? { fixtureKey, reference: expected.reference } : {}) };
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const probe = `<!doctype html><meta charset="utf-8"><title>Native GIF decoder probe</title><h1>Opaque partial GIF native decoding</h1><img src="/fixture/partial"><pre id="result">Decoding…</pre><script type="module">const bytes=await(await fetch('/fixture/partial')).arrayBuffer(),blob=new Blob([bytes],{type:'image/gif'}),bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const result={createImageBitmap:[...ctx.getImageData(0,0,canvas.width,canvas.height).data]};bitmap.close();if(typeof ImageDecoder!=='undefined'){const decoder=new ImageDecoder({data:bytes,type:'image/gif'});result.ImageDecoder=[];for(let i=0;i<2;i++){const {image}=await decoder.decode({frameIndex:i}),out=new Uint8Array(image.allocationSize({format:'RGBA'}));await image.copyTo(out,{format:'RGBA'});result.ImageDecoder.push([...out]);image.close();}decoder.close();}const sourceBytes=await(await fetch('/fixture/source')).arrayBuffer(),sourceBitmap=await createImageBitmap(new Blob([sourceBytes],{type:'image/gif'})),sourceCanvas=document.createElement('canvas');sourceCanvas.width=sourceBitmap.width;sourceCanvas.height=sourceBitmap.height;const sourceContext=sourceCanvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});sourceContext.drawImage(sourceBitmap,0,0);const sourceData=sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height).data,colors=new Set();for(let p=0;p<sourceData.length;p+=4)if(sourceData[p+3])colors.add('#'+[...sourceData.subarray(p,p+3)].map(value=>value.toString(16).padStart(2,'0')).join(''));sourceBitmap.close();const expected=(await(await fetch('/manifest')).json()).firstFrameColors;result.originalFirstFrameCanvas={count:colors.size,colors:[...colors].sort(),expectedCount:expected.length,expectedColors:expected,extra:[...colors].filter(color=>!expected.includes(color)),missing:expected.filter(color=>!colors.has(color))};document.querySelector('#result').textContent=JSON.stringify(result,null,2);await fetch('/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'probe',...result})});</script>`;
// Test-only capability override, applied before the unchanged production assets.
// Native pointer events and CSS media emulation are outside this JS shim's scope.
const touchShim = `<script>const nativeMatchMedia=window.matchMedia.bind(window);window.matchMedia=query=>{const result=nativeMatchMedia(query),compact=query.replace(/\\s/g,'');if(!/(?:hover|pointer):/.test(compact))return result;const matches=!/(?:hover:hover|pointer:fine|any-hover:hover|any-pointer:fine)/.test(compact);return{media:query,matches,onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;}};};</script>`;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 40 * 1024 * 1024) throw Error('Request too large'); } const data = JSON.parse(body); let result;
      if (url.pathname === '/report') { const name = data.kind === 'probe' ? 'probe.json' : data.width < 700 ? 'phone-results.json' : 'desktop-results.json'; writeFileSync(resolve(out, name), JSON.stringify(data, null, 2)); result = { saved: name }; }
      else if (url.pathname === '/verify') {
        const bytes = Buffer.from(data.base64, 'base64');
        const artifact = `${data.mode || 'identity'}-${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}-${data.name.replace(/[^\w. -]/g, '_')}`;
        writeFileSync(resolve(out, artifact), bytes);
        result = data.type === 'application/zip' ? Object.entries(unzipSync(bytes)).map(([name, entry]) => verify(Buffer.from(entry), name, data.mode, data.maxColors)) : verify(bytes, data.name, data.mode, data.maxColors, data.fixtureKey);
      } else throw Error('Unknown POST'); res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result)); return;
    }
    if (url.pathname === '/manifest') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(manifest)); return; }
    if (url.pathname.startsWith('/fixture/')) { const key = url.pathname.slice(9); if (!fixtures[key]) throw Error('Unknown fixture'); res.writeHead(200, { 'content-type': manifest.files[key].type }).end(fixtures[key]); return; }
    if (url.pathname === '/probe') { res.writeHead(200, { 'content-type': 'text/html' }).end(probe); return; }
    const file = url.pathname === '/qa' ? resolve('bench/gif-palette-qa.html') : url.pathname.startsWith('/app/') ? resolve(root, decodeURIComponent(url.pathname.slice(5)) || 'index.html') : null;
    if (!file) { res.writeHead(404).end(); return; } if (url.pathname !== '/qa') { const part = relative(root, file); if (part.startsWith('..') || isAbsolute(part)) throw Error('Invalid path'); }
    let bytes = readFileSync(file);
    if (url.pathname === '/app/' && url.searchParams.has('touch')) bytes = Buffer.from(bytes.toString().replace('<head>', '<head>' + touchShim));
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(bytes);
  } catch (error) { res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error.message })); }
});
assert.ok(existsSync(resolve(root, 'index.html')), 'Build dist before starting the harness');
server.listen(port, '127.0.0.1', () => console.log(`GIF palette QA http://127.0.0.1:${port}/qa ; native probe /probe ; ${privateRoot ? 'supplied local fixtures' : 'synthetic fixtures'} ; reports ${out}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
