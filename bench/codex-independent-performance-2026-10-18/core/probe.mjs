// Fresh deterministic correctness probes. Run from the repository root with Node.
// These are exactness/lifecycle checks, not browser-performance measurements.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import * as current from '../../../src/lib/recolor.js';
import { quantize, quantizeAsync, preparePalette } from '../../../src/lib/quantize.js';
import { sourceColorSummary, summaryHistogram } from '../../../src/lib/source-color-summary.js';
import { selectPaletteSubset } from '../../../src/lib/palette-limit.js';
import { generatePaletteAsync } from '../../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../../src/lib/palette-generated-sources.js';
import { reanalyzeItem, reanalyzeItems } from '../../../src/lib/image-reanalysis.js';
import { prepareCleanupAsync } from '../../../src/lib/palette-cleanup.js';
import { applyCleanup, applyCleanupAsync } from '../../../src/lib/palette-cleanup-apply.js';
import { collectOriginalUsage } from '../../../src/lib/original-color-usage.js';
import { collectOneBitUsage } from '../../../src/lib/onebit-usage.js';
import { createAnimationCache } from '../../../src/lib/palette-animation-cache.js';
import { STYLES } from '../../../src/lib/presets.js';

const directory = new URL('.', import.meta.url);
const counts = {};
const count = name => { counts[name] = (counts[name] ?? 0) + 1; };
let seed = 0x9d71351;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const colors = Array.from({length:32}, () => '#' + (random() & 0xffffff).toString(16).padStart(6,'0'));
function image(w,h,unique=24,partial=false) {
  const data=new Uint8ClampedArray(w*h*4), table=Array.from({length:unique},()=>random()&0xffffff);
  for(let p=0;p<w*h;p++) { const rgb=table[random()%unique]; data[p*4]=rgb>>>16;data[p*4+1]=rgb>>>8&255;data[p*4+2]=rgb&255;data[p*4+3]=partial ? [0,1,127,128,254,255][random()%6] : random()%7 ? 255:0; }
  return {width:w,height:h,data};
}
function oracleOtsu(hist,fallback) {
  let total=0,sum=0,best=0,result=fallback;
  hist.forEach((n,i)=>{ total+=n;sum+=i*n; });
  for(let t=0;t<256;t++) {
    let n=0,s=0;for(let i=0;i<=t;i++){n+=hist[i];s+=i*hist[i];}
    if(!n||n===total)continue;
    const score=n*(total-n)*(s/n-(sum-s)/(total-n))**2;
    if(score>best){best=score;result=t;}
  }
  return result;
}
function scalarAnalyze(source,brightness,cut) {
  const {width:w,height:h,data}=source,N=w*h;
  const lum=new Uint8Array(N),right=new Uint8Array(N),down=new Uint8Array(N),hist=new Uint32Array(256),edges=new Uint32Array(256);
  let soft=false,hasAlpha=false,lo=255,hi=0;
  for(let p=0;p<N;p++) {
    const i=p*4,a=data[i+3];soft ||= a>0&&a<255; hasAlpha ||= a<cut;
    if(a<cut)continue;
    const v=brightness==='value'?Math.max(data[i],data[i+1],data[i+2]):brightness==='red'?data[i]:brightness==='green'?data[i+1]:brightness==='blue'?data[i+2]:Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
    lum[p]=v;hist[v]++;lo=Math.min(lo,v);hi=Math.max(hi,v);
  }
  const difference=(p,q)=>Math.max(...[0,1,2].map(c=>Math.abs(data[p*4+c]-data[q*4+c])));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const p=y*w+x;if(data[p*4+3]<cut)continue;
    if(x+1<w&&data[(p+1)*4+3]>=cut){right[p]=difference(p,p+1);edges[right[p]]++;}
    if(y+1<h&&data[(p+w)*4+3]>=cut){down[p]=difference(p,p+w);edges[down[p]]++;}
  }
  edges[0]=0;
  const auto=oracleOtsu(hist,127),seams=new Uint32Array(256);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const p=y*w+x;
    if(x+1<w&&(lum[p]>auto)===(lum[p+1]>auto))seams[right[p]]++;
    if(y+1<h&&(lum[p]>auto)===(lum[p+w]>auto))seams[down[p]]++;
  }
  seams[0]=0;
  let aN=0,aS=0,bN=0,bS=0;
  for(let i=0;i<256;i++)if(i<=auto){aN+=hist[i];aS+=i*hist[i];}else{bN+=hist[i];bS+=i*hist[i];}
  return {w,h,data,lum,right,down,cut,soft,hasAlpha,lo,hi,hist,edges,auto,autoLine:Math.max(24,oracleOtsu(edges,0)),autoTone:aN&&bN?Math.round((aS/aN+bS/bN)/2):auto,autoSeam:Math.max(24,oracleOtsu(seams,0))};
}
// Deliberately simple independent nearest reference: no job machinery, exact/memo
// maps, sampling tables or production conversion helpers. Matrices from Oklab's
// original publication, consulted independently in api-research.md.
function scalarNearest(original,palette,metric,alphaMode,cut) {
  const linear=n=>n/255<=.04045?n/255/12.92:((n/255+.055)/1.055)**2.4;
  const lab=rgb=>{const[r,g,b]=rgb.map(linear),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.7936177850*m-.0040720468*s,1.9779984951*l-2.4285922050*m+.4505937099*s,.0259040371*l+.7827717662*m-.8086757660*s];};
  const rgb=palette.map(hex=>{const n=parseInt(hex.slice(1),16);return[n>>>16,n>>>8&255,n&255];}),coordinates=metric==='rgb'?rgb:rgb.map(lab),indices=new Uint16Array(original.width*original.height),used=new Uint8Array(256),alpha=alphaMode==='keep'?new Uint8Array(indices.length):undefined;let hasTransparency=false;
  for(let p=0;p<indices.length;p++){const at=p*4,a=original.data[at+3];if(a<(alphaMode==='keep'?1:cut)){indices[p]=256;hasTransparency=true;continue;}if(alpha)alpha[p]=a;const own=[original.data[at],original.data[at+1],original.data[at+2]],v=metric==='rgb'?own:lab(own);let best=Infinity,chosen=0;for(let c=0;c<rgb.length;c++){const d=(v[0]-coordinates[c][0])**2+(v[1]-coordinates[c][1])**2+(v[2]-coordinates[c][2])**2;if(d<best){best=d;chosen=c;}}indices[p]=chosen;used[chosen]=1;}
  return {indices,w:original.width,h:original.height,used,hasTransparency,...(alpha?{alpha}:{})};
}
const oldSource=execFileSync('git',['show','4c1a975^:src/lib/recolor.js'],{encoding:'utf8'}).replaceAll("'./icon.js'","'../../../src/lib/icon.js'").replaceAll("'./quantize.js'","'../../../src/lib/quantize.js'");
await writeFile(new URL('historical-pre-b1.mjs',directory),oldSource);
const historical=await import('./historical-pre-b1.mjs');
const sourceHashes={};
for(const name of ['recolor','source-color-summary','palette-limit','palette-generated','image-reanalysis','quantize'])sourceHashes[name]=createHash('sha256').update(await readFile(new URL(`../../../src/lib/${name}.js`,import.meta.url))).digest('hex');

for(let i=0;i<36;i++) {
  const original=image(1+random()%38,1+random()%35,1+random()%45,i%2===0);
  for(const source of ['luma','red','green','blue','value','unknown'])for(const cut of [1,127,128,255]) {
    const actual=current.analyze(original,source,cut),expected=scalarAnalyze(original,source,cut);
    assert.deepEqual(actual,expected);count('scalarAnalysis');
    assert.deepEqual(await current.analyzeAsync(original,source,cut),expected);count('asyncAnalysis');
    assert.deepEqual(historical.analyze(original,source,cut),actual);count('preB1Analysis');
  }
  for(const [style] of STYLES)for(const set of [null,{threshold:100,cuts:40,detail:75,border:'keep',thickness:3,darks:50,matrix:8,diffusion:'stucki',spacing:5,direction:'\\',scale:3,shading:75}]) {
    const before=historical.analyze(original),after=current.analyze(original);
    assert.deepEqual(current.mask(after,style,set),historical.mask(before,style,set));count('preB1Mask');
    const mw=Math.max(1,Math.floor(original.width*.6)),mh=Math.max(1,Math.floor(original.height*.6));
    const small=current.mask(after,style,set,mw,mh);
    assert.equal(small.length,mw*mh);assert.ok(small.every(v=>v<=2));count('sampleMask');
  }
}
// Frame/row boundary and cancellation coverage for B5, including very wide rows.
for(const [w,h] of [[1,20000],[8191,2],[8192,2],[8193,2],[262145,1],[257,97]])for(const source of ['luma','value','red']) {
  const original=image(w,h,32,true);
  assert.deepEqual(await current.analyzeAsync(original,source,128),current.analyze(original,source,128));count('bandBoundary');
}
for(let i=0;i<8;i++) {
  const originals=Array.from({length:3},()=>image(29,27,24,true));
  const sync=originals.map(o=>current.analyze(o,'value',127)),asyncFrames=await Promise.all(originals.map(o=>current.analyzeAsync(o,'value',127)));
  current.unify(sync);await current.unifyAsync(asyncFrames);assert.deepEqual(asyncFrames,sync);count('unify');
}
const cancelSource=image(1024,1024,32,true),item={id:'cancel',original:cancelSource,img:current.analyze(cancelSource),by:'luma 128'};
const controller=new AbortController(),pending=reanalyzeItem(item,{source:'red'},{signal:controller.signal});controller.abort();
await assert.rejects(pending,{name:'AbortError'});assert.equal(item.by,'luma 128');count('reanalysisCancel');
assert.equal(await reanalyzeItem(item),item);count('matchingAnalysisIdentity');
const changed=await reanalyzeItems([item],{source:'green'});assert.notEqual(changed[0].img,item.img);assert.equal(changed[0].original,item.original);count('reanalysisOwnership');

// Nearest/dither scalar-vs-cooperative and source-coordinate/alpha invariants.
const prepared=preparePalette(colors);
for(let i=0;i<12;i++) {
  const original=image(17+random()%16,17+random()%16,32,true);
  for(const metric of ['rgb','oklab'])for(const alphaMode of ['cut','keep'])for(const dither of ['none','2x2','4x4','8x8'])for(const ditherStrength of [0,50,100]) {
    const options={metric,alphaMode,dither,ditherStrength};
    const actual=quantize(original,prepared,128,undefined,undefined,options);
    if(dither==='none'||ditherStrength===0){assert.deepEqual(actual,scalarNearest(original,colors,metric,alphaMode,128));count('scalarNearest');}
    assert.deepEqual(await quantizeAsync(original,prepared,128,undefined,undefined,{...options,chunkPixels:128}),actual);count('quantizeAsync');
    const mw=Math.floor(original.width*.65),mh=Math.floor(original.height*.65),small=quantize(original,prepared,128,mw,mh,options);
    for(let y=0;y<mh;y++)for(let x=0;x<mw;x++) {const p=Math.floor((y+.5)*original.height/mh)*original.width+Math.floor((x+.5)*original.width/mw),q=y*mw+x;assert.equal(small.indices[q],actual.indices[p]);if(alphaMode==='keep')assert.equal(small.alpha[q],actual.alpha[p]);}count('sourceCoordinateSample');
  }
}
const exactColors=Array.from({length:256},(_,i)=>'#'+(i*65536+((i*73)&255)*256+((i*151)&255)).toString(16).padStart(6,'0'));
const exactSource={width:257,height:1,data:new Uint8ClampedArray(257*4)};exactColors.forEach((hex,i)=>{const n=parseInt(hex.slice(1),16);exactSource.data.set([n>>>16,n>>>8&255,n&255,[1,127,128,254,255][i%5]],i*4);});
for(const metric of['rgb','oklab'])for(const alphaMode of['cut','keep'])for(const dither of['none','2x2','4x4','8x8']){const result=quantize(exactSource,exactColors,128,undefined,undefined,{metric,alphaMode,dither,ditherStrength:100});for(let p=0;p<257;p++){const a=exactSource.data[p*4+3];assert.equal(result.indices[p],a<(alphaMode==='keep'?1:128)?256:p);if(alphaMode==='keep')assert.equal(result.alpha[p],a);}count('exact256AlphaDither');}
// Summary histogram compares outputs, selected colors and Auto, excluding unused float diagnostics.
const readers=frames=>async function*(){for(const f of frames)yield {data:f.original.data,weight:f.weight};};
for(let i=0;i<26;i++) {
  const frames=Array.from({length:1+i%4},()=>({original:image(19,17,1+random()%100,false),weight:[10,30,70][random()%3]}));
  assert.equal(summaryHistogram(frames),null);count('summaryColdFallback');
  await Promise.all(frames.map(f=>sourceColorSummary(f.original)));
  const histogram=summaryHistogram(frames);assert.ok(histogram);count('summaryEligible');
  for(const metric of ['rgb','oklab'])for(const cap of [2,4,8]) {
    const raw=await selectPaletteSubset(colors,cap,readers(frames),{metric}),summarized=await selectPaletteSubset(colors,cap,()=> (async function*(){yield histogram;})(),{metric});
    assert.deepEqual(summarized.indices,raw.indices);count('summarySubset');
    const p=preparePalette(raw.indices.map(i=>colors[i])),q=preparePalette(summarized.indices.map(i=>colors[i]));
    for(const f of frames){assert.deepEqual(quantize(f.original,p,128,undefined,undefined,{metric}),quantize(f.original,q,128,undefined,undefined,{metric}));count('summaryOutput');}
  }
  const snapshots=captureGeneratedSources([{frames:frames.map(f=>({original:f.original,delay:f.weight}))}]);
  const raw=await generatePaletteAsync(snapshots),summarized=await generatePaletteAsync(snapshots,{histograms:[histogram]});
  assert.deepEqual(summarized.colors,raw.colors);assert.equal(summarized.binned,raw.binned);count('summaryAuto');
}
function uniqueSource(n,start=0){const data=new Uint8ClampedArray(n*4);for(let i=0;i<n;i++){const v=i+start;data.set([v>>>16,v>>>8&255,v&255,255],i*4);}return {width:n,height:1,data};}
const accepted=uniqueSource(4096),overflow=uniqueSource(4097),partial=image(17,17,20,true);
assert.equal((await sourceColorSummary(accepted)).rgb.length,4096);assert.equal(await sourceColorSummary(overflow),null);await sourceColorSummary(partial);
assert.equal(summaryHistogram([{original:overflow,weight:1}]),null);assert.equal(summaryHistogram([{original:partial,weight:1}]),null);
assert.equal(summaryHistogram([{original:accepted,weight:1.5}]),null);assert.equal(summaryHistogram([{original:accepted,weight:2**52}]),null);
assert.ok(summaryHistogram(Array.from({length:16},()=>({original:accepted,weight:1}))));assert.equal(summaryHistogram(Array.from({length:17},()=>({original:accepted,weight:1}))),null);count('summaryBoundaries');

// Exact count scalar oracle, Cleanup alpha/membership and application parity.
for(let i=0;i<20;i++) {
  const original=image(31,29,24,true),expected=new Set();for(let p=0;p<original.data.length;p+=4)if(original.data[p+3])expected.add(original.data[p]<<16|original.data[p+1]<<8|original.data[p+2]);
  assert.equal((await collectOriginalUsage({original})).count,expected.size);count('originalUsage');
  for(const metric of ['rgb','oklab']) {
    const cleanup=await prepareCleanupAsync([original],prepared,1,metric),base=quantize(original,prepared,1,undefined,undefined,{metric,alphaMode:'keep'}),copy={...base,indices:base.indices.slice(),used:base.used.slice(),alpha:base.alpha.slice()};
    assert.deepEqual(await applyCleanupAsync(copy,cleanup),applyCleanup(base,cleanup));assert.deepEqual(copy.alpha,base.alpha);count('cleanupApplication');
  }
  const img=current.analyze(original),oneItem={original,img,by:'luma 128'};
  for(const [style] of STYLES)for(const [first,second]of [[null,'#ffffff'],['#000000',null],['#000000','#000000'],['#000000','#ffffff']]) {
    const converted=current.colorize(current.mask(img,style),first,second),set=new Set();for(let p=0;p<converted.length;p+=4)if(converted[p+3])set.add(converted[p]<<16|converted[p+1]<<8|converted[p+2]);
    const usage=await collectOneBitUsage(oneItem,{style,first,second,set:{}});assert.equal(usage.count,set.size);count('onebitUsage');
  }
}
const cache=createAnimationCache(1024),source=image(4,4),request={sources:[source,source],palette:prepared,alphaCut:128,metric:'oklab',width:4,height:4};
assert.equal(cache.acquire({...request,width:20,height:20}),null);const a=cache.acquire(request),b=cache.acquire(request);assert.equal(cache.stats().clips,1);
let produced=0;const produce=async()=>{produced++;return quantize(source,prepared);};await Promise.all([a.getFrame(0,produce),b.getFrame(0,produce)]);assert.equal(produced,1);a.release();assert.equal(cache.stats().clips,1);b.release();assert.deepEqual(cache.stats(),{bytes:0,clips:0});count('animationCacheLifecycle');

const receipt={created:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,seed:'0x9d71351',sourceHashes,counts,assertions:'All comparisons passed; counts are scenarios, each can include many field/pixel assertions.',limitations:['Node correctness only; no browser timing or native device inference.','Historical pre-B1 module retains current unchanged Icon dependency.','Dither and Cleanup invariants supplement unit tests; their scalar/async parity alone is not an independent aesthetic oracle.']};
await writeFile(new URL('probe-results.json',directory),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
