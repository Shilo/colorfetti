// Four distinct 512x512 RGBA PNGs: offset crops of the CC0 Kenney 1024 sheet (decoded raw bytes).
// 512*512 = 262144 = ONEBIT_INSPECTION_PIXELS, so each is eligible for full-mask 1-bit counts.
import { zlibSync } from 'fflate';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from '../review/fixtures-lib.mjs';
const src = load('kenney-sheet-1024.png'), out = process.argv[2];
mkdirSync(out, { recursive: true });
const crc = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return b => { let c = -1; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; }; })();
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length); b.write(type, 4); Buffer.from(data).copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const manifest = [];
for (const [ox, oy, name] of [[0, 0, 'a'], [5, 3, 'b'], [11, 7, 'c'], [23, 17, 'd']]) {
  const rows = new Uint8Array(512 * (1 + 2048));
  for (let y = 0; y < 512; y++) rows.set(src.data.subarray(((oy + y) * 1024 + ox) * 4, ((oy + y) * 1024 + ox + 512) * 4), y * 2049 + 1);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(512); ihdr.writeUInt32BE(512, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(rows)), chunk('IEND', new Uint8Array(0))]);
  const file = `kenney-crop-${name}.png`; writeFileSync(`${out}/${file}`, png);
  manifest.push({ file, sha256: createHash('sha256').update(png).digest('hex'), from: 'kenney-sheet-1024.png', x: ox, y: oy, w: 512, h: 512 });
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(manifest.map(m => m.file + ' ' + m.sha256.slice(0, 12)).join('\n'));
