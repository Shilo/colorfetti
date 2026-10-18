// Hypothesis check only (no production edit): when only Brightness (`source`) changes and the
// source pixels and opacity cut are unchanged, analyze() recomputes right/down/edges/hasAlpha/
// soft, which depend only on data+cut. Reusing them and redoing only the brightness pass,
// Otsu and seams should give identical masks. Node timing is indicative (shared host).
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {decode} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {analyze, mask, otsu} from '../../../src/lib/recolor.js';
import {defaults} from '../../../src/lib/settings.js';
import {STYLES} from '../../../src/lib/presets.js';
// Mirrors recolor.js SOURCES / toneCenter / seam code for the reuse variant.
const SOURCES = {luma: [0.2126, 0.7152, 0.0722], red: [1, 0, 0], green: [0, 1, 0], blue: [0, 0, 1]};
function reanalyzeSource(prev, source) {
  const {w, h, data, cut} = prev, lum = new Uint8Array(w * h), hist = new Uint32Array(256), value = source === 'value', [wr, wg, wb] = SOURCES[source] ?? SOURCES.luma;
  let lo = 255, hi = 0;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (data[i + 3] < cut) continue;
    const l = (lum[p] = value ? Math.max(data[i], data[i + 1], data[i + 2]) : Math.round(wr * data[i] + wg * data[i + 1] + wb * data[i + 2]));
    hist[l]++; if (l < lo) lo = l; if (l > hi) hi = l;
  }
  const img = {...prev, lum, hist, lo, hi, auto: otsu(hist, 127), icons: undefined, sprites: undefined};
  let dn = 0, ds = 0, ln = 0, ls = 0;
  for (let i = 0; i < 256; i++) if (i <= img.auto) { dn += hist[i]; ds += i * hist[i]; } else { ln += hist[i]; ls += i * hist[i]; }
  img.autoTone = dn && ln ? Math.round((ds / dn + ls / ln) / 2) : img.auto;
  const sh = new Array(256).fill(0), t = img.auto, {right, down} = img;
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) { const light = lum[p] > t; if (x + 1 < w && lum[p + 1] > t === light) sh[right[p]]++; if (y + 1 < h && lum[p + w] > t === light) sh[down[p]]++; }
  sh[0] = 0; img.autoSeam = Math.max(24, otsu(sh, 0)); // MIN_EDGE
  return img;
}
const out = [];
for (const f of ['kenney-sheet-1024.png', 'kenney-sheet-2048.png']) {
  const d = await decode(readFileSync('bench/practical-workloads-2026-10-16/fixtures/' + f)), image = {width: d.w, height: d.h, data: new Uint8ClampedArray(d.frames[0])};
  const luma = analyze(image, 'luma');
  for (const source of ['red', 'green', 'value']) {
    const full = analyze(image, source), reuse = reanalyzeSource(luma, source);
    let maskDiff = 0;
    for (const [style] of STYLES) { const a = mask(full, style, defaults(style), 256, 256), b = mask(reuse, style, defaults(style), 256, 256); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) maskDiff++; }
    const fields = ['auto', 'autoTone', 'autoSeam', 'autoLine', 'lo', 'hi'].filter(k => full[k] !== reuse[k]);
    const time = fn => { const t = []; for (let k = 0; k < 5; k++) { const s = performance.now(); fn(); t.push(performance.now() - s); } return +t.sort((x, y) => x - y)[2].toFixed(1); };
    out.push({fixture: f, source, maskDiff, differingFields: fields, fullAnalyzeMedianMs: time(() => analyze(image, source)), reuseMedianMs: time(() => reanalyzeSource(luma, source))});
  }
}
const result = {hypothesis: 'Brightness-only reanalysis reuses right/down/edges/autoLine/hasAlpha/soft from the same-source same-cut analysis', exactAtSampled256: out.every(r => !r.maskDiff && !r.differingFields.length), note: 'MIN_EDGE 24 mirrored from recolor.js; masks compared for all 11 styles at default settings, 256x256 sampled; Node on shared host, indicative', rows: out};
writeFileSync(path.join(import.meta.dirname, 'brightness-candidate.json'), JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(result, null, 1));
