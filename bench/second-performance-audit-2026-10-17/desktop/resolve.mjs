// Resolves JS Self-Profiling traces (posted by probe.js into .tmp/.../desktop-raw)
// to original src file:line through the sourcemap build, and aggregates self/total ms.
// usage: node resolve.mjs <prefix-regex> [top=15]   (merges every matching *.trace.json)
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {TraceMap, originalPositionFor} from '@jridgewell/trace-mapping';
const raw = path.resolve('.tmp/second-audit-2026-10-17/desktop-raw'), dist = path.resolve('.tmp/second-audit-2026-10-17/baseline-maps/dist');
const maps = new Map();
function mapFor(url) {
  const p = new URL(url).pathname;
  if (!maps.has(p)) { try { maps.set(p, new TraceMap(readFileSync(path.join(dist, p + '.map'), 'utf8'))); } catch { maps.set(p, null); } }
  return maps.get(p);
}
const lines = new Map();
// Original function name from the declaration line (profiler frames point at function starts).
function srcName(src, line) {
  if (!src.startsWith('src/')) return null;
  if (!lines.has(src)) { try { lines.set(src, readFileSync(src, 'utf8').split('\n')); } catch { lines.set(src, []); } }
  const m = (lines.get(src)[line - 1] || '').match(/function\*?\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:async\s*)?(?:\(|\w+\s*=>|function)|(\w+)\s*\(/);
  return m && (m[1] || m[2] || m[3]);
}
function label(trace, frameId) {
  const f = trace.frames[frameId];
  if (f.resourceId == null) return '(native) ' + (f.name || '?');
  const url = trace.resources[f.resourceId], m = mapFor(url);
  if (!m) return `${f.name || '(anon)'} ${new URL(url).pathname}:${f.line}`;
  // Profiler line/column are 1-based; trace-mapping wants 0-based columns.
  let o; try { o = originalPositionFor(m, {line: f.line, column: Math.max(0, f.column - 1)}); } catch { o = {}; }
  if (!o.source) return `${f.name || '(anon)'} ${new URL(url).pathname}:${f.line}:${f.column}`;
  const src = o.source.includes('node_modules/') ? o.source.replace(/^.*node_modules\//, 'node_modules/') : o.source.replace(/^.*?\/src\//, 'src/');
  return `${srcName(src, o.line) || o.name || f.name || '(anon)'} ${src}:${o.line}`;
}
export function aggregate(files) {
  const self = new Map(), total = new Map(); let busy = 0, all = 0, probeMs = 0;
  for (const file of files) {
    const t = JSON.parse(readFileSync(file, 'utf8')), s = t.samples;
    for (let i = 0; i < s.length; i++) {
      // Weight = gap to the next sample, capped at 3x the nominal 16 ms so idle stretches do not inflate.
      const w = i + 1 < s.length ? Math.min(s[i + 1].timestamp - s[i].timestamp, 48) : 16; all += w;
      if (s[i].stackId == null) continue;
      // Drop samples inside the test probe (Profiler construction/stop, polling).
      let probe = false; for (let id = s[i].stackId; id != null; id = t.stacks[id].parentId) { const fr = t.frames[t.stacks[id].frameId]; if (fr.resourceId != null && t.resources[fr.resourceId].includes('desktop-probe')) { probe = true; break; } }
      if (probe) { probeMs += w; continue; }
      busy += w;
      const seen = new Set(); let id = s[i].stackId, top = true;
      while (id != null) { const st = t.stacks[id], k = label(t, st.frameId); if (top) { self.set(k, (self.get(k) || 0) + w); top = false; } if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) || 0) + w); } id = st.parentId; }
    }
  }
  return {busy, all, probeMs, self, total};
}
if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const re = new RegExp(process.argv[2]), top = Number(process.argv[3] || 15);
  const files = readdirSync(raw).filter(f => f.endsWith('.trace.json') && re.test(f)).map(f => path.join(raw, f));
  const {busy, all, probeMs, self, total} = aggregate(files);
  console.log(`${files.length} traces, sampled ${all.toFixed(0)} ms, app JS-busy ${busy.toFixed(0)} ms, probe ${probeMs.toFixed(0)} ms`);
  const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, top);
  for (const [k, v] of rows) console.log(`self ${v.toFixed(0).padStart(6)} total ${total.get(k).toFixed(0).padStart(6)}  ${k}`);
  console.log('-- top total');
  for (const [k, v] of [...total].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`total ${v.toFixed(0).padStart(6)} self ${(self.get(k) || 0).toFixed(0).padStart(6)}  ${k}`);
}
