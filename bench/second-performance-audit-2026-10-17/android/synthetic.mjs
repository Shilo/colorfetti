// Deterministic owned diagnostic fixtures; no source artwork or external services.
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {sharp,sha,decode} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {GifWriter} from 'omggif';
const out=path.join(import.meta.dirname,'fixtures');await mkdir(out,{recursive:true});
const records=[];
for(const[id,w,h,pixel]of[
 ['transparent32',32,32,()=>[0,0,0,0]],
 ['silhouette32',32,32,(x,y)=>[255,255,255,x>4&&x<27&&y>3&&y<28?255:0]],
 ['partial-glow64',64,64,(x,y)=>{const a=Math.max(0,Math.round(255-8*Math.hypot(x-31.5,y-31.5)));return[200+(x%3),80+(y%5),220,a]}],
 ['entropy512',512,512,(x,y)=>{let v=(x+y*512+1)>>>0;v^=v<<13;v^=v>>>17;v^=v<<5;return[v&255,(v>>>8)&255,(v>>>16)&255,255]}],
 ['boundary4096',64,64,(x,y)=>{const v=x+y*64;return[v&255,v>>>8,0,255]}],
 ['boundary4097',65,65,(x,y)=>{const v=Math.min(4096,x+y*65);return[v&255,v>>>8,0,255]}],
]){const data=Uint8Array.from({length:w*h*4},(_,i)=>pixel((i>>2)%w,Math.floor((i>>2)/w))[i%4]);const bytes=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer();const file=path.join(out,id+'.png');await writeFile(file,bytes);records.push({id,file:path.relative(import.meta.dirname,file).replaceAll('\\','/'),sha256:sha(bytes),width:w,height:h,frames:1,source:'owned deterministic synthetic diagnostic',algorithm:pixel.toString()});}
if(process.argv.includes('--overbudget')){
 const parent=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16/fixtures/kenney-motion-256.gif'),sourceBytes=await readFile(parent),source=await decode(sourceBytes),w=384,h=384;
 const colors=[0],indexes=new Map();for(const frame of source.frames)for(let p=0;p<frame.length;p+=4)if(frame[p+3]){const key=(frame[p]<<16)|(frame[p+1]<<8)|frame[p+2];if(!indexes.has(key)){indexes.set(key,colors.length);colors.push(key)}}
 if(colors.length>256)throw Error('Fixture has too many colors');while(colors.length&(colors.length-1))colors.push(0);
 const buffer=new Uint8Array(w*h*source.frames.length*2),writer=new GifWriter(buffer,w,h,{palette:colors,loop:source.loop});
 source.frames.forEach((frame,i)=>{const data=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(Math.floor(y*source.h/h)*source.w+Math.floor(x*source.w/w))*4;if(frame[p+3])data[y*w+x]=indexes.get((frame[p]<<16)|(frame[p+1]<<8)|frame[p+2])}writer.addFrame(0,0,w,h,data,{delay:source.delay[i]/10,transparent:0,disposal:2})});const bytes=buffer.subarray(0,writer.end());await writeFile(path.join(out,'motion384-overbudget.gif'),bytes);records.push({id:'motion384-overbudget',file:'fixtures/motion384-overbudget.gif',sha256:sha(bytes),width:w,height:h,frames:source.frames.length,delay:source.delay,loop:source.loop,nominalIndexBytes:w*h*source.frames.length*2,source:'CC0 practical motion assembly nearest-resized256to384; unequal source delays/loop retained',parentSha256:sha(sourceBytes)});
}
await writeFile(path.join(out,'manifest.json'),JSON.stringify({license:'CC0-1.0; generated for this audit',records},null,2)+'\n');
