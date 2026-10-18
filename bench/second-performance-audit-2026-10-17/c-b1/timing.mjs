// C-B1 Node timing: frozen 0c61dd0 vs this tree, alternating, median of 11 runs.
// Worker-side limiter (Max colors 2->4->8, Resurrect 64, Oklab) and Auto job cost,
// main-thread input preparation (HEAD slice copies vs summaryHistogram), the cold
// summary scan that now also counts pixels, and the new tree's raw fallback.
// Shared desktop host: treat differences under ~10% as noise.
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(import.meta.dirname, '../../..');
const url = (dir, file) => pathToFileURL(path.join(dir, file)).href;
const headDir = path.join(repo, '.tmp/c-b1-head/src/lib'), curDir = path.join(repo, 'src/lib');
const fixtureRoot = existsSync(path.join(repo, '.tmp/second-audit-2026-10-17/review/raw/index.json')) ? repo : path.resolve(repo, '../../..');
const { load, index } = await import(url(fixtureRoot, 'bench/second-performance-audit-2026-10-17/review/fixtures-lib.mjs'));
const H = { limit: await import(url(headDir, 'palette-limit.js')), gen: await import(url(headDir, 'palette-generated.js')), sum: await import(url(headDir, 'source-color-summary.js')) };
const C = { limit: await import(url(curDir, 'palette-limit.js')), gen: await import(url(curDir, 'palette-generated.js')), sum: await import(url(curDir, 'source-color-summary.js')) };
const { FULL_PRESETS } = await import(url(curDir, 'palette-library.js'));
const colors = FULL_PRESETS.find(p => p.id === 'preset-res64').colors, CHUNK = 128 * 1024;
const clip = name => index.filter(e => e.file.startsWith(name + '.')).sort((a, b) => +a.file.split('.').pop() - +b.file.split('.').pop()).map(e => ({ original: load(e.file), weight: 100 }));
const workloads = { sheet2048: [{ original: load('kenney-sheet-2048.png'), weight: 1 }], tinyKnight16: [{ original: load('dungeon-knight.png'), weight: 1 }], motion256: clip('kenney-motion-256.gif') };
const median = a => +[...a].sort((x, y) => x - y)[a.length >> 1].toFixed(3);
const raw = frames => async function* () { for (const f of frames) for (let at = 0; at < f.original.data.length; at += CHUNK) yield { data: f.original.data.subarray(at, Math.min(at + CHUNK, f.original.data.length)), weight: f.weight }; };
const hist = h => async function* () { yield h; };
const time = async fn => { const s = performance.now(); await fn(); return performance.now() - s; };
const limitJobs = (mod, input) => async () => { for (const k of [2, 4, 8]) await mod.selectPaletteSubset(colors, k, input, { metric: 'oklab' }); };
const auto = (mod, frames, h) => async () => { const acc = mod.createGeneratedAccumulator(128); acc.beginAsset(); if (h) await acc.addChunk(h.data, 1, h.weights); else for await (const c of raw(frames)()) await acc.addChunk(c.data, c.weight); await acc.endAsset(); await acc.finish(); };
const report = { runs: 11, note: 'Shared desktop host (Node ' + process.version + '); alternating HEAD/new; differences under ~10% are noise.' };
for (const [name, frames] of Object.entries(workloads)) {
  for (const f of frames) await C.sum.sourceColorSummary(f.original);
  const h = C.sum.summaryHistogram(frames);
  const t = { headLimitRaw: [], newLimitHistogram: [], newLimitRawFallback: [], headAutoRaw: [], newAutoHistogram: [], newAutoRawFallback: [], headSliceCopies: [], newSummaryHistogram: [], headColdSummaryScan: [], newColdSummaryScan: [] };
  for (let r = 0; r < 12; r++) {
    const keep = r > 0; // first round warms the JIT
    const push = (k, v) => keep && t[k].push(v);
    push('headLimitRaw', await time(limitJobs(H.limit, raw(frames))));
    push('newLimitHistogram', await time(limitJobs(C.limit, hist(h))));
    push('newLimitRawFallback', await time(limitJobs(C.limit, raw(frames))));
    push('headAutoRaw', await time(auto(H.gen, frames)));
    push('newAutoHistogram', await time(auto(C.gen, frames, h)));
    push('newAutoRawFallback', await time(auto(C.gen, frames)));
    push('headSliceCopies', await time(() => { for (let k = 0; k < 3; k++) for (const f of frames) for (let at = 0; at < f.original.data.length; at += CHUNK) f.original.data.slice(at, at + CHUNK); }));
    push('newSummaryHistogram', await time(() => { for (let k = 0; k < 3; k++) C.sum.summaryHistogram(frames); }));
    const copies = frames.map(f => ({ ...f.original, data: new Uint8ClampedArray(f.original.data) })), copies2 = copies.map(o => ({ ...o }));
    push('headColdSummaryScan', await time(async () => { for (const o of copies) await H.sum.sourceColorSummary(o); }));
    push('newColdSummaryScan', await time(async () => { for (const o of copies2) await C.sum.sourceColorSummary(o); }));
  }
  report[name] = { histogramEntries: h?.weights.length ?? null, rawBytes: frames.reduce((n, f) => n + f.original.data.length, 0), ms: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, median(v)])) };
}
report.units = 'Limiter: three sequential jobs (Max colors 2, 4, 8). Auto: one asset. Slice/histogram: three passes of main-thread input preparation. Summary: one cold scan per frame.';
writeFileSync(path.join(import.meta.dirname, 'timing.result.json'), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report, null, 1));
