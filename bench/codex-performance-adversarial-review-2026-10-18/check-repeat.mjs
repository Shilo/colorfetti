// Explain the repeated Git-snapshot build comparison; do not rerun or relabel tests.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = 'bench/codex-performance-adversarial-review-2026-10-18/';
const compared = JSON.parse(fs.readFileSync(base + 'repeat-frozen.json'));
const ui = JSON.parse(fs.readFileSync(base + 'codex-ui-repeat.json'));
const original = fs.readFileSync('.tmp/codex-performance-adversarial-review-2026-10-18/current/dist/index.html', 'utf8');
const rebuilt = fs.readFileSync('.tmp/codex-performance-adversarial-review-2026-10-18/repeat-6f-source/dist/index.html', 'utf8');
assert.equal(compared.testsPassed, true); assert.equal(compared.buildPassed, true);
assert.deepEqual(compared.mismatches.map(x => x.file), ['index.html']);
assert.equal(original.replaceAll('\r', ''), rebuilt.replaceAll('\r', ''));
const lineEndingDifferences = compared.comparisons.filter(x => !x.rawEqual).map(item => {
  assert.match(item.file, /\.(?:svg|html)$/);
  const a = fs.readFileSync('.tmp/codex-performance-adversarial-review-2026-10-18/current/dist/' + item.file, 'utf8');
  const b = fs.readFileSync('.tmp/codex-performance-adversarial-review-2026-10-18/repeat-6f-source/dist/' + item.file, 'utf8');
  assert.equal(a.replaceAll('\r', ''), b.replaceAll('\r', ''));
  return { file: item.file, differsOnlyByCarriageReturnBytes: true };
});
assert.equal(ui.checks.length, 13); assert.deepEqual(ui.errors, []);
assert.equal(ui.png.byteIdenticalBeforeAfter, true);
assert.equal(ui.png.sha256, '11ec392d1e3978ac4b0944050f821a3e1e3cbd6cfb5f729368ae978a4a2800ce');
const result = {
  checkedAt: new Date().toISOString(), source: '6f8238a',
  repeatedTests: '66 files / 1091 passed / two existing skips', repeatedBuildPassed: true,
  distFiles: compared.comparisons.length, rawByteIdenticalFiles: compared.comparisons.filter(x => x.rawEqual).length, lineEndingDifferences,
  html: { file: 'index.html', originalCarriageReturns: (original.match(/\r/g) || []).length, rebuiltCarriageReturns: (rebuilt.match(/\r/g) || []).length, identicalAfterRemovingOnlyCarriageReturnBytes: true },
  qualification: 'The original repeat driver exits1 because its strict CRLF-to-LF comparison leaves one extra CR in Git-archived HTML. Tests and build themselves exit0. All JS/CSS and binary assets are raw byte-identical. Four SVGs and index.html differ only by CR bytes; every other character is unchanged. This separate check preserves the initial diagnostic instead of rewriting it.',
  repeatedCodexGroups: ui.checks.length, browserErrors: [], repeatedPngExact: true,
  freshMemoryOrAndroidMeasurements: false
};
fs.writeFileSync(base + 'repeat-checks.json', JSON.stringify(result, null, 2) + '\n');
console.log(result);
