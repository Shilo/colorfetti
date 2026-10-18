// Independent arithmetic/consistency check of retained fresh raw receipts only.
// No device, browser, application module, build or profiler is invoked.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('../io-android/',import.meta.url), inputs=[];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function read(file){const bytes=await readFile(new URL(file,base));inputs.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});return JSON.parse(bytes);}
function matched(off,on,key){assert.equal(off.length,5);assert.equal(on.length,5);const a=off.map(r=>r[key]),b=on.map(r=>r[key]);assert.ok([...a,...b].every(Number.isFinite));const d=b.map((v,i)=>v-a[i]);return {beforeMedian:median(a),afterMedian:median(b),pairedDeltaMedian:median(d),afterFasterPairs:d.filter(x=>x<0).length,pairs:5,pairedDeltas:d};}
const rows=[];
for(const [label,file,target,metrics] of [
 ['B1','ab-analysis/pairs-1792318872277.json','TARGET sheet2048 Brightness R-G-Value',['cpuMs','toFinalPaintMs']],
 ['B3','ab-caption/pairs-checker-1792319091596.json','A1 TARGET Threshold drag window (checker)',['cpuMs','releaseToCaptionMs']],
 ['B4-cap','ab-summary/pairs-1792319041866.json','TARGET sheet2048 Max colors 2-4-8 total',['cpuMs','elapsedMs']],
 ['B4-cold-Auto','ab-summary/pairs-1792319041866.json','ADVERSE Auto 8 sprites+effect import',['cpuMs','exactCaptionMs']],
 ['B4-cold-Auto-repeat','ab-auto-repeat/pairs-1792319319448.json','Auto-only repeat source-cold',['cpuMs','exactCaptionMs']],
 ['B5','ab-bands/pairs-1792318984854.json','TARGET sheet2048 Brightness R-G-Value',['cpuMs','toFinalPaintMs','maxLongTaskMs']],
]){const j=await read(file);assert.deepEqual(j.errors,[]);const sides=['off','on'].map(v=>j.trials.filter(t=>t.variant===v).sort((a,b)=>a.pair-b.pair).map(t=>t.rows.find(r=>r.name===target)));assert.ok(sides.flat().every(Boolean));rows.push({label,file,urls:j.urls,metrics:Object.fromEntries(metrics.map(k=>[k,matched(...sides,k)]))});}
const pngFiles=['ab-compression/results-all-codexio-png-1792318598095.json','ab-compression-action/results-tiny-codexio-png-1792319332483.json','ab-compression-action/results-sheet1024-codexio-png-1792319354309.json','ab-compression-action/results-partialKeep64-codexio-png-1792319379354.json'];
const png=[];let retainedEncodes=0;
for(const file of pngFiles){const j=await read(file);retainedEncodes+=j.rows.length;for(const id of new Set(j.rows.map(r=>r.id)))for(const warmup of [true,false]){const sides=['baseline','candidate'].map(v=>j.rows.filter(r=>r.id===id&&r.variant===v&&r.warmup===warmup).sort((a,b)=>a.pair-b.pair));if(!sides.every(r=>r.length===5))continue;for(let i=0;i<5;i++)assert.equal(sides[0][i].outputHash,sides[1][i].outputHash);const metrics=['cpuMs','elapsedMs','actionToAnchorMs'].filter(k=>sides.flat().every(r=>Number.isFinite(r[k])));png.push({file,id,phase:warmup?'first':'repeat',exactBytePairs:5,metrics:Object.fromEntries(metrics.map(k=>[k,matched(...sides,k)]))});}}
assert.equal(retainedEncodes,200);
const out={baseline:'5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce',reviewed:new Date().toISOString(),inputs,rows,png,retainedEncodes,qualification:'Recomputed from explicit raw files. Renderer CPU only; no worker CPU. Pair deltas are not differences of marginal medians. PNG hash equality cross-checks transport/differential correctness, not a separate encoder oracle. Raw interrupted-series error remains retained and qualified in IO README.'};
await writeFile(new URL('five-change-recomputed.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({targetRows:rows.length,matchedPngPhases:png.length,retainedEncodes,allArithmeticAssertions:true}));
