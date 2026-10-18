import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/App.svelte', 'src/lib/gif.js', 'src/lib/image-import-errors.js',
  'src/lib/image-import-errors.test.js', 'src/lib/gif-geometry.test.js'];
const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(file))])));
const builds = {};
for (const build of ['before', 'after-v2', 'after-v3', 'after-v4']) {
  const directory = path.join('.tmp/conversion-fixes-m3', build), index = await readFile(path.join(directory, 'index.html'));
  const assets = await readdir(path.join(directory, 'assets'));
  builds[build] = { indexSha256: sha(index), assets: Object.fromEntries(await Promise.all(assets.filter(file => /^(index-|image-import-worker-|gif-)/.test(file))
    .map(async file => [file, sha(await readFile(path.join(directory, 'assets', file)))]))) };
}
await writeFile(new URL('./validation.json', import.meta.url), JSON.stringify({
  date: '2026-10-18', head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sources, builds,
  urls: { before: 'http://127.0.0.1:5202/before/', after: 'http://127.0.0.1:5203/after-v4/', harness: 'http://127.0.0.1:5203/harness.html' },
  tests: { files: 7, passed: 135, command: 'vitest run image-import-errors, gif-geometry, gif, gif-loop, image-drop, image-import-client, image-import-worker', temp: '.tmp/conversion-fixes-m3' },
  browser: 'Codex in-app desktop browser, native chooser plus controlled drop harness; normal1280x720 and narrow375x720 viewport; no physical phone',
  caveat: 'Candidate includes concurrent M4 GIF and M5 contrast source edits. Earlier mutable /after directory caused an independently observed transient generic failure; cause inferred as asset mismatch, not proven. Retest passed; final after-v4 bytes frozen in server memory.',
}, null, 2) + '\n');
