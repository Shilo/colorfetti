import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import omggif from 'omggif';
import {decodeGif,encodePaletteGif} from '../../../src/lib/gif.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE??'sharp');
const rows=[];
async function check(id,image,inputBytes){
 const current=await encodePaletteGif(image);
 const table=[0,...image.colors.map(c=>parseInt(c.slice(1),16))],tableSize=2**Math.ceil(Math.log2(Math.max(2,table.length)));
 while(table.length<tableSize)table.push(0);
 const storage=new Uint8Array(current.length*3+4096),writer=new omggif.GifWriter(storage,image.w,image.h,{palette:table,...(image.loop==null?{}:{loop:image.loop})});
 for(const frame of image.frames){let left=image.w,top=image.h,right=-1,bottom=-1;for(let y=0;y<image.h;y++)for(let x=0;x<image.w;x++)if(frame.indices[y*image.w+x]!==256){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<0){left=top=right=bottom=0;}
  const w=right-left+1,h=bottom-top+1,indices=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const index=frame.indices[(top+y)*image.w+left+x];indices[y*w+x]=index===256?0:index+1;}
  writer.addFrame(left,top,w,h,indices,{transparent:0,disposal:2,delay:Math.round(frame.delay/10)});
 }
 const cropped=storage.subarray(0,writer.end());
 const [a,b,ma,mb]=await Promise.all([sharp(current,{animated:true}).ensureAlpha().raw().toBuffer(),sharp(cropped,{animated:true}).ensureAlpha().raw().toBuffer(),sharp(current,{animated:true}).metadata(),sharp(cropped,{animated:true}).metadata()]);
 assert.equal(a.length,b.length);for(let p=0;p<a.length;p+=4){assert.equal(a[p+3],b[p+3]);if(a[p+3])assert.deepEqual(a.subarray(p,p+3),b.subarray(p,p+3));}
 for(const key of ['width','height','pages','pageHeight','delay','loop'])assert.deepEqual(ma[key],mb[key]);
 if(inputBytes){
  const original=await sharp(inputBytes,{animated:true}).ensureAlpha().raw().toBuffer(),metadata=await sharp(inputBytes,{animated:true}).metadata();
  assert.equal(original.length,a.length);for(let p=0;p<a.length;p+=4){assert.equal(original[p+3],a[p+3]);if(a[p+3])assert.deepEqual(original.subarray(p,p+3),a.subarray(p,p+3));}
  for(const key of ['width','height','pages','pageHeight','delay','loop'])assert.deepEqual(metadata[key],ma[key]);
 }
 writeFileSync(new URL(`${id}-full.gif`,import.meta.url),current);writeFileSync(new URL(`${id}-crop.gif`,import.meta.url),cropped);
 rows.push({id,originalWorkloadBytes:inputBytes?.length??null,currentWriterEqualsWorkloadBytes:inputBytes?Buffer.from(current).equals(inputBytes):null,currentWriterBytes:current.length,croppedBytes:cropped.length,reduction:1-cropped.length/current.length,visibleRgbExact:true,allAlphaExact:true,metadataExact:true});
}
for(const name of ['animation128','animation256'])for(const mode of ['nearest','enhanced']){
 const bytes=readFileSync(`bench/practical-workloads-2026-10-16/desktop/${name}/${mode}.gif`),source=decodeGif(bytes),colors=[],lookup=new Map();
 const frames=source.frames.map(frame=>({delay:frame.delay,indices:Uint16Array.from({length:source.width*source.height},(_,p)=>{const at=p*4;if(!frame.data[at+3])return 256;const rgb=frame.data[at]*65536+frame.data[at+1]*256+frame.data[at+2];if(!lookup.has(rgb)){lookup.set(rgb,colors.length);colors.push('#'+rgb.toString(16).padStart(6,'0'));}return lookup.get(rgb);})}));
 await check(`${name}-${mode}`,{w:source.width,h:source.height,colors,frames,loop:source.loop},bytes);
}
for(const emptyFirst of [false,true]){
 const w=16,h=12,rect=(x,y,rw,rh,c)=>{const indices=new Uint16Array(w*h).fill(256);for(let dy=0;dy<rh;dy++)for(let dx=0;dx<rw;dx++)indices[(y+dy)*w+x+dx]=c;return indices;};
 const frames=[{indices:emptyFirst?rect(0,0,0,0,0):rect(1,1,4,4,0),delay:20},{indices:rect(0,0,0,0,0),delay:100},{indices:rect(15,11,1,1,1),delay:200},{indices:rect(0,0,2,2,0),delay:30}];
 await check(`boundary-empty-first-${emptyFirst}`,{w,h,colors:['#dd2200','#00bbaa'],frames,loop:2});
}
writeFileSync(new URL('crop-results.json',import.meta.url),JSON.stringify({node:process.version,oracle:sharp.versions,cases:rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
