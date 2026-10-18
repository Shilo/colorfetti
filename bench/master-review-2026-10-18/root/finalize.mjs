// Check retained provenance and the final Markdown without changing product files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const dir = import.meta.dirname;
const receipt = JSON.parse(fs.readFileSync(`${dir}/validation.json`, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [file, expected] of Object.entries(receipt.sourceSHA256)) assert.equal(hash(file), expected, file);
for (const [file, expected] of Object.entries(receipt.buildSHA256)) assert.equal(hash(path.join(receipt.validation.buildDirectory, file)), expected, file);
const inputs = {
  'conversion-review.md': 'docs/research/2026-10-18-conversion-and-ux-review.md',
  'codex-review.md': 'docs/research/2026-10-18-codex-conversion-and-ux-review.md'
};
const reviewInputs = [];
for (const [frozen, current] of Object.entries(inputs)) {
  assert.equal(hash(`${dir}/inputs/${frozen}`), receipt.reviewInputs[frozen], frozen);
  let expectedText = fs.readFileSync(`${dir}/inputs/${frozen}`, 'utf8').replaceAll('\r\n', '\n');
  const currentText = fs.readFileSync(current, 'utf8').replaceAll('\r\n', '\n');
  if (frozen === 'conversion-review.md') {
    // Concurrent docs commit 437e525 published formerly local contact sheets.
    // Permit precisely its link changes, never an unexamined change in claims.
    expectedText = expectedText.replace(' Contact-sheet PNGs there are\nlocal only, because bench/.gitignore excludes PNGs.', '');
    expectedText = expectedText.replace(/`(sheet-[^`]+\.png)` \(local contact sheet\)/g, '[$1](../../bench/conversion-review-2026-10-18/$1)');
  }
  assert.equal(currentText, expectedText, 'Unreviewed input content drift: ' + current);
  reviewInputs.push({ file: current, frozenSHA256: receipt.reviewInputs[frozen], currentSHA256: hash(current), claimsUnchanged: true, note: frozen === 'conversion-review.md' ? 'Only examined contact-sheet publication/link changes since frozen input.' : 'Text unchanged.' });
}
const runtimeDiff = execFileSync('git', ['diff', '--name-only', receipt.testedRuntimeCommit, '--', 'src', 'build', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js'], { encoding: 'utf8' }).trim();
assert.equal(runtimeDiff, '', 'Runtime drift since tested commit');
const master = 'docs/research/2026-10-18-master-conversion-and-ux-review.md';
const markdown = fs.readFileSync(master, 'utf8');
assert.ok(markdown.endsWith('\n'));
assert.ok(!/[\t ]+$/m.test(markdown), 'Trailing whitespace');
for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
  if (!/^https?:/.test(match[1])) assert.ok(fs.existsSync(path.resolve(path.dirname(master), match[1])), match[1]);
}
const evidence = [
  'root/validation.json', 'root/unit-tests.txt', 'root/build.txt',
  'root/io-stencil-probe.mjs', 'root/io-stencil-results.json',
  'root/crop-probe.mjs', 'root/crop-results.json',
  'root/recheck-export-probe.mjs', 'root/results.json',
  'root/png-compressor-probe.mjs', 'root/png-compressor-results.json',
  'root/recheck-crosscheck.mjs', 'root/crosscheck.json',
  'root/filename-portability.ps1', 'root/filename-portability.json',
  'independent/kernel-challenge.mjs', 'independent/kernel-results.json',
  'independent/ui-receipt.json', 'independent/CHALLENGE.md'
];
for (const file of evidence) assert.ok(fs.existsSync(path.join(dir, '..', file)), file);
const tests = fs.readFileSync(`${dir}/unit-tests.txt`, 'utf8');
assert.match(tests, /1186 passed \| 2 skipped/);
assert.match(fs.readFileSync(`${dir}/build.txt`, 'utf8'), /built in/);
const result = {
  checkedAtUTC: new Date().toISOString(),
  testedRuntimeCommit: receipt.testedRuntimeCommit,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceHashesVerified: Object.keys(receipt.sourceSHA256).length,
  buildHashesVerified: Object.keys(receipt.buildSHA256).length,
  reviewInputs,
  runtimeDiff,
  master,
  masterSHA256: hash(master),
  evidencePathsVerified: evidence.length,
  markdownLinksAndWhitespace: 'passed',
  validationReceipts: { tests: '1186 passed, 2 skipped', build: 'passed' }
};
fs.writeFileSync(`${dir}/final-verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
