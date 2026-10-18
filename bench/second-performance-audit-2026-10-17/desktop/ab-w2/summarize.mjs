// Wave-two desktop A/B summary (C-A1 Threshold drag, C-B4 hover PNG preparation) -> results.json.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw'), files = readdirSync(raw);
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const r1 = v => Math.round(v * 10) / 10;
const load = re => files.filter(f => re.test(f)).map(f => ({f, s: JSON.parse(readFileSync(path.join(raw, f), 'utf8'))}));
const out = {};
// C-A1
{
  const t = load(/^w2a1-p\d-(A|A1)\.json$/).map(({f, s}) => {
    const [, pair, v] = f.match(/-p(\d)-(A1?)\.json$/), press = JSON.parse(readFileSync(path.join(raw, f.replace('.json', '.pressonly.json')), 'utf8'));
    return {pair: +pair, variant: v, dragMs: r1(s.dragMs), dragBusyEstMs: r1(s.dragBusyEstMs), dragIdleMs: r1(s.dragIdleMs), dragLongTaskTotalMs: Math.round(s.dragLongtasks.reduce((a, x) => a + x.duration, 0)), dragMaxLongTaskMs: Math.round(Math.max(0, ...s.dragLongtasks.map(x => x.duration))), dragRafMaxGapMs: r1(s.dragRafMaxGapMs), dragRafP95GapMs: r1(s.dragRafP95GapMs), releaseToFinalMs: r1(s.releaseToFinalMs), windowMs: r1(s.elapsedMs), maxLongTaskMs: Math.round(s.maxLongtaskMs), busyDuringDrag: s.busyDuringDrag, pressOnlyChangedCaption: press.changed, finalCaptions: s.captionsFinal, cpuGateMs: r1(s.gate.cpuMinMs), gateOk: s.gate.ok};
  });
  const A = t.filter(x => x.variant === 'A'), B = t.filter(x => x.variant === 'A1'), stat = k => ({A: r1(med(A.map(x => x[k]))), A1: r1(med(B.map(x => x[k])))});
  const finalSame = t.every(x => JSON.stringify(x.finalCaptions) === JSON.stringify(A[0].finalCaptions));
  const rel = stat('releaseToFinalMs'), relWorse = rel.A1 - rel.A > 50 && (rel.A1 - rel.A) / rel.A > 0.2;
  out['C-A1'] = {workflow: '1-bit Checker wall (4 sprites + sheet1024), Threshold drag 40 inputs every 3 rAF', medians: {dragBusyEstMs: stat('dragBusyEstMs'), dragLongTaskTotalMs: stat('dragLongTaskTotalMs'), dragMaxLongTaskMs: stat('dragMaxLongTaskMs'), dragRafMaxGapMs: stat('dragRafMaxGapMs'), dragRafP95GapMs: stat('dragRafP95GapMs'), dragMs: stat('dragMs'), releaseToFinalMs: rel},
    adverse: {releaseToFinal: relWorse ? 'FAIL (>50 ms and >20%)' : 'PASS', finalCaptionIdentical: finalSame, pressWithoutMoveChangesNoCaption: t.every(x => !x.pressOnlyChangedCaption)}, allGatesOk: t.every(x => x.gateOk), trials: t};
}
// C-B4
for (const [key, label] of [['tiny', 'dungeon-wizard 16x16 palette PNG'], ['sheet1024', 'kenney-sheet-1024 palette PNG (above-threshold control)']]) {
  const t = load(new RegExp(`^w2b4-${key}-p\\d-(A|B4)\\.prep\\.json$`)).map(({f, s}) => {
    const [, pair, v] = f.match(/-p(\d)-(A|B4)\.prep\.json$/);
    return {pair: +pair, variant: v, prepMs: s.prepMs, enterToFileMs: s.enterToFileMs, imageMs: s.imageMs, bytes: s.bytes, maxLongTaskMs: Math.round(s.maxLongtaskMs), longTasks: s.lt, cpuGateMs: r1(s.gate.cpuMinMs), gateOk: s.gate.ok};
  });
  const A = t.filter(x => x.variant === 'A'), B = t.filter(x => x.variant === 'B4');
  const m = {A: r1(med(A.map(x => x.prepMs))), B4: r1(med(B.map(x => x.prepMs)))};
  out['C-B4 ' + key] = {workflow: label + ', hover export preparation (pointerenter mouse -> prepared File URL), 180 ms hover delay subtracted', medianPrepMs: m, deltaPct: r1(100 * (m.B4 - m.A) / m.A), medianMaxLongTaskMs: {A: med(A.map(x => x.maxLongTaskMs)), B4: med(B.map(x => x.maxLongTaskMs))}, sameBytes: t.every(x => x.bytes === t[0].bytes), allGatesOk: t.every(x => x.gateOk), trials: t};
}
writeFileSync(path.join(import.meta.dirname, 'results.json'), JSON.stringify({date: '2026-10-18', builds: {A: 'w2-base index da76c5d4', A1: 'w2-a1 index 5bee0fe4', B4: 'w2-b4 index d591c9e2'}, browser: 'Claude/2.42304.0 Chrome/152.0.7977.149 built-in browser, plain builds served with probe on 5411/5412/5413', results: out}, null, 1) + '\n');
console.log(JSON.stringify(out, (k, v) => k === 'trials' || k === 'finalCaptions' ? undefined : v, 1));
