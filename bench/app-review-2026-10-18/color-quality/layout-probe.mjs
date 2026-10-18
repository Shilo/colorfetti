import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {shown} from '../../../src/lib/layout.js';
import {quantize} from '../../../src/lib/quantize.js';
const here=path.dirname(fileURLToPath(import.meta.url)),palette=['#000000','#ffffff'];
const solid=(w,h,gray)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:gray)});
const phase=(original,sample)=>{const counts=new Uint32Array(8);for(let i=0;i<sample;i++)counts[Math.floor((i+.5)*original/sample)%8]++;return counts;};
const rows=[];
for(const gray of [32,64,96,128,160,188,224])for(const dither of ['2x2','4x4','8x8']){
 const tile=quantize(solid(8,8,gray),palette,128,undefined,undefined,{dither,ditherStrength:100});
 const actual=tile.indices.reduce((s,v)=>s+v,0)/64;
 for(const width of [128,256,512,1024,2048])for(const aspect of [1,2,4,8,16]){
  const height=width/aspect;if(height<32)continue;
  for(let across=96;across<=512;across++){
   const [mw,mh]=shown(width,height,across);if(mw>=width)continue;
   const xs=phase(width,mw),ys=phase(height,mh);let white=0;for(let y=0;y<8;y++)for(let x=0;x<8;x++)white+=xs[x]*ys[y]*tile.indices[y*8+x];
   white/=mw*mh;rows.push({gray,dither,width,height,across,mw,mh,fullWhite:actual,sampleWhite:white,difference:white-actual,absDifference:Math.abs(white-actual)});
  }
 }
}
rows.sort((a,b)=>b.absDifference-a.absDifference);
const squares=rows.filter(r=>r.width===r.height),longs=rows.filter(r=>r.width!==r.height);
const important=[squares[0],longs[0],rows.find(r=>r.width===1024&&r.height===128&&r.across===256&&r.gray===128&&r.dither==='4x4')];
for(const row of important){const {width,height,mw,mh,gray,dither}=row;const q=quantize(solid(width,height,gray),palette,128,mw,mh,{dither,ditherStrength:100});const actual=q.indices.reduce((s,v)=>s+v,0)/q.indices.length;if(actual!==row.sampleWhite)throw Error('Histogram vs real production disagrees');}
const result={sweep:'7 grays x 3 matrices x 5 power-of-two widths x 5 aspect ratios x across96..512; shown() production function; uniform source; 100% strength',cases:rows.length,worstSquares:squares.slice(0,12),worstRectangles:longs.slice(0,12),confirmed:important};
fs.writeFileSync(path.join(here,'layout-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
