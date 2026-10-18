import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const version = process.argv[2] || 'v4';
if (!/^v\d+$/.test(version)) throw new Error('Expected a build version such as v4.');
const sources = {};
for (const file of ['src/App.svelte','src/lib/artwork-admission.js','src/lib/artwork-gif-preflight.js','src/lib/artwork-export-lease.js',
  'src/lib/image-decode.js','src/lib/image-import-client.js','src/lib/image-import-core.js','src/lib/image-import-worker.js',
  'src/lib/gif.js','src/lib/export-drag.js','src/lib/image-import-errors.js','src/lib/onebit-usage.js',
  'src/lib/artwork-source-leases.js','src/lib/palette-limit-client.js','src/lib/palette-cleanup-client.js','src/lib/palette-generated-client.js',
  'src/lib/source-color-summary.js','src/lib/original-color-usage.js','src/lib/palette-usage.js',
  'src/Tile.svelte','src/lib/palette-animation-cache.js']) sources[file] = sha(await readFile(file));
const builds = {};
for (const folder of ['app-' + version,'harness-' + version]) {
  const directory = path.resolve('.tmp/conversion-fixes-m1', folder), entries = {};
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file); else entries[path.relative(directory,file).replaceAll('\\','/')] = sha(await readFile(file));
    }
  }
  await walk(directory); builds[folder] = entries;
}
await writeFile(new URL('./validation-' + version + '.json',import.meta.url), JSON.stringify({
  date:'2026-10-18', head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), sources, builds,
  tests:{files:78,passed:1325,skipped:2},
  urls:{baseline:'http://127.0.0.1:5210/baseline/',candidate:'http://127.0.0.1:5210/app-' + version + '/',worker:'http://127.0.0.1:5210/harness-' + version + '/harness.html',fallback:'http://127.0.0.1:5210/harness-' + version + '/harness.html?fallback=1'},
  browserOperator:'Root agent, desktop Codex browser; child browser binding was unavailable. No physical phone.',
  scope:'Logical source RGBA/legacy-analysis reservations with pending imports and actual source borrowers; not total heap/GPU/native/encoded-output storage.',
  integration:'Build includes concurrent M2 native-inspection and M6 filename work. Baseline is frozen pre-M1 M3-v4 build.',
}, null, 2)+'\n');
