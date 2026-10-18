// Isolate exact indexed-alpha storage from the compressor implementation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inflateSync, crc32 } from 'node:zlib';
import { zlibSync } from 'fflate';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE ?? 'sharp');
const dir = import.meta.dirname;
const current = fs.readFileSync(`${dir}/keep-current.png`);
const indexed = fs.readFileSync(`${dir}/keep-indexed-exact.png`);
const chunks = [];
for (let at = 8; at < indexed.length;) {
  const length = indexed.readUInt32BE(at);
  const type = indexed.toString('ascii', at + 4, at + 8);
  chunks.push({ type, data: indexed.subarray(at + 8, at + 8 + length) });
  at += 12 + length;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), out.length - 4);
  return out;
}
const rows = inflateSync(Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data)));
const compressed = Buffer.from(zlibSync(rows, { level: 3 }));
const rebuilt = [];
let written = false;
for (const c of chunks) {
  if (c.type !== 'IDAT') rebuilt.push(chunk(c.type, c.data));
  else if (!written) {
    rebuilt.push(chunk('IDAT', compressed));
    written = true;
  }
}
const sameCompressor = Buffer.concat([indexed.subarray(0, 8), ...rebuilt]);
assert.deepEqual(await sharp(current).ensureAlpha().raw().toBuffer(), await sharp(sameCompressor).ensureAlpha().raw().toBuffer());
assert.deepEqual(await sharp(indexed).ensureAlpha().raw().toBuffer(), await sharp(sameCompressor).ensureAlpha().raw().toBuffer());
fs.writeFileSync(`${dir}/keep-indexed-fflate.png`, sameCompressor);
const result = {
  fixture: '512x512, 128 distinct RGBA states; identical row filter 0',
  current: { bytes: current.length, compressor: 'fflate zlibSync level 3', encoding: 'RGBA8' },
  originalReference: { bytes: indexed.length, compressor: 'node:zlib deflateSync level 3', encoding: 'indexed8 plus tRNS' },
  controlledReference: { bytes: sameCompressor.length, compressor: 'fflate zlibSync level 3', encoding: 'indexed8 plus tRNS' },
  controlledReduction: 1 - sameCompressor.length / current.length,
  exactDecodedRgba: true,
  caveat: 'Encoding changes PLTE/tRNS and row representation. One bounded authored fixture, not a universal percentage.'
};
fs.writeFileSync(`${dir}/png-compressor-results.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
