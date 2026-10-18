// C-B5 synchronous `analyze` A/A and A/B: a second, independent instance of HEAD's module gives the
// noise floor for the same paired-ratio median used against the candidate. 61 alternating pairs.
// node bench/second-performance-audit-2026-10-17/c-b5/sync-ab.mjs > sync-ab.result.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from '../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../..');
const url = p => pathToFileURL(path.join(repo, p)).href;
const H = await import(url('.tmp/c-b5/frozen/src/lib/recolor.js')), H2 = await import(url('.tmp/c-b5/frozen/src/lib/recolor.js') + '?aa');
const N = await import(url('src/lib/recolor.js'));
function photo(w, h, alpha) { // bench/bench.mjs's photo
  const data = new Uint8ClampedArray(w * h * 4);
  let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h, blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128, shape = ((x >> 6) + (y >> 6)) % 3 === 0 ? 50 : 0, g = (rnd() - 0.5) * 30;
    data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g;
    data[i + 3] = alpha && Math.hypot(u - 0.5, v - 0.5) > 0.45 ? 0 : 255;
  }
  return { width: w, height: h, data };
}
const median = a => { const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(3); };
const pairs = (img, source, A, B) => {
  const r = [];
  for (let k = 0; k < 61; k++) {
    const order = k % 2 ? [A, B] : [B, A], t = [];
    for (const M of order) { const s = performance.now(); M.analyze(img, source); t.push(performance.now() - s); }
    r.push(k % 2 ? t[1] / t[0] : t[0] / t[1]); // B over A
  }
  return median(r);
};
const images = { 'photo 2048': photo(2048, 2048, false), 'photo 2048 sprite': photo(2048, 2048, true), 'sheet 2048': load('kenney-sheet-2048.png'), 'photo 512 sprite': photo(512, 512, true) };
const out = {};
for (const [name, img] of Object.entries(images)) for (const source of ['luma', 'value', 'red']) {
  out[`${name} ${source}`] = { aaHeadOverHead: pairs(img, source, H, H2), candidateOverHead: pairs(img, source, H, N) };
}
console.log(JSON.stringify(out, null, 1));
