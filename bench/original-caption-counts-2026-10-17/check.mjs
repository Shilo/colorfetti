import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { collectOriginalUsage, peekOriginalUsage } from '../../src/lib/original-color-usage.js';

function image(width, height, colors, seed = 0) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const rgb = (p + seed) % colors;
    data[p*4] = rgb >>> 16; data[p*4+1] = rgb >>> 8 & 255; data[p*4+2] = rgb & 255;
    data[p*4+3] = p % 17 === 0 ? 0 : p % 11 === 0 ? 1 : 255;
  }
  return { width, height, data };
}
function oracle(item) {
  const used = new Set();
  for (const frame of item.frames ?? [item]) for (let p = 0; p < frame.original.data.length; p += 4) {
    const d = frame.original.data;
    if (d[p+3]) used.add(d[p]*65536 + d[p+1]*256 + d[p+2]);
  }
  return used.size;
}
const cases = [
  ['2048-square-8-colors', { original: image(2048,2048,8) }],
  ['2048-square-high-entropy', { original: image(2048,2048,1<<24) }],
  ['128-square-32-frames', { frames: Array.from({length:32}, (_,f)=>({original:image(128,128,32,f)})) }],
  ['256-square-48-frames', { frames: Array.from({length:48}, (_,f)=>({original:image(256,256,64,f)})) }],
];
const results = [];
for (const [name,item] of cases) {
  let last = performance.now(), maxTimerGapMs = 0, ticks = 0;
  const timer = setInterval(()=>{const now=performance.now();maxTimerGapMs=Math.max(maxTimerGapMs,now-last);last=now;ticks++;},1);
  const start = performance.now(), result = await collectOriginalUsage(item), coldMs = performance.now()-start;
  clearInterval(timer);
  assert.equal(result.count, oracle(item));
  const warmStart = performance.now();
  for (let i=0;i<1000;i++) { assert.equal(peekOriginalUsage(item),result); assert.equal(await collectOriginalUsage(item),result); }
  results.push({name,count:result.count,frames:result.frames,coldMs,warm1000PeekAndCollectMs:performance.now()-warmStart,maxTimerGapMs,ticks});
}
await writeFile(new URL('./result.json',import.meta.url), JSON.stringify({runtime:process.version,scope:'Node helper only; integrated device/browser timing belongs to parent validation',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
