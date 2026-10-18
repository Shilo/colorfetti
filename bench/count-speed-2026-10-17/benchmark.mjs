import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { collectPaletteUsage } from '../../src/lib/palette-usage.js';
import { fullPaletteImage } from '../../src/lib/palette-state.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { decode } from '../claude-audit-2026-10-15/device/audit-lib.mjs';

const snapshots = FULL_PRESETS.filter(p=>['preset-res64','preset-edg32'].includes(p.id)).map(p=>({family:'full-palette',colors:p.colors,metric:'oklab',alphaCut:128,maxColors:0}));
assert.equal(snapshots.length,2);
const cases = [];
for(const filename of ['kenney-sheet-2048.png','real-magic.gif','kenney-motion-128.gif','kenney-motion-256.gif']) {
  const decoded=await decode(await readFile(new URL(`../practical-workloads-2026-10-16/fixtures/${filename}`,import.meta.url)));
  const frames=decoded.frames.map((data,i)=>({original:{width:decoded.w,height:decoded.h,data},delay:decoded.delay?.[i]??100}));
  cases.push({name:filename,item:{original:frames[0].original,...(frames.length>1?{frames}:{})}});
}
const high={width:128,height:128,data:new Uint8ClampedArray(128*128*4)};
for(let p=0;p<128*128;p++){high.data[p*4]=p>>>8;high.data[p*4+1]=p&255;high.data[p*4+2]=p*71&255;high.data[p*4+3]=255;}
cases.push({name:'high-entropy-16384rgb',item:{original:high}});
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
const baseline=async(item,asked)=>{const full=await fullPaletteImage(item,asked),used=new Uint8Array(256);if(full.getFrame)for(let i=0;i<full.frameCount;i++){const frame=await full.getFrame(i);for(let j=0;j<full.colors.length;j++)used[j]|=frame.used[j];}else used.set(full.used);return [...used];};
const candidate=async(item,asked)=>{const usage=await collectPaletteUsage(item,asked);return Array.from({length:256},(_,i)=>usage.colors.includes(asked.colors[i])?1:0);};
const fresh=item=>{const original={...item.original};return {...item,original,...(item.frames?{frames:item.frames.map(f=>({...f,original:{...f.original}}))}:{})};};
const receipt=[];
for(const {name,item} of cases){
  const record={name,width:item.original.width,height:item.original.height,frames:item.frames?.length??1,results:[]};
  for(const asked of snapshots){
    // Warm the JS engine separately. A cold-source trial changes only immutable
    // wrapper identity, so it cannot accidentally hit the summary WeakMap.
    await baseline(item,asked);await candidate(fresh(item),asked);await candidate(item,asked);
    const old=[],next=[],cold=[];
    for(let trial=0;trial<5;trial++){
      let t=performance.now();const expected=await baseline(item,asked);old.push(performance.now()-t);
      t=performance.now();const actual=await candidate(item,asked);next.push(performance.now()-t);
      t=performance.now();const newSource=await candidate(fresh(item),asked);cold.push(performance.now()-t);
      assert.deepEqual(actual,expected);assert.deepEqual(newSource,expected);
    }
    record.results.push({palette:asked.colors.length,coldSourceMedianMs:median(cold),baselineMedianMs:median(old),warmSourceMedianMs:median(next)});
  }
  receipt.push(record);console.log(JSON.stringify(record));
}
await writeFile(new URL('node-results.json',import.meta.url),JSON.stringify({runtime:process.version,kind:'Node kernel only; no browser/rendering claim',receipt},null,2)+'\n');
