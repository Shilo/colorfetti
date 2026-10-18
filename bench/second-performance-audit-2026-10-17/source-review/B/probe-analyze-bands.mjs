// H-B5 probe: recolor.js analyze() split into row bands (the unit a cooperative reanalysis
// would yield between). All accumulations are integer counts, min/max and bit OR, so band
// order cannot change them; this checks every analysis field against frozen HEAD and
// reports the per-band cost a posted-task implementation would schedule.
import path from 'node:path';
import { load } from '../../review/fixtures-lib.mjs';
const repo = path.resolve(import.meta.dirname, '../../../..');
const { analyze, otsu } = await import('file:///' + path.join(repo, '.tmp/source-review-B/frozen/recolor.js').replace(/\\/g, '/'));
const SOURCES = { luma: [0.2126, 0.7152, 0.0722], red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1] };
const diff = (d, i, j) => Math.max(Math.abs(d[i] - d[j]), Math.abs(d[i + 1] - d[j + 1]), Math.abs(d[i + 2] - d[j + 2]));
// Probe-local copy of HEAD's non-luma loop body generalized to a row range (luma uses the same
// weights through the generic branch here; equality below is against HEAD's real luma loop).
function analyzeRows(state, y0, y1) {
  const { w, h, data, lum, right, down, hist, edges, cut, wr, wg, wb, value } = state, below = w * 4;
  let { hasAlpha, lo, hi, part } = state;
  for (let y = y0, p = y0 * w, i = p * 4; y < y1; y++) for (let x = 0; x < w; x++, p++, i += 4) {
    part |= data[i + 3] + 1;
    if (data[i + 3] < cut) { hasAlpha = true; continue; }
    const l = (lum[p] = value ? Math.max(data[i], data[i + 1], data[i + 2]) : Math.round(wr * data[i] + wg * data[i + 1] + wb * data[i + 2]));
    hist[l]++;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
    if (x + 1 < w && data[i + 7] >= cut) edges[(right[p] = diff(data, i, i + 4))]++;
    if (y + 1 < h && data[i + below + 3] >= cut) edges[(down[p] = diff(data, i, i + below))]++;
  }
  Object.assign(state, { hasAlpha, lo, hi, part });
}
function seamRows(hist, { w, h, lum, right, down }, t, y0, y1) {
  for (let y = y0, p = y0 * w; y < y1; y++) for (let x = 0; x < w; x++, p++) {
    const r = right[p], d = down[p];
    if (!r && !d) continue;
    const light = lum[p] > t;
    if (r && x + 1 < w && lum[p + 1] > t === light) hist[r]++;
    if (d && y + 1 < h && lum[p + w] > t === light) hist[d]++;
  }
}
function banded({ width: w, height: h, data }, source, cut, rows) {
  const [wr, wg, wb] = SOURCES[source] ?? SOURCES.luma;
  const state = { w, h, data, cut, wr, wg, wb, value: source === 'value', lum: new Uint8Array(w * h), right: new Uint8Array(w * h), down: new Uint8Array(w * h),
    hist: new Uint32Array(256), edges: new Uint32Array(256), hasAlpha: false, lo: 255, hi: 0, part: 0 };
  const bands = [];
  for (let y = 0; y < h; y += rows) { const s = performance.now(); analyzeRows(state, y, Math.min(h, y + rows)); bands.push(performance.now() - s); }
  state.edges[0] = 0;
  const auto = otsu(state.hist, 127), seams = new Array(256).fill(0);
  for (let y = 0; y < h; y += rows) seamRows(seams, state, auto, y, Math.min(h, y + rows));
  seams[0] = 0;
  return { img: { lum: state.lum, right: state.right, down: state.down, hist: state.hist, edges: state.edges, hasAlpha: state.hasAlpha, soft: (state.part & 254) !== 0, lo: state.lo, hi: state.hi, auto, autoSeam: Math.max(24, otsu(seams, 0)), autoLine: Math.max(24, otsu(state.edges, 0)) }, bands };
}
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const fixtures = { sheet1024: load('kenney-sheet-1024.png'), sheet2048: load('kenney-sheet-2048.png'), knight: load('dungeon-knight.png'), motion256f7: load('kenney-motion-256.gif.7') };
const report = { cases: 0, identical: true, bandMs: {} };
for (const [name, img] of Object.entries(fixtures)) for (const source of ['luma', 'value', 'red', 'green', 'blue']) for (const cut of [1, 128, 255]) for (const rows of [1, 7, 64]) {
  const a = analyze(img, source, cut), { img: b, bands } = banded(img, source, cut, rows);
  for (const key of ['lum', 'right', 'down', 'hist', 'edges']) if (!eq(a[key], b[key])) throw new Error(`${name} ${source} ${cut} ${rows} ${key}`);
  for (const key of ['hasAlpha', 'soft', 'lo', 'hi', 'auto', 'autoSeam', 'autoLine']) if (a[key] !== b[key]) throw new Error(`${name} ${source} ${cut} ${rows} ${key}`);
  report.cases++;
  if (name === 'sheet2048' && cut === 128 && rows === 64) report.bandMs[source] = { bands: bands.length, maxBandMs: +Math.max(...bands).toFixed(2), totalMs: +bands.reduce((s, v) => s + v, 0).toFixed(1) };
}
const t = []; for (let i = 0; i < 5; i++) { const s = performance.now(); analyze(fixtures.sheet2048, 'red', 128); t.push(performance.now() - s); }
report.headAnalyzeRed2048Ms = +t.sort((a, b) => a - b)[2].toFixed(1);
console.log(JSON.stringify(report, null, 1));
