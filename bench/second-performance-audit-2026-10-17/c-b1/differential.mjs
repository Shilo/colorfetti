// C-B1 differential: frozen 0c61dd0 limiter/Auto clients (cooperative, raw pixels)
// against this tree's clients through the cooperative fallback and the real worker
// modules (run in-process behind a structured-clone Worker shim), each without and
// with completed source summaries (histogram path where eligible, fallback otherwise).
// Usage: git archive 0c61dd0 src/lib | tar -x -C .tmp/c-b1-head; node <this file>
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(import.meta.dirname, '../../..');
const url = (dir, file, tag = '') => pathToFileURL(path.join(dir, file)).href + tag;
const headDir = path.join(repo, '.tmp/c-b1-head/src/lib'), curDir = path.join(repo, 'src/lib');
const fixtureRoot = existsSync(path.join(repo, '.tmp/second-audit-2026-10-17/review/raw/index.json')) ? repo : path.resolve(repo, '../../..');
const { load, index, edgeCases } = await import(url(fixtureRoot, 'bench/second-performance-audit-2026-10-17/review/fixtures-lib.mjs'));

let scope;
const traffic = { histogramChunks: 0, pixelChunks: 0 };
class NodeWorker {
  constructor(href) {
    const worker = this;
    scope = { postMessage: m => { const data = structuredClone(m); setImmediate(() => worker.onmessage?.({ data })); } };
    globalThis.self = scope; this.scope = scope;
    this.ready = import(href + '?w=' + Math.random());
  }
  postMessage(m, transfer = []) { if (m.type === 'chunk') traffic[m.weights ? 'histogramChunks' : 'pixelChunks']++; const data = structuredClone(m, { transfer }); this.ready.then(() => setImmediate(() => this.scope.onmessage({ data }))); }
  terminate() { this.scope.onmessage = () => {}; }
}
const headLimit = await import(url(headDir, 'palette-limit-client.js')), headGen = await import(url(headDir, 'palette-generated-client.js'));
const headSources = await import(url(headDir, 'palette-generated-sources.js')), headQ = await import(url(headDir, 'quantize.js'));
const { FULL_PRESETS } = await import(url(headDir, 'palette-library.js'));
const coopLimit = await import(url(curDir, 'palette-limit-client.js', '?coop')), workLimit = await import(url(curDir, 'palette-limit-client.js', '?worker'));
const coopGen = await import(url(curDir, 'palette-generated-client.js', '?coop')), workGen = await import(url(curDir, 'palette-generated-client.js', '?worker'));
const curSources = await import(url(curDir, 'palette-generated-sources.js')), curQ = await import(url(curDir, 'quantize.js'));
const { sourceColorSummary, summaryHistogram } = await import(url(curDir, 'source-color-summary.js'));

let seed = 0x1b1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32), pick = a => a[Math.floor(rnd() * a.length)];
const clone = o => ({ width: o.width, height: o.height, data: new Uint8ClampedArray(o.data) });
// Random still with `k` distinct RGBs; alpha: opaque | holes (0/255) | soft (partial) | empty.
function still(w, h, k, alpha, base = Math.floor(rnd() * 2 ** 24)) {
  const data = new Uint8ClampedArray(w * h * 4), colors = Array.from({ length: k }, (_, i) => (base + i * 2654435761) >>> 8 & 0xffffff);
  for (let p = 0; p < w * h; p++) {
    const c = p < k ? colors[p] : colors[Math.floor(rnd() ** 2 * k)];
    const a = alpha === 'empty' ? 0 : alpha === 'holes' ? (rnd() < .3 ? 0 : 255) : alpha === 'soft' ? pick([0, 255, 255, 255, 1, 127, 128, 254]) : 255;
    data.set([c >>> 16, c >>> 8 & 255, c & 255, a], p * 4);
  }
  return { width: w, height: h, data };
}
const sources = [];
const add = (name, frames) => sources.push({ name, frames });
for (let n = 0; n < 70; n++) {
  const k = pick([1, 2, 5, 37, 300, 2000, 4096, 4097, 6000]), w = 8 + Math.floor(rnd() * 120), h = Math.max(1, Math.ceil(Math.max(k, 64) / w) + Math.floor(rnd() * 40));
  add(`rand${n}/k${k}`, [{ original: still(w, h, k, pick(['opaque', 'opaque', 'holes', 'soft', 'empty'])), delay: undefined }]);
}
for (let n = 0; n < 24; n++) {
  const frames = 2 + Math.floor(rnd() * 5), k = pick([3, 40, 900, 2500, 3500]), w = 40 + Math.floor(rnd() * 60), h = Math.ceil(k / w) + 5, shared = Math.floor(rnd() * 2 ** 24);
  const soft = n % 6 === 5;
  add(`clip${n}/k${k}x${frames}`, Array.from({ length: frames }, (_, f) => ({ original: still(w, h, k, f === 1 && soft ? 'soft' : pick(['opaque', 'holes']), n % 2 ? shared : undefined), delay: pick([20, 30, 70, 100, 0, undefined, 1.5]) })));
}
for (const [name, image] of Object.entries(edgeCases())) add(`edge/${name}`, [{ original: image }]);
for (const e of index.filter(e => !e.file.includes('.gif.'))) add(`fixture/${e.file}`, [{ original: load(e.file) }]);
for (const gif of [...new Set(index.filter(e => e.file.includes('.gif.')).map(e => e.file.split('.gif.')[0] + '.gif'))]) {
  add(`fixture/${gif}`, index.filter(e => e.file.startsWith(gif + '.')).sort((a, b) => +a.file.split('.').pop() - +b.file.split('.').pop()).map(e => ({ original: load(e.file), delay: 100 })));
}
// Two identical-pixel copies: one never summarized (fallback), one summarized (histogram where eligible).
const item = (frames, copy) => frames.length > 1 || frames[0].delay !== undefined ? { frames: frames.map(f => ({ original: copy(f.original), delay: f.delay })) } : { original: copy(frames[0].original) };
for (const source of sources) {
  source.bare = item(source.frames, clone); source.summed = item(source.frames, clone);
  for (const frame of source.summed.frames ?? [source.summed]) await sourceColorSummary(frame.original);
  const weights = source.summed.frames ? source.summed.frames.map(f => ({ original: f.original, weight: Number.isFinite(f.delay) && f.delay > 0 ? f.delay : 100 })) : [{ original: source.summed.original, weight: 1 }];
  source.histogram = !!summaryHistogram(weights);
}
const randomPalette = n => Array.from({ length: n }, (_, i) => '#' + ((i * 40503 + Math.floor(rnd() * 2 ** 24)) & 0xffffff).toString(16).padStart(6, '0'));
const palettes = [...FULL_PRESETS.map(p => ({ id: p.id, colors: p.colors })), ...[1, 3, 17, 100, 256].map(n => ({ id: 'random' + n, colors: [...new Set(randomPalette(n))] }))];
const report = { limiter: { cases: 0, histogram: 0, fallback: 0, mismatches: [] }, generated: { cases: 0, histogramAssets: 0, fallbackAssets: 0, mismatches: [] }, sources: sources.length };
const withWorker = async (on, run) => { globalThis.Worker = on ? NodeWorker : undefined; try { return await run(); } finally { globalThis.Worker = undefined; } };

for (const source of sources) {
  const big = source.frames.reduce((n, f) => n + f.original.data.length, 0) > 4e6;
  const choices = big ? palettes.filter(p => ['preset-res64', 'preset-edg32', 'preset-pico8', 'random256', 'random3'].includes(p.id) || p.colors.length === 2) : palettes.filter(() => rnd() < .45);
  for (const { id, colors } of choices) {
    if (colors.length < 2) continue;
    for (let t = 0; t < (big ? 2 : 1); t++) {
      const maxColors = 1 + Math.floor(rnd() * (colors.length - 1)), metric = pick(['oklab', 'rgb']), alphaCut = pick([1, 64, 128, 200, 255]);
      const expected = (await withWorker(false, () => headLimit.getLimitedPalette(item(source.frames, o => o), headQ.preparePalette(colors), alphaCut, metric, maxColors))).colors.join();
      const got = {};
      for (const [label, client, worker, which] of [['coop', coopLimit, false, 'bare'], ['coop+summary', coopLimit, false, 'summed'], ['worker', workLimit, true, 'bare'], ['worker+summary', workLimit, true, 'summed']]) {
        const fresh = source[which].frames ? { frames: source[which].frames } : { original: source[which].original };
        got[label] = (await withWorker(worker, () => client.getLimitedPalette(fresh, curQ.preparePalette(colors), alphaCut, metric, maxColors))).colors.join();
      }
      report.limiter.cases++; report.limiter[source.histogram ? 'histogram' : 'fallback']++;
      for (const [label, value] of Object.entries(got)) if (value !== expected) report.limiter.mismatches.push({ source: source.name, id, maxColors, metric, alphaCut, label, expected, value });
    }
  }
}
// Auto: walls of 1-5 assets mixing summarized/unsummarized, histogram/fallback assets.
const small = sources.filter(s => s.frames.reduce((n, f) => n + f.original.data.length, 0) < 4e6);
const walls = [...sources.map(s => [s]), ...Array.from({ length: 60 }, () => Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => pick(small)))];
walls.push(sources.filter(s => s.name.startsWith('fixture/')));
for (const wall of walls) {
  const alphaCut = pick([1, 64, 128, 200, 255]);
  const expected = await withWorker(false, () => headGen.getGeneratedPalette(headSources.captureGeneratedSources(wall.map(s => item(s.frames, o => o)), alphaCut)));
  const got = {};
  for (const [label, client, worker, which] of [['coop', coopGen, false, 'bare'], ['coop+summary', coopGen, false, 'summed'], ['worker', workGen, true, 'bare'], ['worker+summary', workGen, true, 'summed']]) {
    // Fresh wrappers per run defeat neither cache: keys use source identities, which differ per copy and client instance.
    got[label] = await withWorker(worker, () => client.getGeneratedPalette(curSources.captureGeneratedSources(wall.map(s => s[which]), alphaCut)));
  }
  report.generated.cases++;
  for (const s of wall) report.generated[s.histogram ? 'histogramAssets' : 'fallbackAssets']++;
  for (const [label, value] of Object.entries(got)) if (JSON.stringify(value) !== JSON.stringify(expected)) report.generated.mismatches.push({ wall: wall.map(s => s.name), alphaCut, label, expected, value });
}
report.workerTraffic = traffic;
report.identical = !report.limiter.mismatches.length && !report.generated.mismatches.length;
writeFileSync(path.join(import.meta.dirname, 'differential.result.json'), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ identical: report.identical, traffic, limiter: { ...report.limiter, mismatches: report.limiter.mismatches.length }, generated: { ...report.generated, mismatches: report.generated.mismatches.length } }));
process.exit(report.identical ? 0 : 1);
