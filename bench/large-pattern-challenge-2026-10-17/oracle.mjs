import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as candidate from '../large-pattern-counts-2026-10-17/candidate-recolor.js';
import { collectOneBitUsage } from '../large-pattern-counts-2026-10-17/candidate-onebit-usage.js';
import { analysisKey } from '../../src/lib/image-reanalysis.js';
assert.equal(typeof candidate.patternRoleBounds, 'function', 'The retained research candidate must expose its proof; baseline alone must not silently pass proof checks.');
const receipt = { label: 'Rejected histogram proof candidate, explicit research modules; not production source', modules: [] };
for (const name of ['candidate-recolor.js', 'candidate-onebit-usage.js']) {
  const path = new URL('../large-pattern-counts-2026-10-17/' + name, import.meta.url);
  receipt.modules.push({ path: fileURLToPath(path), sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
}

// Frozen pre-change converter is loaded directly from its immutable Git object.
// Its dependency URLs are resolved without modifying the checkout or old source.
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const frozen = execFileSync('git', ['show', '34a95d9:src/lib/recolor.js'], { cwd, encoding: 'utf8' })
  .replaceAll("'./icon.js'", JSON.stringify(new URL('../../src/lib/icon.js', import.meta.url).href))
  .replaceAll("'./quantize.js'", JSON.stringify(new URL('../../src/lib/quantize.js', import.meta.url).href));
const baseline = await import(`data:text/javascript;base64,${Buffer.from(frozen).toString('base64')}`);
const sources = [];
for (const [w, h] of [[1, 1], [1, 19], [23, 1], [19, 17], [64, 47]]) {
  for (const kind of ['random', 'constant', 'empty', 'alpha-phase', 'binary']) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = Math.floor(p / w);
      const rgb = kind === 'constant' ? [127, 127, 127] : kind === 'binary' ? [p % 2 ? 255 : 0, p % 2 ? 255 : 0, p % 2 ? 255 : 0]
        : [p * 13 % 201, (p * 29 + 17) % 256, (p * 71 + 67) % 256];
      const a = kind === 'empty' ? 0 : kind === 'alpha-phase' ? ((x + y) % 2 ? 255 : 0) : [0, 1, 127, 128, 254, 255][p % 6];
      data.set([...rgb, a], p * 4);
    }
    sources.push({ kind, original: { width: w, height: h, data } });
  }
}
const choices = [];
for (const style of ['checker', 'bayer', 'hatch', 'noise', 'atkinson']) {
  const variants = style === 'bayer' ? [2, 4, 8].map(matrix => ({ matrix }))
    : style === 'hatch' ? [3, 4, 5, 6].flatMap(spacing => ['/', '\\', '-', '|'].map(direction => ({ spacing, direction })))
      : style === 'atkinson' ? ['atkinson', 'floyd', 'stucki'].map(diffusion => ({ diffusion })) : [{}];
  for (const extra of variants) for (const scale of [1, 4])
    for (const shading of [0, 1, 50, 100]) for (const threshold of [null, 1, 127, 254])
      choices.push({ style, set: { ...extra, scale, shading, threshold } });
}
let masks = 0, pixels = 0, proofs = 0, exactProofs = 0;
for (const source of ['luma', 'value', 'red', 'green', 'blue']) for (const cut of [1, 128, 255]) {
  for (const { original, kind } of sources) {
    const a = baseline.analyze(original, source, cut), b = candidate.analyze(original, source, cut);
    for (const { style, set } of choices) {
      const expected = baseline.mask(a, style, set);
      const actual = candidate.mask(b, style, set);
      assert.deepEqual(actual, expected, `${kind} ${source}/${cut} ${style} ${JSON.stringify(set)}`);
      if (candidate.patternRoleBounds) {
        const proof = candidate.patternRoleBounds(b, style, set);
        if (proof) {
          let roles = 0;
          for (const role of expected) if (role) roles |= 1 << (role - 1);
          assert.equal(proof.lower & ~roles, 0, 'lower bound cannot invent a role');
          assert.equal(roles & ~proof.upper, 0, 'upper bound cannot omit a role');
          if (proof.lower === proof.upper) { assert.equal(proof.lower, roles); exactProofs++; }
          proofs++;
        }
      }
      for (const [sw, sh] of [[Math.min(7, b.w), Math.min(5, b.h)]])
        assert.deepEqual(candidate.mask(b, style, set, sw, sh), baseline.mask(a, style, set, sw, sh));
      masks += 2; pixels += actual.length;
    }
  }
}

// A complete animation union is always checked against actual converted RGBA.
let unions = 0;
for (const source of ['luma', 'red']) for (const cut of [1, 128, 255]) {
  const originals = sources.filter(s => s.original.width === 19 && s.original.height === 17).slice(0, 4);
  const frames = originals.map(({ original }) => ({ original, img: candidate.analyze(original, source, cut) }));
  candidate.unify(frames.map(f => f.img));
  const item = { ...frames[0], frames, by: analysisKey(frames[0].img.soft, { source, alphaCut: cut }) };
  for (const { style, set } of choices.filter((_, i) => i % 13 === 0)) {
    const asked = { style, set: { ...set, source, alpha: cut } };
    for (const [first, second] of [['#112233', '#aabbcc'], [null, '#aabbcc'], ['#112233', null], ['#112233', '#112233'], [null, null]]) {
      const result = await collectOneBitUsage(item, { ...asked, first, second });
      const colors = new Set();
      for (const frame of frames) {
        const rgba = baseline.colorize(baseline.mask(frame.img, style, asked.set), first, second);
        for (let p = 0; p < rgba.length; p += 4) if (rgba[p + 3]) colors.add([...rgba.subarray(p, p + 3)].join(','));
      }
      if (result) assert.equal(result.count, colors.size, `GIF ${source}/${cut} ${style} ${JSON.stringify(asked.set)}`);
      unions++;
    }
  }
}
let largeInkCases = 0, largeUnknown = 0;
for (const kind of ['binary', 'constant', 'empty', 'alpha-phase']) {
  const w = 769, h = 513, data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const x = p % w, y = Math.floor(p / w);
    const v = kind === 'binary' ? (p % 2 ? 255 : 0) : kind === 'alpha-phase' ? (x * 13 + y * 7) % 201 : 127;
    const a = kind === 'empty' ? 0 : kind === 'alpha-phase' ? ((x + y) % 2 ? 255 : 0) : 255;
    data.set([v, v, v, a], p * 4);
  }
  const original = { width: w, height: h, data }, img = candidate.analyze(original);
  const item = { img, original, by: analysisKey(img.soft) };
  for (const style of ['checker', 'bayer', 'hatch', 'noise', 'atkinson']) {
    const set = { threshold: kind === 'alpha-phase' ? 254 : 127 };
    const value = baseline.mask(img, style, set);
    for (const [first, second] of [['#112233', '#aabbcc'], [null, '#aabbcc'], ['#112233', null], ['#112233', '#112233'], [null, null]]) {
      const lum = img.lum;
      Object.defineProperty(img, 'lum', { configurable: true, get() { throw new Error('metadata performed source luminance read'); } });
      const answer = await collectOneBitUsage(item, { style, set, first, second });
      Object.defineProperty(img, 'lum', { configurable: true, writable: true, value: lum });
      const rgba = baseline.colorize(value, first, second), unique = new Set();
      for (let p = 0; p < rgba.length; p += 4) if (rgba[p + 3]) unique.add([...rgba.subarray(p, p + 3)].join(','));
      if (answer) assert.equal(answer.count, unique.size, `large ${kind} ${style} ${first}/${second}`);
      else largeUnknown++;
      largeInkCases++;
    }
  }
}
const result = { baseline: '34a95d9', candidate: receipt, masks, fullSourcePixelsCompared: pixels, proofs, exactProofs, animationInkUnions: unions, largeInkCases, largeUnknown };
await writeFile(new URL('./oracle-result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
