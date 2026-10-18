// Read-only production audit; all generated fixtures live beside this probe.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { deflateSync, crc32 } from 'node:zlib';
import assert from 'node:assert/strict';
import omggif from 'omggif';
import { palettePngBytes } from '../../../src/lib/save.js';
import { encodePaletteGif, decodeGif } from '../../../src/lib/gif.js';
import { analyzeImportFrames } from '../../../src/lib/image-import-core.js';
const require = createRequire(import.meta.url);
const sharpPath=process.env.SHARP_MODULE ?? 'sharp';
const sharp = require(sharpPath);
const dir = import.meta.dirname;
function chunk(type, data) { const body = Buffer.concat([Buffer.from(type), Buffer.from(data)]), out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); body.copy(out, 4); out.writeUInt32BE(crc32(body), out.length - 4); return out; }
function png(w,h,type,depth,rows,extras=[]) { const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr.set([depth,type,0,0,0],8);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('sRGB',Buffer.from([0])),...extras,chunk('IDAT',deflateSync(rows,{level:3})),chunk('IEND',Buffer.alloc(0))]); }
const results = { node:process.version, oracle:{module:require.resolve(sharpPath),versions:sharp.versions}, productionModules:['src/lib/save.js','src/lib/gif.js','src/lib/image-import-core.js'], cases:[] };
// Same zlib level, same exact 128 RGBA states: isolate indexed alpha encoding.
{
 const w=512,h=512,colors=Array.from({length:8},(_,i)=>'#'+((32+i*29)*65536+(37+i*17)*256+44+i*19).toString(16).padStart(6,'0'));
 const indices=new Uint16Array(w*h), alpha=new Uint8Array(w*h), rows=Buffer.alloc((w+1)*h), rgba=Buffer.alloc(w*h*4), table=Buffer.alloc(128*3), alphas=Buffer.alloc(128);
 for(let i=0;i<128;i++){const c=parseInt(colors[i>>4].slice(1),16);table.set([c>>16,c>>8&255,c&255],i*3);alphas[i]=1+(i%16)*16;}
 let seed=42;for(let p=0;p<w*h;p++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const slot=seed>>>25;indices[p]=slot>>4;alpha[p]=alphas[slot];rows[Math.floor(p/w)*(w+1)+1+p%w]=slot;rgba.set([...table.subarray(slot*3,slot*3+3),alpha[p]],p*4);}
 const current=palettePngBytes({w,h,colors,indices,alpha}), indexed=png(w,h,3,8,rows,[chunk('PLTE',table),chunk('tRNS',alphas)]);
 for(const [name,data] of [['keep-current.png',current],['keep-indexed-exact.png',indexed]]){fs.writeFileSync(`${dir}/${name}`,data);assert.deepEqual((await sharp(data).ensureAlpha().raw().toBuffer()),rgba);}
 results.cases.push({id:'keep-128-rgba-states',w,h,rgbaStates:128,currentBytes:current.length,exactIndexedBytes:indexed.length,reduction:1-indexed.length/current.length,exact:true});
}
// Every frame is opaque; a tiny patch moves on an unchanged background.
{
 const w=512,h=512,colors=['#173f4f','#efdfaa','#b65f34','#7fb570'];
 const frames=Array.from({length:32},(_,f)=>{const indices=new Uint16Array(w*h);for(let y=240;y<256;y++)for(let x=16+f*8;x<32+f*8;x++)indices[y*w+x]=1+(x+y)%3;return{indices,delay:100};});
 const current=await encodePaletteGif({w,h,colors,frames,loop:0});
 const buffer=new Uint8Array(current.length*2),writer=new omggif.GifWriter(buffer,w,h,{palette:colors.map(c=>parseInt(c.slice(1),16)),loop:0});
 frames.forEach((frame,f)=>{const x=f?16+(f-1)*8:0,y=f?240:0,width=f?24:w,height=f?16:h;const pixels=new Uint8Array(width*height);for(let py=0;py<height;py++)for(let px=0;px<width;px++)pixels[py*width+px]=frame.indices[(y+py)*w+x+px];writer.addFrame(x,y,width,height,pixels,{delay:10,disposal:1});});
 const delta=buffer.subarray(0,writer.end());
 const sourcePixels=Buffer.concat(frames.map(frame=>{const data=Buffer.alloc(w*h*4);frame.indices.forEach((v,p)=>{const rgb=parseInt(colors[v].slice(1),16);data.set([rgb>>16,rgb>>8&255,rgb&255,255],p*4);});return data;}));
 for(const [name,data] of [['motion-current.gif',current],['motion-delta-exact.gif',delta]]){fs.writeFileSync(`${dir}/${name}`,data);assert.deepEqual(await sharp(data,{animated:true}).ensureAlpha().raw().toBuffer(),sourcePixels);}
 results.cases.push({id:'sparse-opaque-motion',w,h,frames:frames.length,currentBytes:current.length,exactDeltaBytes:delta.length,reduction:1-delta.length/current.length,exact:true});
}
// Bound the probe to 16Mi frame-pixels, while showing current artwork admission.
{
 const w=512,h=512,count=64,buffer=new Uint8Array(1000000),writer=new omggif.GifWriter(buffer,w,h,{palette:[0,0xffffff],loop:0}),pixels=new Uint8Array(w*h);
 for(let f=0;f<count;f++)writer.addFrame(0,0,w,h,pixels,{delay:10,disposal:2});
 const bytes=buffer.subarray(0,writer.end());fs.writeFileSync(`${dir}/compressed-expansion.gif`,bytes);
 const decoded=decodeGif(bytes),input={frames:decoded.frames.map(frame=>({original:{width:w,height:h,data:frame.data},delay:frame.delay})),loop:decoded.loop};
 const analyzed=await analyzeImportFrames(input,'luma',128,{cooperative:false});
 let retainedBytes=0;for(const frame of analyzed.frames){const buffers=new Set([frame.original.data.buffer,...Object.values(frame.img).filter(v=>ArrayBuffer.isView(v)).map(v=>v.buffer)]);for(const data of buffers)retainedBytes+=data.byteLength;}
 results.cases.push({id:'compressed-animation-expansion',w,h,frames:count,inputBytes:bytes.length,sourceAndAnalysisBytes:retainedBytes,amplification:retainedBytes/bytes.length,admitted:true});
}
// An otherwise-valid animation using all 256 colors overall plus transparency,
// but only 128 opaque colors per frame, is representable with local GIF tables.
{
 const w=129,h=1,colors=Array.from({length:256},(_,i)=>'#'+(i*65536+(i*47%256)*256+31).toString(16).padStart(6,'0'));
 const frames=[0,128].map(base=>({indices:Uint16Array.from({length:w},(_,p)=>p===128?256:p+base),delay:100}));
 let error;try{await encodePaletteGif({w,h,colors,frames,loop:0});}catch(e){error={code:e.code,message:e.message};}
 const buffer=new Uint8Array(10000),writer=new omggif.GifWriter(buffer,w,h,{loop:0});
 for(const [f,frame]of frames.entries()){const table=[0,...colors.slice(f*128,f*128+128).map(c=>parseInt(c.slice(1),16))];while(table.length<256)table.push(0);writer.addFrame(0,0,w,h,Uint8Array.from({length:w},(_,p)=>p===128?0:p+1),{palette:table,delay:10,transparent:0,disposal:2});}
 const local=buffer.subarray(0,writer.end());fs.writeFileSync(`${dir}/local-palettes-representable.gif`,local);const decoded=decodeGif(local);assert.equal(decoded.frames.length,2);for(let f=0;f<2;f++)for(let p=0;p<128;p++){const rgb=parseInt(colors[f*128+p].slice(1),16);assert.deepEqual([...decoded.frames[f].data.subarray(p*4,p*4+4)],[rgb>>16,rgb>>8&255,rgb&255,255]);}
 const independent=await sharp(local,{animated:true}).ensureAlpha().raw().toBuffer();for(let f=0;f<2;f++){for(let p=0;p<128;p++){const rgb=parseInt(colors[f*128+p].slice(1),16),at=(f*w+p)*4;assert.deepEqual([...independent.subarray(at,at+4)],[rgb>>16,rgb>>8&255,rgb&255,255]);}assert.equal(independent[(f*w+128)*4+3],0);}
 results.cases.push({id:'256-global-plus-transparent',w,h,error,localTableBytes:local.length,exact:true});
}
fs.writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.cases,null,2));
