// Independent admitted-size cost check. Logical masks/PNG rows only; not heap/GPU profiling.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { pngBytes } from '../../../src/lib/save.js';
const referenceCommit = '8a84b6c', sourceBase = new URL('../../../src/lib/save.js', import.meta.url);
const reference = execFileSync('git', ['show', referenceCommit + ':src/lib/save.js'], { encoding: 'utf8' })
  .replace(/from '([^']+)'/g, (_, path) => `from '${path === 'fflate' ? import.meta.resolve('fflate') : new URL(path, sourceBase).href}'`);
const old = await import('data:text/javascript;base64,' + Buffer.from(reference).toString('base64'));
const median = values => [...values].sort((a, b) => a - b)[values.length >> 1];
const results = [];
function withoutSrgb(bytes) {
  const parts = [bytes.subarray(0, 8)];
  for (let p = 8; p < bytes.length;) {
    const n = new DataView(bytes.buffer, bytes.byteOffset + p).getUint32(0);
    if (String.fromCharCode(...bytes.subarray(p + 4, p + 8)) !== 'sRGB') parts.push(bytes.subarray(p, p + n + 12));
    p += n + 12;
  }
  return Buffer.concat(parts);
}
for (const w of [512, 2048, 4096]) for (const pattern of ['flat-one-state', 'random-two-states', 'three-states']) {
  const mask = new Uint8Array(w * w); let seed = 0xfedcba98;
  for (let p = 0; p < mask.length; p++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    mask[p] = pattern === 'flat-one-state' ? 1 : pattern === 'three-states' ? p % 3 : 1 + (seed >>> 31);
  }
  const image = { w, h: w, mask, first: '#e1a583', second: '#004477' }, times = { before: [], after: [] }, cpuTimes = { before: [], after: [] }, bytes = {};
  for (let pass = 0; pass < 4; pass++) for (const phase of pass % 2 ? ['after', 'before'] : ['before', 'after']) {
    const cpuStart = process.cpuUsage(), start = performance.now(), output = (phase === 'before' ? old.pngBytes : pngBytes)(image);
    const elapsed = performance.now() - start, cpu = process.cpuUsage(cpuStart);
    if (pass) { times[phase].push(elapsed); cpuTimes[phase].push((cpu.user + cpu.system) / 1000); }
    bytes[phase] = output.length;
  }
  const beforeMs = median(times.before), afterMs = median(times.after);
  if (w > 512) {
    const before = old.pngBytes(image), after = pngBytes(image);
    assert.equal(after[24], 2); assert.equal(after.length, before.length + 13);
    assert.deepEqual(withoutSrgb(after), Buffer.from(before), 'large PNG byte-identical except its new sRGB chunk');
  }
  results.push({ w, h: w, pixels: w * w, pattern, bytes, beforeMs, afterMs, ratio: afterMs / beforeMs, samplesMs: times,
    cpuBeforeMs: median(cpuTimes.before), cpuAfterMs: median(cpuTimes.after), cpuSamplesMs: cpuTimes });
}
const receipt = { node: process.version, referenceCommit, sourceSha256: createHash('sha256').update(readFileSync(sourceBase)).digest('hex'), compressor: 'same installed fflate zlibSync level3',
  scope: 'Independent synchronous PNG-only timings. No conversion, browser latency or whole-process memory claim. Three timed passes after one warm-up; alternating order. Wall and process-CPU samples retained to expose OS/GC contention; not a latency ceiling.', results };
writeFileSync(new URL('./peer-cost-results.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
