import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import omggif from 'omggif';
import {decodeGif,encodePaletteGif} from '../../../src/lib/gif.js';
import {analyze,unify,mask,spritesOf} from '../../../src/lib/recolor.js';
import {defaults} from '../../../src/lib/settings.js';
import {pngBytes,palettePngBytes} from '../../../src/lib/save.js';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE??'sharp');
const result={node:process.version,oracle:sharp.versions,cases:[]};
const put=(name,bytes)=>writeFileSync(new URL(name,import.meta.url),bytes);
const inspect=bytes=>{try{const gif=decodeGif(bytes);return{accepted:true,width:gif.width,height:gif.height,loop:gif.loop,frames:gif.frames.length};}catch(e){return{accepted:false,code:e.code??null,message:e.message};}};
// Identical extension payload; only the recognized 11-byte identifier changes.
{
 const storage=new Uint8Array(4096),writer=new omggif.GifWriter(storage,2,1,{palette:[0,0xffffff],loop:2});
 writer.addFrame(0,0,2,1,Uint8Array.of(0,1),{delay:10,disposal:2});
 writer.addFrame(0,0,2,1,Uint8Array.of(1,0),{delay:20,disposal:2});
 const netscape=Buffer.from(storage.subarray(0,writer.end())),animexts=Buffer.from(netscape),at=netscape.indexOf('NETSCAPE2.0');
 assert(at>=0);animexts.write('ANIMEXTS1.0',at,'ascii');
 const [nm,am]=await Promise.all([sharp(netscape,{animated:true}).metadata(),sharp(animexts,{animated:true}).metadata()]);
 assert.equal(am.loop,nm.loop);assert.equal(inspect(netscape).loop,2);assert.equal(inspect(animexts).loop,null);
 assert.deepEqual(await sharp(netscape,{animated:true}).ensureAlpha().raw().toBuffer(),await sharp(animexts,{animated:true}).ensureAlpha().raw().toBuffer());
 const out=await encodePaletteGif({w:2,h:1,colors:['#000000','#ffffff'],loop:decodeGif(animexts).loop,frames:[{indices:Uint16Array.of(0,1),delay:100},{indices:Uint16Array.of(1,0),delay:200}]});
 const om=await sharp(out,{animated:true}).metadata();assert.notEqual(am.loop,om.loop);
 put('netscape.gif',netscape);put('animexts.gif',animexts);put('animexts-export.gif',out);
 result.cases.push({id:'animexts-repeat-loss',appNetscapeRepeat:inspect(netscape).loop,appAnimextsRepeat:inspect(animexts).loop,independentNetscapeTotalPlays:nm.loop,independentAnimextsTotalPlays:am.loop,independentExportTotalPlays:om.loop,visibleSourcePixelsEqual:true});
 const zero=Buffer.from(netscape);zero[6]=zero[7]=0;put('zero-width.gif',zero);const invalid=inspect(zero);assert.equal(invalid.accepted,false);result.cases.push({id:'zero-logical-width-message',...invalid});
}
// Missing EOI despite complete output and well-formed data sub-block framing.
{
 const missing=Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,44,0,0,0,0,1,0,1,0,0,2,1,12,0,59]);
 const good=Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,44,0,0,0,0,1,0,1,0,0,2,2,76,1,0,59]);
 assert.equal(inspect(good).accepted,true);const rejected=inspect(missing);assert.equal(rejected.code,'GIF_INVALID');
 let independent;try{const raw=await sharp(missing).ensureAlpha().raw().toBuffer();independent={accepted:true,rgba:[...raw]};}catch(e){independent={accepted:false,message:e.message};}
 put('missing-eoi.gif',missing);result.cases.push({id:'strict-missing-eoi',app:rejected,independent});
}
// An out-of-screen patch is malformed even if a tolerant viewer can crop it.
{
 const storage=new Uint8Array(4096),writer=new omggif.GifWriter(storage,2,1,{palette:[0,0xffffff]});writer.addFrame(0,0,2,1,Uint8Array.of(0,1),{delay:10});
 const bytes=Buffer.from(storage.subarray(0,writer.end()));bytes[6]=1;
 const app=inspect(bytes);assert.equal(app.code,'GIF_INVALID');let independent;
 try{const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});independent={accepted:true,width:info.width,height:info.height,rgba:[...data]};}catch(e){independent={accepted:false,message:e.message};}
 put('oversized-patch.gif',bytes);result.cases.push({id:'strict-outside-screen',app,independent});
}
// Unchanged subject region, while unrelated opaque pixels change histogram.
{
 const w=20,h=20,originals=[0,1].map(f=>{const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const subject=x>=8&&x<16&&y>=8&&y<16;const value=subject?80:f&&(x<8||y<4)?20:180;data.set([value,value,value,255],(y*w+x)*4);}return{width:w,height:h,data};});
 const frames=originals.map(frame=>analyze(frame));unify(frames);const options=defaults('stencil'),masks=frames.map(frame=>mask(frame,'stencil',options));
 let changedSubject=0;for(let y=8;y<16;y++)for(let x=8;x<16;x++){const p=y*w+x;assert.deepEqual(originals[0].data.subarray(p*4,p*4+4),originals[1].data.subarray(p*4,p*4+4));changedSubject+=masks[0][p]!==masks[1][p];}
 assert.equal(changedSubject,64);const solid=frames.map(frame=>mask(frame,'solid',defaults('solid')));let solidChanges=0;for(let y=8;y<16;y++)for(let x=8;x<16;x++)solidChanges+=solid[0][y*w+x]!==solid[1][y*w+x];assert.equal(solidChanges,0);
 const p=8*w+8;result.cases.push({id:'stencil-unchanged-subject-flips',options,subjectPixels:64,changedSubject,solidChanges,sharedAuto:frames.map(f=>f.auto),spriteAuto:frames.map(f=>spritesOf(f).auto[p]),spriteMedian:frames.map(f=>spritesOf(f).body[p]),sourceContract:'Stencil is excluded from general threshold section; frame-local sprites are an explicit design exception.'});
 for(let f=0;f<2;f++){put(`stencil-source-${f}.png`,await sharp(Buffer.from(originals[f].data),{raw:{width:w,height:h,channels:4}}).png().toBuffer());put(`stencil-output-${f}.png`,pngBytes({w,h,first:'#000000',second:'#ffffff',mask:masks[f]}));}
}
// Real writer comparison for opaque two-color output: no palette quantization.
for(const pattern of ['flat','checker','random']){
 const w=256,h=256;let seed=741;const m=Uint8Array.from({length:w*h},(_,p)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return pattern==='flat'?1:pattern==='checker'?1+((p%w+Math.floor(p/w))%2):1+(seed>>>31);});
 const current=pngBytes({w,h,first:'#172a3a',second:'#ebf4dd',mask:m}),compact=palettePngBytes({w,h,colors:['#172a3a','#ebf4dd'],indices:Uint16Array.from(m,v=>v-1)});
 assert.deepEqual(await sharp(current).ensureAlpha().raw().toBuffer(),await sharp(compact).ensureAlpha().raw().toBuffer());
 const chunks=bytes=>{const names=[];for(let p=8;p<bytes.length;){const size=Buffer.from(bytes).readUInt32BE(p);names.push(Buffer.from(bytes).subarray(p+4,p+8).toString());p+=size+12;}return names;};
 result.cases.push({id:'onebit-index-compaction',pattern,currentBytes:current.length,compactBytes:compact.length,reduction:1-compact.length/current.length,currentDepth:current[24],compactDepth:compact[24],currentSrgb:chunks(current).includes('sRGB'),compactSrgb:chunks(compact).includes('sRGB'),rgbaExact:true});
}
result.sourceSHA256=Object.fromEntries(['src/lib/gif.js','src/lib/gif-decode.js','src/lib/recolor.js','src/lib/save.js'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
put('io-stencil-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.cases,null,2));
