// Rejected shared-row-function design: paired ratio (variant / HEAD) of synchronous analyze, one variant,
// image (IMG) and source (SRC) per fresh process, pinned to one core at High priority. Variants in
// .tmp/c-b5/frozen/src/lib: recolor.aa.js = HEAD copy (A/A); recolor.cand.js = rejected-shared-function.patch;
// recolor.vd.js = HEAD with only lum/right/down read back from an escaping object (globalThis.__o).
// IMG=sprite SRC=red node rejected-shared-variants.mjs recolor.vd.js
import { pathToFileURL } from 'node:url';
import { load } from '../review/fixtures-lib.mjs';
const dir = import.meta.dirname + '/../../../.tmp/c-b5/frozen/src/lib/';
const H = await import(pathToFileURL(dir + 'recolor.js'));
const V = {};
for (const name of process.argv.slice(2)) V[name] = await import(pathToFileURL(dir + name));
function photo(w, h, alpha) {
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
const imgs = { photo: photo(2048, 2048, false), sprite: photo(2048, 2048, true), sheet: load('kenney-sheet-2048.png'), s512: photo(512, 512, true) };
for (const [n, img] of Object.entries(imgs).filter(([n]) => n === process.env.IMG)) for (const source of [process.env.SRC]) {
  const row = {};
  for (const [name, M] of Object.entries(V)) {
    const r = [];
    for (let k = 0; k < 41; k++) {
      const t = [];
      for (const X of k % 2 ? [H, M] : [M, H]) { const s = performance.now(); X.analyze(img, source); t.push(performance.now() - s); }
      r.push(k % 2 ? t[1] / t[0] : t[0] / t[1]);
    }
    row[name] = median(r);
  }
  console.log(n, source, JSON.stringify(row));
}
