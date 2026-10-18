// H-B1 probe: feed palette-limit.js (frozen HEAD) a compact exact RGB histogram instead of
// 128 KiB raw-pixel chunks. Checks selected indices for equality and times both inputs,
// plus the main-thread slice copies the client performs today for one pass.
import path from 'node:path';
import { load, index } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const mod = p => import('file:///' + path.join(repo, '.tmp/source-review-B/frozen', p).replace(/\\/g, '/'));
const { selectPaletteSubset } = await mod('palette-limit.js');
const { createGeneratedAccumulator } = await mod('palette-generated.js');
const { FULL_PRESETS } = await mod('palette-library.js');
const CHUNK = 128 * 1024;
const clip = name => index.filter(e => e.gif === name).sort((a, b) => +a.file.split('.').pop() - +b.file.split('.').pop()).map(e => ({ ...load(e.file), delay: 100 }));
const sources = {
  sheet2048: [{ ...load('kenney-sheet-2048.png'), delay: 1 }],
  sheet1024: [{ ...load('kenney-sheet-1024.png'), delay: 1 }],
  motion256: clip('kenney-motion-256.gif'),
};
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1];
// Raw input exactly as the client streams it (subarray here; the client also slices).
const raw = frames => async function* () { for (const f of frames) for (let at = 0; at < f.data.length; at += CHUNK) yield { data: f.data.subarray(at, Math.min(at + CHUNK, f.data.length)), weight: f.delay }; };
// Hypothetical cached metadata: per RGB, count of alpha==255 pixels; valid only when no
// visible pixel has partial alpha (then alpha>=cut is cut-independent) and union <= 4096.
function histogram(frames) {
  const entries = [];
  for (const f of frames) {
    const counts = new Map();
    for (let p = 0; p < f.data.length; p += 4) {
      const a = f.data[p + 3]; if (!a) continue; if (a !== 255) return null;
      const rgb = f.data[p] << 16 | f.data[p + 1] << 8 | f.data[p + 2]; counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
    }
    for (const [rgb, c] of counts) entries.push({ rgb, weight: c * f.delay });
  }
  return entries;
}
const compact = entries => async function* () { for (const e of entries) yield { data: Uint8Array.of(e.rgb >>> 16, e.rgb >>> 8 & 255, e.rgb & 255, 255), weight: e.weight }; };
const report = { limiter: {}, generated: {}, mainThreadSliceMs: {} };
for (const [name, frames] of Object.entries(sources)) {
  const entries = histogram(frames);
  report.limiter[name] = { distinctEntries: entries?.length ?? null, rawBytes: frames.reduce((n, f) => n + f.data.length, 0), cases: [] };
  for (const id of ['preset-res64', 'preset-edg32', 'preset-pico8']) for (const metric of ['oklab', 'rgb']) for (const maxColors of [2, 4, 8, 16]) {
    const colors = FULL_PRESETS.find(p => p.id === id).colors;
    if (maxColors >= colors.length) continue;
    const a = await selectPaletteSubset(colors, maxColors, raw(frames), { metric });
    const b = await selectPaletteSubset(colors, maxColors, compact(entries), { metric });
    if (a.binned || b.binned || a.indices.join() !== b.indices.join()) throw new Error(`limiter mismatch ${name} ${id} ${metric} ${maxColors}`);
    report.limiter[name].cases.push(`${id}/${metric}/${maxColors}`);
  }
  const colors = FULL_PRESETS[0].colors, ta = [], tb = [];
  for (let i = 0; i < 5; i++) {
    let s = performance.now(); await selectPaletteSubset(colors, 8, raw(frames), {}); ta.push(performance.now() - s);
    s = performance.now(); await selectPaletteSubset(colors, 8, compact(entries), {}); tb.push(performance.now() - s);
  }
  Object.assign(report.limiter[name], { identical: true, rawInputMs: +median(ta).toFixed(2), histogramInputMs: +median(tb).toFixed(2) });
  // Auto accumulator: same comparison (integer masses, so order-independent by design).
  const run = async input => { const acc = createGeneratedAccumulator(128); acc.beginAsset(); for await (const c of input()) await acc.addChunk(c.data, c.weight); await acc.endAsset(); return acc.finish(); };
  const ga = await run(raw(frames)), gb = await run(compact(entries));
  if (ga.colors.join() !== gb.colors.join()) throw new Error('generated mismatch ' + name);
  const t1 = [], t2 = [];
  for (let i = 0; i < 5; i++) { let s = performance.now(); await run(raw(frames)); t1.push(performance.now() - s); s = performance.now(); await run(compact(entries)); t2.push(performance.now() - s); }
  report.generated[name] = { identical: true, colors: ga.colors.length, rawInputMs: +median(t1).toFixed(2), histogramInputMs: +median(t2).toFixed(2) };
  const ts = [];
  for (let i = 0; i < 5; i++) { const s = performance.now(); for (const f of frames) for (let at = 0; at < f.data.length; at += CHUNK) f.data.slice(at, Math.min(at + CHUNK, f.data.length)); ts.push(performance.now() - s); }
  report.mainThreadSliceMs[name] = +median(ts).toFixed(2);
}
console.log(JSON.stringify(report, null, 1));
