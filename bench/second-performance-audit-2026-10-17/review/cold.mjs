// First call in a fresh process (module load and JIT cold), alternating original/candidate processes.
// node cold.mjs [repeats=7]  -> median and all first-call samples per task
import { execFileSync } from 'node:child_process';
const repeats = +(process.argv[2] ?? 7), tasks = ['iconOf auto', 'iconOf trim', 'spritesOf', 'analyze luma', 'analyze value', 'analyze green'];
const out = [];
for (const file of ['kenney-sheet-1024.png', 'kenney-sheet-2048.png', 'dungeon-knight.png', 'real-magic.gif.0']) for (const task of tasks) {
  const ms = { original: [], candidate: [] };
  for (let i = 0; i < repeats; i++) for (const v of i % 2 ? ['candidate', 'original'] : ['original', 'candidate'])
    ms[v].push(JSON.parse(execFileSync(process.execPath, [import.meta.dirname + '/timing.mjs', 'cold', v, task, file], { encoding: 'utf8' })).ms);
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  out.push({ file, task, original: med(ms.original), candidate: med(ms.candidate), delta: +(med(ms.candidate) - med(ms.original)).toFixed(3), samples: ms });
  console.log(`${file} ${task}`.padEnd(34), 'cold median', med(ms.original), '->', med(ms.candidate));
}
(await import('node:fs')).writeFileSync(import.meta.dirname + '/timing-cold.json', JSON.stringify({ node: process.version, repeats, at: new Date().toISOString(), results: out }, null, 1));
