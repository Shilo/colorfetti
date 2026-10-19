// Independently challenge the review's initial GIF-liveness checksum.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { GifReader } from 'omggif';

const gif = new GifReader(await readFile(new URL('../fixtures/animated-wide-192x64.gif', import.meta.url)));
const frames = [];
for (let frame = 0; frame < gif.numFrames(); frame++) {
  const pixels = new Uint8Array(gif.width * gif.height * 4);
  gif.decodeAndBlitFrameRGBA(frame, pixels);
  let rolling = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    rolling = (Math.imul(rolling, 31) + pixels[i] * 31 + pixels[i + 1] * 7 + pixels[i + 2]) | 0;
  }
  frames.push({ frame, rolling, sha256: createHash('sha256').update(pixels).digest('hex') });
}
assert.equal(new Set(frames.map(frame => frame.rolling)).size, 1);
assert.equal(new Set(frames.map(frame => frame.sha256)).size, gif.numFrames());
const result = { conclusion: 'The review checksum collides for distinct source frames; its constant value cannot prove frozen playback.', frames };
await writeFile(new URL('./hash-challenge.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
