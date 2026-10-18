// Candidate C desktop A/B summary from probe receipts (.tmp/second-audit-2026-10-17/desktop-raw/ab-*.json).
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw'), here = import.meta.dirname;
const wfs = {
  icon2048: ['target', 'cold Icon first prep, sheet2048', 'click→paint'], icon1024: ['target', 'cold Icon first prep, sheet1024', 'click→paint'],
  stencil2048: ['target', 'cold Stencil first prep, sheet2048', 'click→paint'], stencil1024: ['target', 'cold Stencil first prep, sheet1024', 'click→paint'],
  bright2048: ['target', 'rapid Brightness R→G→Value, sheet2048', 'first click→final paint'],
  batch: ['adverse', '8 sprites + effect import', 'paste→exact counts'], sheet1024: ['adverse', 'sheet1024 import', 'paste→exact counts'],
  sheet2048: ['adverse', 'sheet2048 import', 'paste→exact counts'], motion256: ['adverse', 'motion256 (48 frames) import', 'paste→exact counts'],
  tiny11: ['adverse', 'tiny 11-style pass (dungeon-wizard)', 'first click→11th paint'],
};
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const r1 = v => Math.round(v * 10) / 10;
const files = readdirSync(raw).filter(f => /^ab-.*-p\d-[AB]\.json$/.test(f));
const out = {}, lines = [];
for (const [wf, [kind, label, metric]] of Object.entries(wfs)) {
  const trials = files.filter(f => f.startsWith(`ab-${wf}-p`)).map(f => {
    const s = JSON.parse(readFileSync(path.join(raw, f), 'utf8')), [, pair, v] = f.match(/-p(\d)-([AB])\.json$/);
    const ms = ['bright2048', 'tiny11'].includes(wf) ? s.readyAt - s.firstAt : (s.fromLastActionMs ?? s.fromActionMs);
    return {pair: +pair, variant: v, order: +pair % 2 ? 'AB' : 'BA', ms: r1(ms), maxLongTaskMs: Math.round(s.maxLongtaskMs), longTaskTotalMs: Math.round(s.longtaskTotalMs), rafMaxGapMs: r1(s.rafMaxGapMs), windowMs: r1(s.elapsedMs), cpuGateMs: r1(s.gate.cpuMinMs), gateOk: s.gate.ok, visibility: s.visibility};
  }).sort((a, b) => a.pair - b.pair || (a.order === 'AB' ? a.variant.localeCompare(b.variant) : b.variant.localeCompare(a.variant)));
  const A = trials.filter(t => t.variant === 'A'), B = trials.filter(t => t.variant === 'B');
  const m = {A: med(A.map(t => t.ms)), B: med(B.map(t => t.ms)), ltA: med(A.map(t => t.maxLongTaskMs)), ltB: med(B.map(t => t.maxLongTaskMs))};
  const paired = [1, 2, 3, 4, 5].map(p => r1(B.find(t => t.pair === p).ms - A.find(t => t.pair === p).ms));
  const delta = m.B - m.A, pct = 100 * delta / m.A;
  const gate = kind === 'target'
    ? (m.B <= m.A && m.ltB <= m.ltA ? 'PASS (not worse on desktop)' : 'FAIL (worse on desktop)')
    : (delta > 3 && pct > 5 ? 'FAIL (>5% and >3 ms)' : 'PASS');
  out[wf] = {kind, label, metric, medianMs: {A: r1(m.A), B: r1(m.B)}, deltaMs: r1(delta), deltaPct: r1(pct), medianMaxLongTaskMs: {A: m.ltA, B: m.ltB}, pairedDeltaMs: paired, bWinsPairs: paired.filter(d => d < 0).length, allGatesOk: trials.every(t => t.gateOk), gate, trials};
  lines.push(`| ${kind} | ${label} (${metric}) | ${r1(m.A)} | ${r1(m.B)} | ${r1(delta)} (${r1(pct)}%) | ${m.ltA} → ${m.ltB} | ${paired.join(', ')} | ${gate} |`);
}
writeFileSync(path.join(here, 'results.json'), JSON.stringify({date: '2026-10-17', A: 'base-repro (index-BGYDinXj.js, byte-identical to 5371 baseline)', B: 'cand-all (review/candidate-all.patch, index-Ds0vlcWS.js)', browser: 'Claude/2.42304.0 Chrome/152.0.7977.149, 927x827, DPR 1, plain builds, no profiler', workflows: out}, null, 1) + '\n');
console.log(lines.join('\n'));
