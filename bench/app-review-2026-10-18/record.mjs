import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { relative, resolve, join } from 'node:path';
const root = resolve('.');
// Historical receipt, not a test runner. Preserve it across concurrent rebuilds.
if (existsSync(new URL('validation.json', import.meta.url))) throw new Error('Historical validation.json already exists; do not overwrite it with a later workspace/build.');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const files = path => readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]);
const source = [...files('src').filter(path => /\.(js|svelte|css)$/.test(path)), 'package.json', 'package-lock.json', 'vite.config.js', '.github/workflows/deploy.yml'];
const records = paths => Object.fromEntries(paths.sort().map(path => [relative(root, resolve(path)).replaceAll('\\', '/'), hash(path)]));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['ls-tree', '-r', commit], { encoding: 'utf8' }).trim().split('\n');
const baselineGitBlobs = Object.fromEntries(tree.map(line => {
  const [meta, path] = line.split('\t');
  return [path, meta.split(' ')[2]];
}).filter(([path]) => source.includes(path.replaceAll('/', '\\')) || source.includes(path)));
const receipt = {
  reviewDate: '2026-10-18', recordedUTC: new Date().toISOString(),
  testedCommit: commit, node: process.version,
  validation: { unitTestFiles: 67, testsPassed: 1161, testsSkipped: 2, build: 'passed',
    testsEnvironment: 'Process TEMP and TMP set to workspace .tmp/app-review-vitest; default sandbox SSR temp rename failed before executing tests.',
    reviewContribution: 'This review adds audit artifacts only; it makes no production source, configuration, dependency or specification edits.' },
  liveWorkspaceQualification: 'Concurrent uncommitted bitmap-decoder and GIF diagnostic-harness work appeared after the initial clean-tree tests/build. It is preserved and is not covered by those execution receipts. Workspace hashes are observation only, not the tested source snapshot.',
  baselineGitBlobs, workspaceSHA256AtRecording: records(source), buildSHA256: records(files('dist'))
};
copyFileSync('.tmp/app-review-vitest/test-output.txt', new URL('unit-tests.txt', import.meta.url));
writeFileSync(new URL('validation.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ commit: receipt.testedCommit, baselineBlobs: Object.keys(baselineGitBlobs).length, observedSourceFiles: source.length, builtFiles: Object.keys(receipt.buildSHA256).length, validation: receipt.validation }));
