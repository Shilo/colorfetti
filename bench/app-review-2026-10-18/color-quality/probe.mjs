import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { quantize, colorize } from '../../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
import { selectPaletteSubset } from '../../../src/lib/palette-limit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const decode = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const lin = n => n <= .04045 * 255 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4;
const linearRgb = a => a.map(lin);
function lab([r, g, b]) {
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s];
}
const dist = (a,b) => a.reduce((s,v,i)=>s+(v-b[i])**2,0);
const solid = (rgb, w=8,h=8) => ({width:w,height:h,data:Uint8ClampedArray.from(Array.from({length:w*h},()=>[...rgb,255]).flat())});
const options = { metric:'oklab', dither:'8x8', ditherStrength:100 };
function summarize(source, colors, result) {
  const counts = new Map(); for (const n of result.indices) counts.set(n,(counts.get(n)??0)+1);
  const sourceLinear = linearRgb(Array.from(source.data.slice(0,3))), sourceLab = lab(sourceLinear);
  const paletteLinear = colors.map(c=>linearRgb(decode(c)));
  const mean = [0,0,0]; let pointMSE=0;
  for(const [n,count] of counts) { for(let c=0;c<3;c++)mean[c]+=paletteLinear[n][c]*count/result.indices.length; pointMSE+=dist(lab(paletteLinear[n]),sourceLab)*count/result.indices.length; }
  return {colors: [...counts].map(([n,count])=>({color:colors[n],count})), blockMSE:dist(lab(mean),sourceLab), pointMSE, score:dist(lab(mean),sourceLab)+.03*pointMSE};
}
function exhaustive(rgb,colors,candidateCount=Infinity,occupancy='all') {
  const ls=colors.map(c=>linearRgb(decode(c))), labs=ls.map(lab), sourceL=linearRgb(rgb), sourceLab=lab(sourceL);
  const ranking=colors.map((c,i)=>({i,d:dist(sourceLab,labs[i])})).sort((a,b)=>a.d-b.d||a.i-b.i);
  const ids=ranking.slice(0,candidateCount).map(x=>x.i), nearest=ranking[0].i;
  let best={a:nearest,b:nearest,weight:0,blockMSE:dist(sourceLab,labs[nearest]),pointMSE:dist(sourceLab,labs[nearest])}; best.score=best.blockMSE+.03*best.pointMSE;
  for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
    const ai=ids[a],bi=ids[b]; let lo=1,hi=63;
    if(occupancy==='projection') { const delta=ls[bi].map((v,i)=>v-ls[ai][i]); const ideal=delta.reduce((s,v,i)=>s+(sourceL[i]-ls[ai][i])*v,0)/delta.reduce((s,v)=>s+v*v,0); const mid=Math.max(1,Math.min(63,Math.round(ideal*64)));lo=Math.max(1,mid-1);hi=Math.min(63,mid+1); }
    for(let w=lo;w<=hi;w++){const t=w/64,mix=ls[ai].map((v,i)=>v*(1-t)+ls[bi][i]*t),blockMSE=dist(sourceLab,lab(mix)),pointMSE=dist(sourceLab,labs[ai])*(1-t)+dist(sourceLab,labs[bi])*t,score=blockMSE+.03*pointMSE;if(score<best.score)best={a:ai,b:bi,weight:w,blockMSE,pointMSE,score};}
  }
  return {...best,pair:[colors[best.a],colors[best.b]]};
}

const report={conditions:options, capDither:[], candidateSearch:[], aliasing:[], realCorpus:[]};
report.guards={productionProjectionParity:0,maxProjectionScoreError:0,oracleNeverWorseWithinSameFour:0};
const gray=FULL_PRESETS.find(p=>p.id==='preset-gray8').colors;
for(const v of [64,96,128,160,192]) {
 const source=solid([v,v,v]); const selected=await selectPaletteSubset(gray,2,async function*(){yield{data:source.data,weight:1};}); const subset=selected.indices.map(i=>gray[i]);
 const fullResult=quantize(source,gray,128,undefined,undefined,options),subsetResult=quantize(source,subset,128,undefined,undefined,options);
 const nearest=quantize(source,gray); const pair=exhaustive([v,v,v],gray);
 report.capDither.push({gray:v,subset,selected,full:summarize(source,gray,fullResult),capped:summarize(source,subset,subsetResult),nearest:summarize(source,gray,nearest),bestTwo:pair});
}
const samples=[];for(const r of [32,96,160,224])for(const g of [32,96,160,224])for(const b of [32,96,160,224]) samples.push([r,g,b]);
samples.push([128,128,128],[188,188,188],[64,128,192],[180,120,70]);
for(const p of FULL_PRESETS.filter(p=>p.colors.length>=8))for(const rgb of samples){
 const source=solid(rgb),actual=summarize(source,p.colors,quantize(source,p.colors,128,undefined,undefined,options));
 const projection=exhaustive(rgb,p.colors,4,'projection'),fourAll=exhaustive(rgb,p.colors,4),allPairs=exhaustive(rgb,p.colors);
 const error=Math.abs(projection.score-actual.score);assert(error<1e-12,'independent projection oracle must match product emitted score');assert(fourAll.score<=actual.score+1e-12,'same-four exhaustive is an oracle lower bound, not new objective');
 report.guards.productionProjectionParity++;report.guards.oracleNeverWorseWithinSameFour++;report.guards.maxProjectionScoreError=Math.max(error,report.guards.maxProjectionScoreError);
 report.candidateSearch.push({palette:p.name,rgb,actual,projection,fourAll,allPairs,scoreGap:actual.score-allPairs.score,blockGap:actual.blockMSE-allPairs.blockMSE});
}
report.candidateSearch.sort((a,b)=>b.scoreGap-a.scoreGap);
const require=createRequire(import.meta.url), sharp=require(process.env.SHARP_MODULE ?? 'sharp');
const asPng=async (source,result,colors,file) => {
 const rgba=result ? colorize(result,colors) : source;
 const width=rgba.width??rgba.w,height=rgba.height??rgba.h;
 await sharp(Buffer.from(rgba.data),{raw:{width,height,channels:4}}).png().toFile(path.join(here,file));
};
const aliasSource=solid([128,128,128],128,128),bw=['#000000','#ffffff'];
await asPng(aliasSource,null,null,'alias-source.png');
for(const dither of ['2x2','4x4','8x8'])for(const divisor of [1,2,4,8]) {
 const result=quantize(aliasSource,bw,128,128/divisor,128/divisor,{...options,dither});
 const white=result.indices.reduce((s,v)=>s+v,0)/result.indices.length;
 report.aliasing.push({dither,divisor,whiteFraction:white,width:result.w,height:result.h});
 if(divisor<=2)await asPng(aliasSource,result,bw,`alias-${dither}-${divisor}.png`);
}
// Independent recursive Bayer construction, equivalent to the product's source phase.
let matrix=[[0]];for(let side=1;side<8;side*=2){const old=matrix;matrix=Array.from({length:side*2},(_,y)=>Array.from({length:side*2},(_,x)=>4*old[y%side][x%side]+[[0,2],[3,1]][Math.floor(y/side)][Math.floor(x/side)]));}
function renderPlan(source,colors,limit=4) {
 const {width,height,data}=source,indices=new Uint16Array(width*height).fill(256),memo=new Map(),used=new Uint8Array(256);let changed=0;
 const exact=new Map(colors.map((c,i)=>[parseInt(c.slice(1),16),i]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const o=y*width+x,p=o*4;if(data[p+3]<128)continue;const rgb=Array.from(data.slice(p,p+3)),key=rgb[0]*65536+rgb[1]*256+rgb[2];let n=exact.get(key);
  if(n===undefined){let plan=memo.get(key);if(!plan){plan=exhaustive(rgb,colors,limit);memo.set(key,plan);}n=matrix[y%8][x%8]<plan.weight?plan.b:plan.a;}
  indices[o]=n;used[n]=1;
 }
 return {indices,w:width,h:height,used,hasTransparency:indices.includes(256)};
}
function realMetrics(source,colors,a,b){
 const pa=colorize(a,colors),pb=colorize(b,colors),points=[0,0],blocks=[0,0];let n=0,nb=0,changed=0;
 for(let p=0;p<source.data.length;p+=4){if(source.data[p+3]<128)continue;const s=lab(linearRgb(Array.from(source.data.slice(p,p+3))));points[0]+=dist(s,lab(linearRgb(Array.from(pa.data.slice(p,p+3)))));points[1]+=dist(s,lab(linearRgb(Array.from(pb.data.slice(p,p+3)))));n++;if(a.indices[p/4]!==b.indices[p/4])changed++;}
 for(let y=0;y<source.height;y+=4)for(let x=0;x<source.width;x+=4){const means=Array.from({length:3},()=>[0,0,0]);let mass=0;for(let j=y;j<Math.min(y+4,source.height);j++)for(let i=x;i<Math.min(x+4,source.width);i++){const p=(j*source.width+i)*4;if(source.data[p+3]<128)continue;for(const [t,im]of [source,pa,pb].entries())for(let c=0;c<3;c++)means[t][c]+=lin(im.data[p+c]);mass++;}if(!mass)continue;const labs=means.map(v=>lab(v.map(c=>c/mass)));blocks[0]+=dist(labs[0],labs[1]);blocks[1]+=dist(labs[0],labs[2]);nb++;}
 return{visible:n,changed,pointMSE:{current:points[0]/n,oracle4:points[1]/n},block4MSE:{current:blocks[0]/nb,oracle4:blocks[1]/nb}};
}
const manifest=JSON.parse(fs.readFileSync('bench/important-colors-review/manifest.json'));
for(const f of manifest.files.filter(f=>f.kind==='real')){
 const bytes=fs.readFileSync('bench/important-colors-review/'+f.file),hash=createHash('sha256').update(bytes).digest('hex');if(hash!==f.sha256)throw Error('source hash mismatch '+f.id);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const source={width:info.width,height:info.height,data:new Uint8ClampedArray(data)};
 for(const palette of FULL_PRESETS.filter(p=>['preset-pico8','preset-edg8','preset-db16'].includes(p.id))){
  const current=quantize(source,palette.colors,128,undefined,undefined,options),oracle=renderPlan(source,palette.colors);
  report.realCorpus.push({source:f.id,sha256:hash,provenance:f.source,palette:palette.name,...realMetrics(source,palette.colors,current,oracle)});
  await asPng(source,null,null,`${f.id}-source.png`);await asPng(source,current,palette.colors,`${f.id}-${palette.id}-current.png`);await asPng(source,oracle,palette.colors,`${f.id}-${palette.id}-oracle4.png`);
 }
}
report.candidateSummary={cases:report.candidateSearch.length,sameFourExhaustiveImproves:report.candidateSearch.filter(r=>r.fourAll.score<r.actual.score-1e-12).length,allPairsExhaustiveImproves:report.candidateSearch.filter(r=>r.allPairs.score<r.actual.score-1e-12).length,notes:'Selected synthetic repro records retained; full sweep deterministically regenerates.'};
const keyExample=report.candidateSearch.find(r=>r.palette==='DawnBringer 16'&&String(r.rgb)==='96,32,224');
report.candidateSearch=report.candidateSearch.slice(0,12);if(!report.candidateSearch.includes(keyExample))report.candidateSearch.push(keyExample);
fs.writeFileSync(path.join(here,'results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({capDither:report.capDither.map(r=>({gray:r.gray,subset:r.subset,full:r.full,capped:r.capped})),largestGaps:report.candidateSearch.slice(0,3),aliasing:report.aliasing,realCorpus:report.realCorpus.map(r=>({...r,provenance:undefined}))},null,2));
