// C-B5 timing in Node. (1) Synchronous `analyze`, HEAD 0c61dd0 against the candidate, in
// alternating order, medians of 31 per side. (2) Live reanalysis of the 2048 sheet through
// `reanalyzeItem`: every main-thread stretch between posted tasks (MessageChannel wrapped
// to stamp delivery and post), and total elapsed, against HEAD's single synchronous stretch.
// node bench/second-performance-audit-2026-10-17/c-b5/timing.mjs > timing.result.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from '../review/fixtures-lib.mjs';
// bench/bench.mjs's photo (that module runs its whole bench on import)
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
const repo = path.resolve(import.meta.dirname, '../../..');
const O = await import(pathToFileURL(path.join(repo, '.tmp/c-b5/frozen/src/lib/recolor.js')));
const N = await import(pathToFileURL(path.join(repo, 'src/lib/recolor.js')));
const OR = await import(pathToFileURL(path.join(repo, '.tmp/c-b5/frozen/src/lib/image-reanalysis.js')));
const NR = await import(pathToFileURL(path.join(repo, 'src/lib/image-reanalysis.js')));
const median = a => { const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
const sheet = load('kenney-sheet-2048.png');
const images = { 'photo 512': photo(512, 512, false), 'photo 2048': photo(2048, 2048, false), 'photo 2048 sprite': photo(2048, 2048, true), 'sheet 2048': sheet };
const report = { sync: {}, reanalysis: {} };
for (const [name, img] of Object.entries(images)) for (const source of ['luma', 'value', 'red']) {
  const a = [], b = [];
  for (let k = 0; k < 31; k++) for (const [side, M] of k % 2 ? [[a, O], [b, N]] : [[b, N], [a, O]]) {
    const t = performance.now(); M.analyze(img, source); side.push(performance.now() - t);
  }
  // the median of each adjacent pair's ratio resists load drifting during the run
  report.sync[`${name} ${source}`] = { headMs: median(a), candidateMs: median(b), pairedRatio: +median(a.map((t, k) => b[k] / t)).toFixed(3) };
}
const Real = globalThis.MessageChannel;
let marks = [];
globalThis.MessageChannel = class {
  constructor() {
    const c = new Real();
    this.port2 = { postMessage: v => { marks.push(['post', performance.now()]); c.port2.postMessage(v); }, close: () => c.port2.close() };
    this.port1 = { set onmessage(f) { c.port1.onmessage = e => { marks.push(['run', performance.now()]); f(e); }; }, close: () => c.port1.close() };
  }
};
const item = { id: 1, original: sheet, img: N.analyze(sheet), by: 'stale' }; // never matches, so every source reanalyses
async function measure(R, source) {
  marks = [];
  const t0 = performance.now(), out = await R.reanalyzeItem(item, { source }), t1 = performance.now();
  if (out.by !== source + ' ') throw new Error('not reanalysed');
  const stretches = [];
  for (let i = 0; i < marks.length; i++) if (marks[i][0] === 'run') stretches.push((marks[i + 1]?.[1] ?? t1) - marks[i][1]);
  return { total: t1 - t0, max: Math.max(...stretches), tasks: stretches.length };
}
for (const source of ['red', 'green', 'value', 'luma']) {
  const head = [], cand = [];
  for (let k = 0; k < 9; k++) { head.push(await measure(OR, source)); cand.push(await measure(NR, source)); }
  const sum = runs => ({ maxStretchMs: median(runs.map(r => r.max)), postedTasks: median(runs.map(r => r.tasks)), totalMs: median(runs.map(r => r.total)) });
  report.reanalysis['sheet 2048 ' + source] = { head: sum(head), candidate: sum(cand) };
}
globalThis.MessageChannel = Real;
console.log(JSON.stringify(report, null, 1));
