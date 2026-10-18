// Reproducible boundary audit; no application behavior or limits are changed.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { extractPalette, parsePaletteText } from '../../src/lib/palette-import.js';
import { normalizeColors, restoreLibrary, serializeLibrary } from '../../src/lib/palette-library.js';
import { parseLospecPalette } from '../../src/lib/palette-lospec.js';
import { preparePalette, quantize, colorize } from '../../src/lib/quantize.js';
import { palettePngBytes } from '../../src/lib/save.js';
import { encodePaletteGif } from '../../src/lib/gif.js';
import omggif from 'omggif';
const dir = fileURLToPath(new URL('.', import.meta.url));
// Independent decoder for the app's unfiltered indexed/RGBA exports.
function readPng(bytes) {
 const b=Buffer.from(bytes),chunks=new Map();
 for(let p=8;p<b.length;) {const n=b.readUInt32BE(p),body=b.subarray(p+4,p+8+n),type=body.toString('ascii',0,4);assert.equal(crc32(body),b.readUInt32BE(p+8+n));chunks.set(type,type==='IDAT'?Buffer.concat([chunks.get(type)||Buffer.alloc(0),body.subarray(4)]):body.subarray(4));p+=n+12;}
 const head=chunks.get('IHDR'),w=head.readUInt32BE(0),h=head.readUInt32BE(4),depth=head[8],type=head[9],row=Math.ceil(w*(type===6?32:depth)/8),raw=inflateSync(chunks.get('IDAT')),data=new Uint8ClampedArray(w*h*4);
 assert.ok(type===3||type===6);
 for(let y=0;y<h;y++){assert.equal(raw[y*(row+1)],0);for(let x=0;x<w;x++){const p=(y*w+x)*4;if(type===6)data.set(raw.subarray(y*(row+1)+1+x*4,y*(row+1)+5+x*4),p);else{const bit=x*depth,index=raw[y*(row+1)+1+(bit>>3)]>>(8-depth-(bit&7))&((1<<depth)-1);data.set(chunks.get('PLTE').subarray(index*3,index*3+3),p);data[p+3]=chunks.get('tRNS')?.[index]??255;}}}
 return {width:w,height:h,data,type,depth};
}
function source(n,empty=false) {const data=new Uint8ClampedArray((n+Number(empty))*4);for(let i=0;i<n;i++)data.set([i>>16,i>>8&255,i&255,255],i*4);return {width:n+Number(empty),height:1,data};}
const results=[];
for(const n of [32,64,255,256,257,512,4096,4097]) {
 const result=await extractPalette(source(n));assert.equal(result.total,n);assert.equal(result.colors.length,Math.min(n,4096));assert.equal(result.truncated,n>4096);assert.equal(result.overLimit,n>256);
 if(n<=256)assert.equal(preparePalette(result.colors).size,n);else assert.throws(()=>preparePalette(result.colors));
 if(n<=4096) {assert.equal(parsePaletteText(result.colors.join('\n')).length,n);if(n<=256)assert.equal(parseLospecPalette({colors:result.colors},'slso8').colors.length,n);else assert.throws(()=>parseLospecPalette({colors:result.colors},'slso8'),/1–256/);}
 results.push({colors:n,review:result.colors.length,truncated:result.truncated,activeAllowed:n<=256});
}
const p=Array.from({length:256},(_,i)=>'#'+i.toString(16).padStart(6,'0'));
assert.equal(normalizeColors([...p,...p]).length,256);
const valid={id:'user-boundary',revision:1,name:'Boundary',colors:p,source:{kind:'custom'}};
assert.equal(restoreLibrary(serializeLibrary([valid]))[0].colors.length,256);
assert.deepEqual(restoreLibrary(JSON.stringify({version:1,palettes:[{...valid,colors:[...p,'#ffffff']}]})),[]);
for(const empty of [false,true]) for(const metric of ['oklab','rgb']) {
 const input=source(256,empty),matched=quantize(input,p,128,undefined,undefined,{metric}),image={...matched,colors:p};
 assert.deepEqual(colorize(matched,p).data,input.data);
 const png=palettePngBytes(image),decoded=readPng(png);assert.deepEqual(decoded.data,input.data);assert.equal(decoded.type,empty?6:3);
 if(empty) await assert.rejects(encodePaletteGif({...image,frames:[{...matched,delay:100}]}),{code:'PALETTE_GIF_LIMIT'});
 else {const bytes=await encodePaletteGif({...image,frames:[{...matched,delay:100}]}),reader=new omggif.GifReader(bytes),rgba=new Uint8Array(256*4);reader.decodeAndBlitFrameRGBA(0,rgba);assert.deepEqual([...rgba],[...input.data]);}
}
const input255=source(255,true),match255=quantize(input255,p);
const gif255=await encodePaletteGif({...match255,colors:p,frames:[{...match255,delay:100}]});
const reader255=new omggif.GifReader(gif255),decoded255=new Uint8Array(256*4);reader255.decodeAndBlitFrameRGBA(0,decoded255);assert.deepEqual([...decoded255],[...input255.data]);
for(const [file,expected] of [['codex-all-256.png',256],['codex-cap-32.png',32]]) {
 const decoded=readPng(readFileSync(dir+file)),actual=await extractPalette(decoded);assert.equal(actual.total,expected);
 const cube=Array.from({length:256},(_,i)=>'#'+(Math.round((i>>6)*255/7)<<16|Math.round((i>>3&7)*255/7)<<8|Math.round((i&7)*255/7)).toString(16).padStart(6,'0'));
 assert.ok(actual.colors.every(c=>cube.includes(c)));results.push({browserDownload:file,uniqueRGB:actual.total});
}
const backup=parsePaletteText(readFileSync(dir+'codex-512-backup.hex','utf8'));assert.equal(backup.length,512);
const recovered=new omggif.GifReader(readFileSync(dir+'codex-recovered-255.gif'));
assert.equal(recovered.numFrames(),2);assert.equal(recovered.loopCount(),0);assert.equal(recovered.width,129);assert.equal(recovered.height,1);
const gifColors=new Set();
for(let f=0;f<2;f++) {assert.equal(recovered.frameInfo(f).delay,10);const rgba=new Uint8Array(129*4);recovered.decodeAndBlitFrameRGBA(f,rgba);for(let i=0;i<129;i++){assert.equal(rgba[i*4+3],i===128?0:255);if(i<128)gifColors.add(rgba[i*4]<<16|rgba[i*4+1]<<8|rgba[i*4+2]);}}
assert.equal(gifColors.size,255);results.push({browserRecoveredGIF:{frames:2,visibleColors:gifColors.size,delayMs:100,loop:0,transparentPixelPerFrame:1}});
results.push({backupColors:backup.length,opaqueGIF256:'exact',transparentGIF255:'exact',transparentGIF256:'explicit rejection',transparentPNG256:'exact RGBA fallback'});
writeFileSync(dir+'engine-results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
