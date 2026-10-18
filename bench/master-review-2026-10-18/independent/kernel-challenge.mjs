import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { quantize as baseline, colorize } from '../../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
import { shown } from '../../../src/lib/layout.js';

const here=path.dirname(fileURLToPath(import.meta.url)), lib=path.resolve(here,'../../../src/lib');
const code=fs.readFileSync(path.join(lib,'quantize.js'),'utf8'), ditherCode=fs.readFileSync(path.join(lib,'palette-dither.js'),'utf8');
const dataUrl=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
async function variant(dither) {
 let q=code.replace("from './palette-dither.js'",`from '${dataUrl(dither)}'`);
 q=q.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${pathToFileURL(path.join(lib,p)).href}'`);
 return (await import(dataUrl(q))).quantize;
}
const outputPhase=await variant(ditherCode.replace('ranks[(y % side) * side + x % side]','ranks[(Math.floor(o / result.w) % side) * side + (o % result.w) % side]'));
const eight=await variant(ditherCode.replaceAll('new Uint16Array(4)','new Uint16Array(8)').replaceAll('new Float64Array(4)','new Float64Array(8)').replace('Math.min(4, size)','Math.min(8, size)'));
const direct=await variant(ditherCode.replace('const { side, ranks } = state.ditherData;',`const { side, ranks } = state.ditherData;
  state.directKeys ??= new Int32Array(65536).fill(-1);
  state.directPlans ??= new Int32Array(65536);`)
 .replace('let plan = state.memo?.get(key);',`const slot = Math.imul(key ^ key >>> 12, 2654435761) >>> 16;
      let plan = state.directKeys[slot] === key ? state.directPlans[slot] : undefined;`)
 .replace(/        if \(state\.memo\) \{[\s\S]*?else state\.memo\.set\(key, plan\);\r?\n        \}/,'        state.directKeys[slot] = key; state.directPlans[slot] = plan;'));
const solid=(w,h,v)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:v)});
const bw=['#000000','#ffffff'],opts={dither:'4x4',ditherStrength:100};
const rows=[];
for (const [w,h,across,v] of [[1024,128,256,128],[1024,1024,384,224],[2048,512,96,32],[53,29,17,128],[53,29,4,128]]) {
 const source=solid(w,h,v),[mw,mh]=shown(w,h,across);
 const full=baseline(source,bw,128,undefined,undefined,opts),old=baseline(source,bw,128,mw,mh,opts),alt=outputPhase(source,bw,128,mw,mh,opts);
 const fraction=r=>r.indices.reduce((s,v)=>s+(v===1),0)/r.indices.length;
 rows.push({source:[w,h],across,sample:[mw,mh],v,fullWhite:fraction(full),sourcePhaseWhite:fraction(old),outputPhaseWhite:fraction(alt)});
 assert.deepEqual(outputPhase(source,bw,128,undefined,undefined,opts),full);
}
const source={width:97,height:61,data:Uint8ClampedArray.from({length:97*61*4},(_,i)=>i%4===3?255:(Math.imul(i,73)+17)&255)};
const palette=FULL_PRESETS.find(p=>p.id==='preset-pico8').colors;
const full=baseline(source,palette,128,undefined,undefined,opts),old=baseline(source,palette,128,23,17,opts),alt=outputPhase(source,palette,128,23,17,opts);
let oldMismatch=0,altMismatch=0;
for(let y=0;y<17;y++)for(let x=0;x<23;x++) {const expected=full.indices[Math.floor((y+.5)*61/17)*97+Math.floor((x+.5)*97/23)];oldMismatch+=old.indices[y*23+x]!==expected;altMismatch+=alt.indices[y*23+x]!==expected;}
const report={provenance:{head:(await import('node:child_process')).execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,note:'Test-only source transformations, no source/config edits. Direct cache uses exact 24-bit keys. Timings are Node synchronous CPU, not browser or phone.'},phase:{uniform:rows,pointCorrespondence:{samplePixels:391,sourcePhaseMismatch:oldMismatch,outputPhaseMismatch:altMismatch},fullOutputParity:true},candidates:[],cache:[]};
// Adversarial spatial correlation: each 4x4 source block has one constant gray,
// chosen by the destination Bayer cell to maximize a black-biased output-phase
// overview. This tests the proposed phase fix against a box average of EXPORT,
// without treating source pointwise correspondence as an appearance score.
const table=[];
for(let v=8;v<256;v+=8){const patch=solid(4,4,v),r=baseline(patch,bw,128,undefined,undefined,opts);table.push({v,indices:[...r.indices],fraction:r.indices.reduce((s,v)=>s+v,0)/16});}
const correlated=solid(512,512,0);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 const cell=(y%4)*4+x%4;
 const winner=table.filter(r=>r.indices[cell]===0).sort((a,b)=>b.fraction-a.fraction)[0];
 for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const p=((y*4+dy)*512+x*4+dx)*4;correlated.data[p]=correlated.data[p+1]=correlated.data[p+2]=winner.v;}
}
const correlatedFull=baseline(correlated,bw,128,undefined,undefined,opts),correlatedOld=baseline(correlated,bw,128,128,128,opts),correlatedAlt=outputPhase(correlated,bw,128,128,128,opts),white=r=>r.indices.reduce((s,v)=>s+v,0)/r.indices.length;
report.phase.spatialCorrelation={source:[512,512],sample:[128,128],fullWhite:white(correlatedFull),sourcePhaseWhite:white(correlatedOld),outputPhaseWhite:white(correlatedAlt),note:'Deliberately adversarial 4x4 block source; demonstrates output-phase overview cannot guarantee area fidelity.'};
const lin=v=>v<=.04045*255?v/255/12.92:((v/255+.055)/1.055)**2.4;
function lab([r,g,b]){const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const dist=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
function metrics(source,palette,result){
 const out=colorize(result,palette);let point=0,blocks=0,n=0,bn=0;
 for(let p=0;p<source.data.length;p+=4){if(source.data[p+3]<128)continue;point+=dist(lab([...source.data.slice(p,p+3)].map(lin)),lab([...out.data.slice(p,p+3)].map(lin)));n++;}
 for(let y=0;y<source.height;y+=4)for(let x=0;x<source.width;x+=4){let sumS=[0,0,0],sumO=[0,0,0],mass=0;for(let dy=0;dy<4&&y+dy<source.height;dy++)for(let dx=0;dx<4&&x+dx<source.width;dx++){const p=((y+dy)*source.width+x+dx)*4;if(source.data[p+3]<128)continue;for(let c=0;c<3;c++){sumS[c]+=lin(source.data[p+c]);sumO[c]+=lin(out.data[p+c]);}mass++;}if(mass){blocks+=dist(lab(sumS.map(v=>v/mass)),lab(sumO.map(v=>v/mass)));bn++;}}
 return {pointMSE:point/n,block4MSE:blocks/bn};
}
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE ?? 'sharp');
const manifest=JSON.parse(fs.readFileSync('bench/important-colors-review/manifest.json'));
for(const f of manifest.files.filter(f=>f.kind==='real')){
 const bytes=fs.readFileSync(path.join('bench/important-colors-review',f.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const img={width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
 for(const p of FULL_PRESETS.filter(p=>['preset-pico8','preset-edg8','preset-db16'].includes(p.id)))for(const ditherStrength of [50,100]){
  const settings={...opts,ditherStrength};const a=baseline(img,p.colors,128,undefined,undefined,settings),b=eight(img,p.colors,128,undefined,undefined,settings);
  let changed=0;for(let i=0;i<a.indices.length;i++)changed+=a.indices[i]!==b.indices[i];report.candidates.push({image:f.id,palette:p.name,ditherStrength,changed,four:metrics(img,p.colors,a),eight:metrics(img,p.colors,b)});
 }
}
let rng=0xc010f377;const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;};
const cacheSources=[
 ['smooth-blocks',(x,y)=>[Math.floor(x/4),Math.floor(y/4),Math.floor((x+y)/8)]],
 ['repeated-512-runs',(x,y)=>[x&255,y&255,(x+y)&255]],
 ['white-noise',()=>[rand()&255,rand()&255,rand()&255]],
 ['gradient-noise',(x,y)=>[Math.max(0,Math.min(255,Math.floor(x/2)+(rand()%25-12))),Math.max(0,Math.min(255,Math.floor(y/2)+(rand()%25-12))),128]],
];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
for(const [name,make] of cacheSources){
 const w=256,h=256,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set([...make(x,y),255],(y*w+x)*4);const img={width:w,height:h,data};
 for(const p of FULL_PRESETS.filter(p=>['preset-edg8','preset-pico8'].includes(p.id))){
  const expected=baseline(img,p.colors,128,undefined,undefined,opts);assert.deepEqual(direct(img,p.colors,128,undefined,undefined,opts),expected);
  const samples={baseline:[],direct:[]};for(let run=0;run<7;run++)for(const [id,fn] of run%2?[['direct',direct],['baseline',baseline]]:[['baseline',baseline],['direct',direct]]){const start=performance.now();fn(img,p.colors,128,undefined,undefined,opts);const ms=performance.now()-start;if(run>0)samples[id].push(ms);}
  report.cache.push({name,palette:p.name,pixels:w*h,samples,medianMs:{baseline:median(samples.baseline),direct:median(samples.direct)},speedup:median(samples.baseline)/median(samples.direct),indicesIdentical:true});
 }
}
report.candidateSummary={cases:report.candidates.length,blockImproves:report.candidates.filter(r=>r.eight.block4MSE<r.four.block4MSE-1e-12).length,blockWorsens:report.candidates.filter(r=>r.eight.block4MSE>r.four.block4MSE+1e-12).length,unchanged:report.candidates.filter(r=>Math.abs(r.eight.block4MSE-r.four.block4MSE)<=1e-12).length,pointImproves:report.candidates.filter(r=>r.eight.pointMSE<r.four.pointMSE-1e-12).length,pointWorsens:report.candidates.filter(r=>r.eight.pointMSE>r.four.pointMSE+1e-12).length};
fs.writeFileSync(path.join(here,'kernel-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({phase:report.phase,candidateSummary:report.candidateSummary,cache:report.cache.map(({samples,...r})=>r)},null,2));
