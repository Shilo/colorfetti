// Exactness + isolated whole-job probes. Run only after explicit CPU release.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as baseline from './row-cursor-baseline.mjs';
import * as candidate from './row-cursor-candidate.mjs';
import { palettePngBytesAsync } from '../../../src/lib/save.js';
const source=await readFile(new URL('probe.mjs',import.meta.url),'utf8'),start=source.indexOf('function scalarNearest('),end=source.indexOf('\nconst oldSource=',start);if(start<0||end<0)throw Error('Independent scalar oracle marker changed');const scalarNearest=new Function('return ('+source.slice(start,end)+')')();
const counts={};const add=name=>counts[name]=(counts[name]??0)+1;
let rng=0x7ac8135;const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;};
const colors=Array.from({length:64},()=> '#'+(rand()&0xffffff).toString(16).padStart(6,'0'));
function make(w,h,entropy=false){const data=new Uint8ClampedArray(w*h*4);for(let p=0;p<w*h;p++){const n=entropy?rand()&0xffffff:parseInt(colors[(rand()>>>4)%colors.length].slice(1),16);data[p*4]=n>>>16;data[p*4+1]=n>>>8&255;data[p*4+2]=n&255;data[p*4+3]=[0,1,127,128,254,255][rand()%6];}return {width:w,height:h,data};}
function compared(a,b){assert.deepEqual(b.result,a.result);assert.equal(b.hits,a.hits);assert.equal(b.misses,a.misses);assert.deepEqual(b.memo,a.memo);}
const originals=[[1,41],[2,37],[17,19],[31,29],[8191,3]].map(([w,h])=>make(w,h));originals.push(make(127,97,true));
const memoOverflow={width:4097,height:4,data:new Uint8ClampedArray(4097*4*4)};for(let p=0;p<4097*4;p++){const key=0x400000+(p>>>2);memoOverflow.data.set([key>>>16,key>>>8&255,key&255,255],p*4);}originals.push(memoOverflow);
for(const original of originals)for(const metric of['rgb','oklab'])for(const alphaMode of['cut','keep'])for(const cut of[1,128,255])for(const sample of[false,true]){
  const mw=sample?Math.max(1,Math.floor(original.width*.63)):original.width,mh=sample?Math.max(1,Math.floor(original.height*.61)):original.height;
  const a=baseline.rowCursorTestJob(original,baseline.preparePalette(colors),cut,mw,mh,metric,alphaMode),b=candidate.rowCursorTestJob(original,candidate.preparePalette(colors),cut,mw,mh,metric,alphaMode),length=a.result.indices.length;
  let at=0,step=0;const chunks=[1,2,17,127,128,129,2047,2048,2051,8191];while(at<length){const next=Math.min(length,at+chunks[step++%chunks.length]);baseline.rowCursorTestConvert(a,at,next);candidate.rowCursorTestConvert(b,at,next);compared(a,b);add('oddChunkBoundary');at=next;}
  const direct=baseline.quantize(original,colors,cut,mw,mh,{metric,alphaMode});assert.deepEqual(b.result,direct);add('syncParity');
  if(!sample){assert.deepEqual(b.result,scalarNearest(original,colors,metric,alphaMode,cut));add('independentScalarNearest');}
  const asyncValue=await candidate.quantizeAsync(original,colors,cut,mw,mh,{metric,alphaMode,chunkPixels:129});assert.deepEqual(asyncValue,direct);add('asyncParity');
  for(const offset of[1,Math.min(length-1,17),Math.min(length-1,mw+1)])if(offset>0){const x=baseline.rowCursorTestJob(original,baseline.preparePalette(colors),cut,mw,mh,metric,alphaMode),y=candidate.rowCursorTestJob(original,candidate.preparePalette(colors),cut,mw,mh,metric,alphaMode);baseline.rowCursorTestConvert(x,offset,Math.min(length,offset+133));candidate.rowCursorTestConvert(y,offset,Math.min(length,offset+133));compared(x,y);add('nonzeroFreshSliceStart');}
}
const partial=make(47,39,true);for(const metric of['rgb','oklab'])for(const alphaMode of['cut','keep'])for(const dither of['none','2x2','4x4','8x8'])for(const strength of[0,50,100]){const options={metric,alphaMode,dither,ditherStrength:strength};assert.deepEqual(await candidate.quantizeAsync(partial,colors,128,31,23,{...options,chunkPixels:2051}),await baseline.quantizeAsync(partial,colors,128,31,23,{...options,chunkPixels:2051}));add('ditherAlphaUnchanged');}
const controller=new AbortController();controller.abort();await assert.rejects(candidate.quantizeAsync(partial,colors,128,undefined,undefined,{signal:controller.signal}),{name:'AbortError'});add('entryCancel');
const live=new AbortController();await assert.rejects(candidate.quantizeAsync(originals.at(-1),colors,128,undefined,undefined,{signal:live.signal,chunkPixels:129,onProgress:()=>live.abort()}),{name:'AbortError'});add('progressCancel');
const sharp=createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
const decode=async name=>{const {data,info}=await sharp(fileURLToPath(new URL(`../../practical-workloads-2026-10-16/fixtures/${name}.png`,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data.buffer,data.byteOffset,data.byteLength)};};
const practical=[['tiny',await decode('dungeon-wizard')],['sheet1024',await decode('kenney-sheet-1024')],['sheet2048',await decode('kenney-sheet-2048')],['entropy',make(256,256,true)],['partial',make(256,256,true)]];
const timings=[],pngEquality=[];for(const[name,image]of practical){const options={metric:'oklab',alphaMode:name==='partial'?'keep':'cut'},paletteA=baseline.preparePalette(colors),paletteB=candidate.preparePalette(colors);for(const sample of[false,true]){const mw=sample?Math.min(321,image.width):image.width,mh=sample?Math.min(279,image.height):image.height;for(const module of[baseline,candidate])await module.quantizeAsync(image,module===baseline?paletteA:paletteB,128,mw,mh,options);for(let pair=0;pair<5;pair++)for(const kind of pair%2?['candidate','baseline']:['baseline','candidate']){const module=kind==='baseline'?baseline:candidate,palette=kind==='baseline'?paletteA:paletteB,begin=performance.now();const result=await module.quantizeAsync(image,palette,128,mw,mh,options);timings.push({name,sample,pair,kind,phase:'wholeNearestConversion',ms:performance.now()-begin,pixels:result.indices.length});}}
  // Exact full PNG bytes include conversion+packing+compression. Browser-native
  // performance still must be measured independently before production.
  const a=await baseline.quantizeAsync(image,paletteA,128,undefined,undefined,options),b=await candidate.quantizeAsync(image,paletteB,128,undefined,undefined,options),png=async result=>palettePngBytesAsync({...result,colors,alphaMode:options.alphaMode}),reference=await png(a);assert.deepEqual(await png(b),reference);pngEquality.push(name);
  for(let pair=0;pair<5;pair++)for(const kind of pair%2?['candidate','baseline']:['baseline','candidate']){const module=kind==='baseline'?baseline:candidate,palette=kind==='baseline'?paletteA:paletteB,begin=performance.now(),value=await module.quantizeAsync(image,palette,128,undefined,undefined,options),bytes=await png(value),ms=performance.now()-begin;assert.deepEqual(bytes,reference);timings.push({name,sample:false,pair,kind,phase:'wholeNearestPngPreparation',ms,bytes:bytes.length});add('pairedPngExact');}
}
const round=Number(process.env.ROW_CURSOR_ROUND??1);if(![1,2].includes(round))throw Error('Maximum two focused rounds');
const result={created:new Date().toISOString(),round,node:process.version,seed:'0x7ac8135',counts,timings,pngEquality,inputs:practical.map(([name,image])=>({name,width:image.width,height:image.height,rgbaSha256:createHash('sha256').update(image.data).digest('hex')})),scope:'Research-only5ae baseline vs one local coordinate-loop change. Timed whole nearest core conversions, source/decoding staged before timing. Native renderer CPU/export/UI acceptance remains separate.'};await writeFile(new URL(`row-cursor-node-round${round}.json`,import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({round,counts,pngEquality,trialCount:timings.length},null,2));
