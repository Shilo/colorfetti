// C-B1 / C-B5 desktop A/B summary from probe receipts (.tmp/second-audit-2026-10-17/desktop-raw/b1b5-*).
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw'), files = readdirSync(raw);
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const r1 = v => Math.round(v * 10) / 10;
const read = f => JSON.parse(readFileSync(path.join(raw, f), 'utf8'));
const wfs = {
  mc2048: {label: 'Max colors 2→4→8, sheet2048 (sum of steps to settled paint+caption)', target: 'B1', ms: s => s.totalMs},
  mc4: {label: 'Max colors 2→4→8, 4-sprite wall', adverse: true, ms: s => s.totalMs},
  auto: {label: 'Auto + 8 sprites + effect GIF paste → exact captions', adverse: true, ms: s => s.fromActionMs},
  imp2048: {label: 'sheet2048 paste → exact caption (Resurrect 64)', adverse: true, ms: s => s.fromActionMs},
  br2048: {label: 'rapid Brightness R→G→Value, 1-bit sheet2048 (first click→final paint)', target: 'B5', ms: s => s.readyAt - s.firstAt},
  br4: {label: 'rapid Brightness R→G→Value, 1-bit 4-sprite wall', adverse: true, ms: s => s.readyAt - s.firstAt},
};
const out = {};
for (const [wf, def] of Object.entries(wfs)) {
  const trials = files.filter(f => new RegExp(`^b1b5-${wf}-t\\d-(A|B1|B5)\\.json$`).test(f)).map(f => {
    const s = read(f), [, t, v] = f.match(/-t(\d)-(A|B1|B5)\.json$/), disp = files.includes(f.replace('.json', '.display.json')) ? read(f.replace('.json', '.display.json')) : null;
    return {trial: +t, variant: v, ms: r1(def.ms(s)), steps: s.steps?.map(x => r1(x.ms)), maxLongTaskMs: Math.round(s.maxLongtaskMs), rafMaxGapMs: r1(s.rafMaxGapMs), cpuGateMs: r1(s.gate.cpuMinMs), gateOk: s.gate.ok,
      display: JSON.stringify({captions: s.captionsFinal ?? disp?.captions ?? (s.wall || []).map(w => w.name + ' ' + w.caption), hashes: s.canvasHashes ?? disp?.hashes})};
  });
  const by = v => trials.filter(t => t.variant === v), stat = k => Object.fromEntries(['A', 'B1', 'B5'].map(v => [v, r1(med(by(v).map(t => t[k])))]));
  const ms = stat('ms'), lt = stat('maxLongTaskMs'), raf = stat('rafMaxGapMs');
  const verdict = v => {
    const d = ms[v] - ms.A, pct = 100 * d / ms.A;
    if (def.target === v) return ms[v] <= ms.A && lt[v] <= lt.A ? 'TARGET PASS (not worse)' : 'TARGET FAIL (worse on desktop)';
    return d > 3 && pct > 5 ? `ADVERSE FAIL (+${r1(d)} ms, +${r1(pct)}%)` : 'ADVERSE PASS';
  };
  const displays = new Set(trials.map(t => t.display));
  out[wf] = {label: def.label, medianMs: ms, deltaVsA: {B1: r1(ms.B1 - ms.A), B5: r1(ms.B5 - ms.A)}, medianMaxLongTaskMs: lt, medianRafMaxGapMs: raf, verdict: {B1: verdict('B1'), B5: verdict('B5')}, displayIdenticalAcrossBuilds: displays.size === 1, allGatesOk: trials.every(t => t.gateOk), trials};
}
writeFileSync(path.join(import.meta.dirname, 'results.json'), JSON.stringify({date: '2026-10-18', builds: {A: 'w2-base index da76c5d4', B1: 'w2-b1 index 9218fe76', B5: 'w2-b5 index 542adf00'}, browser: 'Claude/2.42304.0 Chrome/152.0.7977.149 built-in browser; same dists via probe server 5421/5424/5425', order: 'trials 1-5: A B1 B5 / B5 B1 A / B1 B5 A / A B5 B1 / B1 A B5', results: out}, null, 1) + '\n');
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(8), JSON.stringify(v.medianMs), 'LT', JSON.stringify(v.medianMaxLongTaskMs), 'raf', JSON.stringify(v.medianRafMaxGapMs), JSON.stringify(v.verdict), 'display same', v.displayIdenticalAcrossBuilds, 'gates', v.allGatesOk, 'n', v.trials.length);
