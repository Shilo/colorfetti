// Alternating original/candidate Node timings (wall clock; Windows thread CPU is 15.6 ms-grained).
// node --expose-gc timing.mjs [runs=9] [regex]    warmed medians/minima, every (matching) task below
// node timing.mjs cold <variant> <task> <file>   one first call in a fresh process (see cold.mjs)
// Variants: original = frozen/, candidate = candidate/, seams = frozen/ plus only the addSeams hunk.
import { index, load } from './fixtures-lib.mjs';
const V = { original: await import('./frozen/recolor.js'), candidate: await import('./candidate/recolor.js'), seams: await import('./variant-seams-only/recolor.js') };
const frames = gif => index.filter(e => e.gif === gif).map(e => load(e.file));
// Each task returns a closure to time; preparation (decode/analysis) happens outside the clock.
const TASKS = {
  'iconOf auto': (R, src) => { const img = R.analyze(src); return () => R.iconOf(img, 'auto'); },
  'iconOf keep': (R, src) => { const img = R.analyze(src); return () => R.iconOf(img, 'keep'); },
  'iconOf trim': (R, src) => { const img = R.analyze(src); return () => R.iconOf(img, 'trim'); },
  'spritesOf': (R, src) => { const img = R.analyze(src); return () => R.spritesOf(img); },
  'analyze luma': (R, src) => () => R.analyze(src, 'luma'),
  'analyze value': (R, src) => () => R.analyze(src, 'value'),
  'analyze green': (R, src) => () => R.analyze(src, 'green'),
  'unify seams': (R, list) => { const imgs = list.map(f => R.analyze(f)); return () => R.unify(imgs); },
};
const time = (R, task, src, batch = 1) => {
  const runs = Array.from({ length: batch }, () => TASKS[task](R, src));
  globalThis.gc?.(); // run with --expose-gc: no collection of a previous sample's arrays inside the clock
  const t = performance.now();
  for (const run of runs) run();
  return (performance.now() - t) / batch;
};
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
if (process.argv[2] === 'cold') {
  const [, , , variant, task, file] = process.argv;
  console.log(JSON.stringify({ variant, task, file, ms: +time(V[variant], task, file.endsWith('.gif') ? frames(file) : load(file)).toFixed(3) }));
} else {
  const runs = +(process.argv[2] ?? 9), results = [];
  const big = ['iconOf auto', 'iconOf keep', 'iconOf trim', 'spritesOf', 'analyze luma', 'analyze value', 'analyze green'];
  const plan = [
    ...['kenney-sheet-1024.png', 'kenney-sheet-2048.png'].flatMap(file => big.map(task => ({ file, task, src: load(file), batch: 1 }))),
    ...['kenney-motion-128.gif', 'kenney-motion-256.gif', 'real-magic.gif'].map(file => ({ file, task: 'unify seams', src: frames(file), batch: file === 'real-magic.gif' ? 200 : 1 })),
    // Adverse tiny cases: many calls per sample, reported per call.
    ...['dungeon-knight.png', 'platformer-pilot.png', 'real-magic.gif.0'].flatMap(file => big.map(task => ({ file, task, src: load(file), batch: 500 }))),
  ];
  const only = process.argv[3] && new RegExp(process.argv[3]);
  for (const { file, task, src, batch } of plan) {
    if (only && !only.test(`${file} ${task}`)) continue;
    const variants = task.startsWith('analyze') || task === 'unify seams' ? ['original', 'seams', 'candidate'] : ['original', 'candidate'];
    const ms = Object.fromEntries(variants.map(v => [v, []]));
    for (const v of variants) for (let i = 0; i < 2; i++) time(V[v], task, src, batch); // warm
    for (let i = 0; i < runs; i++) for (const v of i % 2 ? [...variants].reverse() : variants) ms[v].push(time(V[v], task, src, batch));
    const row = { file, task, batch, median: {}, min: {} };
    for (const v of variants) { row.median[v] = +med(ms[v]).toFixed(4); row.min[v] = +Math.min(...ms[v]).toFixed(4); }
    row.deltaMs = +(row.median.candidate - row.median.original).toFixed(4);
    row.change = `${(100 * (row.median.candidate / row.median.original - 1)).toFixed(1)}%`;
    results.push(row);
    console.log(`${file} ${task}`.padEnd(34), variants.map(v => `${v} ${row.median[v]}`).join('  '), ` delta ${row.deltaMs} ms (${row.change})`);
  }
  (await import('node:fs')).writeFileSync(import.meta.dirname + (only ? '/timing-warm-focus.json' : '/timing-warm.json'), JSON.stringify({ node: process.version, runs, at: new Date().toISOString(), results }, null, 1));
}
