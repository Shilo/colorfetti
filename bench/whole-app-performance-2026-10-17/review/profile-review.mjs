import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../desktop/baseline-profile/sheet2048');
const input = JSON.parse(await readFile(path.join(root, 'results.json'), 'utf8'));
const attribution = { Fa: 'src/lib/quantize.js convert (nearest)', Ca: 'src/lib/palette-dither.js convertDither', za: 'src/lib/quantize.js colorize', Wu: 'src/lib/source-color-summary.js scanSummary', ul: 'src/lib/palette-decode.js native BGRA reorder', Ys: 'src/lib/save.js PNG row packing' };
const report = { baseline: '217cb64360784c066e944f8121858d7726f0e4f2', bundle: 'index-8I8UNd-r.js', notes: ['Independent aggregation of desktop profiler-owned traces; not a fresh performance run.', 'Self sample weights use CDP timeDeltas and merge duplicate stack nodes by complete call frame. They approximate CPU attribution, not deterministic function timers or comparative wins.', 'Minified names were checked against the frozen built bundle and source bodies. Renderer TaskDuration excludes worker CPU; ScriptDuration undercounts MessageChannel work.'], rows: [] };
for (const [i, row] of input.rows.entries()) {
  const profile = JSON.parse(await readFile(path.join(root, `profile-${i}.json`), 'utf8'));
  const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame])), weights = new Map();
  for (const [j, id] of profile.samples.entries()) {
    const frame = nodes.get(id), key = JSON.stringify(frame), previous = weights.get(key) || { ...frame, approximateSelfMs: 0 };
    previous.approximateSelfMs += profile.timeDeltas[j] / 1000;
    weights.set(key, previous);
  }
  const all = [...weights.values()].map(frame => ({ ...frame, approximateSelfMs: +frame.approximateSelfMs.toFixed(3), ...(attribution[frame.functionName] ? { attribution: attribution[frame.functionName] } : {}) })).sort((a, b) => b.approximateSelfMs - a.approximateSelfMs);
  report.rows.push({ stage: row.name, rendererCpuMs: row.cpuMs, top: all.slice(0, 12), attributed: all.filter(frame => frame.attribution) });
}
await writeFile(path.join(import.meta.dirname, 'profile-review.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.rows.map(row => ({ stage: row.stage, taskMs: row.rendererCpuMs.TaskDuration, attributed: row.attributed.map(f => ({ function: f.attribution, selfMs: f.approximateSelfMs })) })), null, 2));
