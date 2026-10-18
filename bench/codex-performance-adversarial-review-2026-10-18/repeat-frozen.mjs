// Reproduce the reviewed snapshot without reading or changing concurrent work.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd(), revision = '6f8238a', out = path.resolve('bench/codex-performance-adversarial-review-2026-10-18');
const target = path.resolve('.tmp/codex-performance-adversarial-review-2026-10-18/repeat-6f-source');
if (path.relative(root, target).startsWith('..') || existsSync(target)) throw Error('Refuse an outside or existing snapshot target.');
mkdirSync(target, { recursive: true });
const archive = execFileSync('git', ['archive', '--format=tar', revision, 'src', 'build', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'docs/styles.md', 'bench/brand-icons-qa.mjs', '.github/workflows/deploy.yml'], { maxBuffer: 128 * 1024 * 1024 });
const tar = path.join(target, 'source.tar'); writeFileSync(tar, archive); execFileSync('tar', ['-xf', tar, '-C', target]);
const temp = path.join(target, '.tmp/tool-temp'); mkdirSync(temp, { recursive: true });
const env = { ...process.env, TEMP: temp, TMP: temp };
function run(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: target, env, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
  writeFileSync(path.join(out, name), (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0) throw Error(name + ' failed: ' + result.status);
}
run('tests-repeat-frozen.log', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run']);
run('build-repeat-frozen.log', [path.join(root, 'node_modules/vite/bin/vite.js'), 'build']);
const sha = b => createHash('sha256').update(b).digest('hex');
const canonical = (file, b) => /\.(?:js|css|html|json|svg|webmanifest)$/.test(file) ? Buffer.from(b.toString('utf8').replaceAll('\r\n', '\n')) : b;
const original = path.resolve('.tmp/codex-performance-adversarial-review-2026-10-18/current/dist');
function files(dir, prefix = '') { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]); }
const oldFiles = files(original).sort(), newFiles = files(path.join(target, 'dist')).sort();
if (JSON.stringify(oldFiles) !== JSON.stringify(newFiles)) throw Error('Dist file set differs.');
const comparisons = oldFiles.map(file => {
  const a = readFileSync(path.join(original, file)), b = readFileSync(path.join(target, 'dist', file));
  return { file, rawEqual: sha(a) === sha(b), canonicalEqual: sha(canonical(file, a)) === sha(canonical(file, b)) };
});
const result = { created: new Date().toISOString(), revision, target, testsPassed: true, buildPassed: true, comparisons, mismatches: comparisons.filter(x => !x.canonicalEqual) };
writeFileSync(path.join(out, 'repeat-frozen.json'), JSON.stringify(result, null, 2) + '\n');
console.log({ revision, testsPassed: true, buildPassed: true, assets: comparisons.length, mismatches: result.mismatches });
if (result.mismatches.length) process.exitCode = 1;
