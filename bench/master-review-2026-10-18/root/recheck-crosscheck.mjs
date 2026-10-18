// Independent scalar challenge of the sibling quality review, no broad sweeps.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { quantize } from '../../../src/lib/quantize.js';
import { fullPaletteImage } from '../../../src/lib/palette-state.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
import { shown } from '../../../src/lib/layout.js';
const source=(width,height,v)=>({width,height,data:Uint8ClampedArray.from({length:width*height*4},(_,p)=>p%4===3?255:Array.isArray(v)?v[p%4]:v)});
const report={capApplicationPath:[],layout:[],mixture:null,remap:null};
const colors=FULL_PRESETS.find(p=>p.id==='preset-gray8').colors,item={name:'gray.png',original:source(8,8,128)};
for(const strength of [50,100])for(const maxColors of [0,2]){
 const result=await fullPaletteImage(item,{family:'full-palette',colors,alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors,cleanup:false,dither:'8x8',ditherStrength:strength});
 const counts={};for(const i of result.indices)counts[result.colors[i]]=(counts[result.colors[i]]??0)+1;
 report.capApplicationPath.push({strength,maxColors,selected:result.colors,counts});
 if(maxColors===2)assert.deepEqual(counts,{'#929292':64});else assert.equal(Object.keys(counts).length,2);
}
const layout=JSON.parse(fs.readFileSync('bench/app-review-2026-10-18/color-quality/layout-results.json'));
for(const row of layout.confirmed){
 const [mw,mh]=shown(row.width,row.height,row.across);assert.deepEqual([mw,mh],[row.mw,row.mh]);
 const q=quantize(source(row.width,row.height,row.gray),['#000000','#ffffff'],128,mw,mh,{dither:row.dither,ditherStrength:100});
 const white=q.indices.reduce((s,n)=>s+n,0)/q.indices.length;assert.equal(white,row.sampleWhite);
 report.layout.push({...row,scalarVerified:true});
}
// A physically feasible wall tile: 140 CSS px, 8px inset, DPR1, Fit.
{
 const dims=shown(2048,512,124),q=quantize(source(2048,512,32),['#000000','#ffffff'],128,...dims,{dither:'8x8',ditherStrength:100});
 report.layout.push({source:[2048,512],cssArtBox:[140,140],inset:8,dpr:1,inspectionScale:1,across:124,sampled:dims,sampleWhite:q.indices.reduce((s,n)=>s+n,0)/q.indices.length,fullWhite:1/64});
 assert.equal(report.layout.at(-1).sampleWhite,1);
}
const lin=n=>n<=.04045*255?n/255/12.92:((n/255+.055)/1.055)**2.4;
const lab=([r,g,b])=>{const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];};
const dist=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
{
 const palette=FULL_PRESETS.find(p=>p.name==='ENDESGA 8').colors,rgb=[96,96,32],sl=rgb.map(lin),sourceLab=lab(sl),lights=palette.map(c=>[1,3,5].map(at=>lin(parseInt(c.slice(at,at+2),16)))),labs=lights.map(lab),rank=palette.map((color,i)=>({i,color,error:dist(labs[i],sourceLab)})).sort((a,b)=>a.error-b.error||a.i-b.i),top=rank.slice(0,4).map(r=>r.i);
 const evaluate=(a,b,weight)=>{const t=weight/64,mix=lights[a].map((v,c)=>v*(1-t)+lights[b][c]*t),blockMSE=dist(lab(mix),sourceLab),pointMSE=dist(labs[a],sourceLab)*(1-t)+dist(labs[b],sourceLab)*t;return{a:palette[a],b:palette[b],weight,blockMSE,pointMSE,score:blockMSE+.03*pointMSE};};
 let best=evaluate(top[0],top[0],0);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)for(let weight=1;weight<64;weight++){const v=evaluate(top[i],top[j],weight);if(v.score<best.score)best=v;}
 const actual=quantize(source(8,8,rgb),palette,128,undefined,undefined,{metric:'oklab',dither:'8x8',ditherStrength:100}),counts={};let mean=[0,0,0],point=0;for(const i of actual.indices){counts[palette[i]]=(counts[palette[i]]??0)+1;for(let c=0;c<3;c++)mean[c]+=lights[i][c]/64;point+=dist(labs[i],sourceLab)/64;}
 const currentScore=dist(lab(mean),sourceLab)+.03*point;const recorded=JSON.parse(fs.readFileSync('bench/app-review-2026-10-18/color-quality/results.json')).candidateSearch[0];assert(Math.abs(best.score-recorded.fourAll.score)<1e-12);assert(Math.abs(currentScore-recorded.actual.score)<1e-12);
 report.mixture={rgb,topFour:rank.slice(0,4),current:{counts,score:currentScore},exhaustiveSameFour:best,objective:'Oklab squared distance of linear-light mean + .03 * mean per-pixel squared Oklab distance; 8x8, 100% strength'};
}
{
 const original=source(64,64,[208,0,0]);for(let y=16;y<48;y++)for(let x=16;x<48;x++)original.data[(y*64+x)*4]=176;
 const before=quantize(original,['#b00000','#d00000']),after=quantize(original,['#00ff00','#d00000']);assert.equal(new Set(before.indices).size,2);assert.equal(new Set(after.indices).size,1);assert(after.indices.every(v=>v===1));report.remap={actualGreenPixels:after.indices.filter(v=>v===0).length,frozenAssignmentGreenPixels:before.indices.filter(v=>v===0).length,validSeparateWorkflow:true};
}
fs.writeFileSync(`${import.meta.dirname}/crosscheck.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
