import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {sharp,sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const out=import.meta.dirname,dir=path.join(out,'fixtures');await mkdir(dir,{recursive:true});
const records=[];
async function png(id,w,h,make,recipe){const data=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(make(x,y),4*(y*w+x));const b=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer(),file='fixtures/'+id+'.png';await writeFile(path.join(out,file),b);records.push({id,file,width:w,height:h,frames:1,sha256:sha(b),license:'CC0-1.0',kind:'audit-owned deterministic diagnostic',recipe});}
await png('transparent32',32,32,()=>[0,0,0,0],'32x32 zero RGBA');
await png('two-color32',32,32,(x,y)=>x<16?[25,80,140,255]:[240,160,60,255],'32x32 vertical half RGB(25,80,140) / RGB(240,160,60)');
await png('glow64',64,64,(x,y)=>[70,130,220,Math.max(0,Math.round(255*(1-Math.hypot(x-31.5,y-31.5)/44.55)))],'fixed RGB(70,130,220), radial alpha round255*(1-distance(31.5,31.5)/44.55), clamp0');
let rng=0x352713;
for(const n of [256,512]){rng=0x352713;await png('entropy'+n,n,n,()=>{const c=[];for(let i=0;i<3;i++){rng=(Math.imul(rng,1664525)+1013904223)>>>0;c.push(rng>>>24)}return [...c,255]},'LCG seed0x352713, uint32(1664525*x+1013904223), top byte for RGB, opaque; bounded adverse input');}
for(const n of [4096,4097])await png('rgb-boundary-'+n,n,1,x=>[x>>>16,x>>>8&255,x&255,255],n+'x1, RGB=int(pixel index), opaque; exact unique RGB boundary');
const source=await readFile(path.resolve(out,'../../practical-workloads-2026-10-16/fixtures/dungeon-wizard.png')),bytes=await sharp(source).gif({dither:0,effort:1}).toBuffer();await writeFile(path.join(dir,'single-frame.gif'),bytes);records.push({id:'single-frame',file:'fixtures/single-frame.gif',width:16,height:16,frames:1,sha256:sha(bytes),license:'CC0-1.0',kind:'Kenney CC0 sprite encoded as one-frame GIF',recipe:'dungeon-wizard.png passed to Sharp.gif({dither:0,effort:1}); source origin/license in fixture-manifest.json',sourceSha256:sha(source)});
const palette256=Array.from({length:256},(_,i)=>'#'+[i,(i*73)&255,(i*151)&255].map(n=>n.toString(16).padStart(2,'0')).join(''));
await writeFile(path.join(out,'diagnostic-manifest.json'),JSON.stringify({purpose:'second audit desktop diagnostics (copied from first-audit fixtures.mjs, plus entropy512 with the same LCG reset per size)',date:new Date().toISOString(),scope:'bounded correctness/performance diagnostics, not the typical workload ranking',records,palette256,paletteRecipe:'256 unique colors: R=i, G=(i*73)&255, B=(i*151)&255, i=0..255'},null,2)+'\n');console.log(records.map(r=>r.id+' '+r.sha256).join('\n'));
