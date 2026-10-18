import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { oneBitColors } from '../../src/lib/onebit-usage.js';
const frozen = execFileSync('git', ['show', '34a95d9:src/lib/recolor.js'], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' })
  .replaceAll("'./icon.js'", JSON.stringify(new URL('../../src/lib/icon.js', import.meta.url).href))
  .replaceAll("'./quantize.js'", JSON.stringify(new URL('../../src/lib/quantize.js', import.meta.url).href));
const { analyze, mask } = await import(`data:text/javascript;base64,${Buffer.from(frozen).toString('base64')}`);

// Independent safety challenge: full masks are the oracle, not the proposed
// metadata evaluator. A positive bounded witness can prove saturation, but an
// incomplete probe must never certify absence. This harness is research-only.
const w = 129, h = 97;
const sources = ['ramp', 'constant', 'transparent', 'late-speck', 'phase-speck', 'alpha-edge', 'correlated-alpha'].map(kind => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const x = p % w, y = Math.floor(p / w);
    let v = kind === 'ramp' ? (x * 31 + y * 19) & 255 : 127;
    let a = kind === 'transparent' || kind.endsWith('speck') ? 0 : 255;
    if (kind === 'late-speck' && p === w * h - 1) { a = 255; v = 255; }
    if (kind === 'phase-speck' && x === 63 && y === 37) { a = 255; v = 127; }
    if (kind === 'alpha-edge') a = [0, 1, 127, 128, 254, 255][p % 6];
    if (kind === 'correlated-alpha') { a = (x + y) % 2 ? 255 : 0; v = (x * 13 + y * 7) % 201; }
    data.set([v, v, v, a], p * 4);
  }
  return { kind, img: analyze({ width: w, height: h, data }) };
});
const choices = [];
for (const style of ['checker', 'bayer', 'hatch', 'noise']) {
  const variants = style === 'bayer' ? [2, 4, 8].map(matrix => ({ matrix }))
    : style === 'hatch' ? [3, 4, 5, 6].flatMap(spacing => ['/', '\\', '-', '|'].map(direction => ({ spacing, direction }))) : [{}];
  for (const extra of variants) for (const scale of [1, 2, 3, 4])
    for (const shading of [0, 1, 50, 100]) for (const threshold of [null, 1, 127, 254])
      choices.push({ style, set: { ...extra, scale, shading, threshold } });
}
let cases = 0, falseRescaledRoleCases = 0, boundedUnsaturated = 0, certified = 0;
const firstMismatch = [];
for (const { kind, img } of sources) for (const { style, set } of choices) {
  const full = mask(img, style, set), sampled = mask(img, style, set, 7, 5);
  let roles = 0, small = 0, observed = 0;
  for (const role of full) if (role) roles |= 1 << (role - 1);
  for (const role of sampled) if (role) small |= 1 << (role - 1);
  // The first 64 exact source positions are cheap witnesses, not absence proof.
  for (let p = 0; p < Math.min(full.length, 64); p++) if (full[p]) observed |= 1 << (full[p] - 1);
  if (small & ~roles) {
    falseRescaledRoleCases++;
    if (firstMismatch.length < 5) firstMismatch.push({ kind, style, set, roles, sampledRoles: small });
  }
  for (const [a, b] of [['#112233', '#aabbcc'], [null, '#aabbcc'], ['#112233', null], ['#112233', '#112233'], [null, null]]) {
    const possible = new Set([a, b].filter(Boolean)).size;
    const found = oneBitColors(observed, a, b).length;
    const exact = oneBitColors(roles, a, b).length;
    assert.ok(found <= exact, 'exact-coordinate witnesses cannot invent colors');
    if (found === possible) { assert.equal(found, exact); certified++; }
    else boundedUnsaturated++;
  }
  cases++;
}
assert.ok(falseRescaledRoleCases > 0, 'rescaled masks must exhibit an unsound role witness');
assert.ok(boundedUnsaturated > 0, 'incomplete probes must retain unknown cases');
const result = { oracle: 'Full source and rescaled masks from frozen baseline 34a95d9; not the rejected histogram proof', cases, inkCases: cases * 5, certified, boundedUnsaturated, falseRescaledRoleCases, firstMismatch };
await writeFile(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
