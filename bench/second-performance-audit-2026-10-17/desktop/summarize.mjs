// Builds summary.json from the raw window receipts and resolved JS Self-Profiling traces.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {aggregate} from './resolve.mjs';
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw');
const all = readdirSync(raw);
const workflows = {
  'startup restored (warm, runs 2-5)': /^startup-restored[2-5]\.json$/,
  'startup restored (first load)': /^startup-restored1\.json$/,
  'import 8 sprites + effect GIF': /^import-batch-r\d\.json$/,
  'import sheet1024': /^import-sheet1024-r\d\.json$/,
  'import sheet2048': /^import-sheet2048-r\d\.json$/,
  'import motion128 (32 frames)': /^import-animation128-r\d\.json$/,
  'import motion256 (48 frames)': /^import-animation256-r\d\.json$/,
  'Auto: import 8 sprites + effect': /^auto-batch-r\d\.json$/,
  'Auto: import sheet2048': /^auto-sheet2048-r\d\.json$/,
  'cold 1-bit Icon sheet1024': /^cold-icon1024-r\d\.json$/,
  'cold 1-bit Icon sheet2048': /^cold-icon2048-r\d\.json$/,
  'cold 1-bit Stencil sheet1024': /^cold-stencil1024-r\d\.json$/,
  'cold 1-bit Stencil sheet2048': /^cold-stencil2048-r\d\.json$/,
  'rapid Brightness R>G>Value sheet2048 (Cutout)': /^brightness2048-r\d\.json$/,
  'editor256 fill (value+input)': /^editor256-r\d-fill\.json$/,
  'editor256 Review': /^editor256-r\d-review\.json$/,
  'editor256 Next': /^editor256-r\d-next\.json$/,
  'editor256 Previous': /^editor256-r\d-previous\.json$/,
  'dither entropy512 8x8>4x4 (paint+exact count)': /^dither-entropy512-r\d\.json$/,
  'rapid palette settings sheet2048 (RGB/cap8/Cleanup/4x4)': /^rapid-sheet2048-r\d-settings\.json$/,
  'rapid palette settings sheet1024': /^rapid-sheet1024-r\d-settings\.json$/,
  'Preview zoom/Original/Fit/close sheet2048': /^rapid-sheet2048-r\d-preview\.json$/,
  'uninstrumented (5374) cold Icon sheet2048': /^plain-cold-icon2048-r\d\.json$/,
  'uninstrumented (5374) cold Stencil sheet2048': /^plain-cold-stencil2048-r\d\.json$/,
  'uninstrumented (5374) Brightness sheet2048': /^plain-brightness2048-r\d\.json$/,
  'uninstrumented (5374) Brightness sheet1024': /^plain-brightness1024-r\d\.json$/,
};
const r1 = v => Math.round(v * 10) / 10;
const out = {};
for (const [name, re] of Object.entries(workflows)) {
  const files = all.filter(f => re.test(f)).sort();
  const runs = files.map(f => JSON.parse(readFileSync(path.join(raw, f), 'utf8'))).map(s => ({
    file: s.name, readyMs: r1(s.fromLastActionMs ?? s.fromActionMs ?? (s.readyAt - s.start)), paintedMs: s.paintedFromActionMs != null ? r1(s.paintedFromActionMs) : undefined,
    longtasksMs: s.longtasks.map(x => Math.round(x.duration)), rafMaxGapMs: r1(s.rafMaxGapMs), cpuGateMs: s.gate ? r1(s.gate.cpuMinMs) : undefined, visibility: s.visibility,
  }));
  const traces = files.map(f => path.join(raw, f.replace(/\.json$/, '.trace.json'))).filter(f => all.includes(path.basename(f)));
  let hot;
  if (traces.length) {
    const {busy, probeMs, self, total} = aggregate(traces), n = traces.length;
    hot = {traces: n, appJsBusyMsPerRun: r1(busy / n), probeMsPerRun: r1(probeMs / n), top: [...self].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({frame: k, selfMsPerRun: r1(v / n), totalMsPerRun: r1(total.get(k) / n)}))};
  }
  out[name] = {runs, hot};
}
const ua = 'Claude/2.42304.0 Chrome/152.0.7977.149 (Claude desktop built-in browser), viewport 927x827, DPR 1';
writeFileSync(path.join(import.meta.dirname, 'summary.json'), JSON.stringify({date: '2026-10-17', baseline: '3c47699b8f0ee6e58f7d3082d699c81376747dea', browser: ua, profiler: 'JS Self-Profiling API, sampleInterval 16 ms (Windows clamp); self/total = sample-gap weighted, divided by run count; coarse for <50 ms frames', workflows: out}, null, 1) + '\n');
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(58), JSON.stringify(v.runs.map(r => r.readyMs)), 'LT', JSON.stringify(v.runs.map(r => r.longtasksMs)), v.hot ? v.hot.top.slice(0, 2).map(t => `${t.frame} ${t.selfMsPerRun}/${t.totalMsPerRun}`).join('; ') : '');
