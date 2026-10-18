import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import omggif from 'omggif';
import { decodeGif } from '../../../src/lib/gif.js';
const require=createRequire(import.meta.url),sharpPath=process.env.SHARP_MODULE ?? 'sharp',sharp=require(sharpPath);
const results=[];
for(const id of ['animation128','animation256'])for(const quality of ['nearest','enhanced']){
 const file=`bench/practical-workloads-2026-10-16/desktop/${id}/${quality}.gif`,bytes=fs.readFileSync(file),source=decodeGif(bytes),{width:w,height:h}=source;
 const colors=new Map();for(const frame of source.frames)for(let p=0;p<frame.data.length;p+=4)if(frame.data[p+3]){const rgb=frame.data[p]*65536+frame.data[p+1]*256+frame.data[p+2];if(!colors.has(rgb))colors.set(rgb,colors.size+1);}
 const table=[0,...colors.keys()];let len=2;while(len<table.length)len*=2;while(table.length<len)table.push(0);
 const buffer=new Uint8Array(bytes.length*2),writer=new omggif.GifWriter(buffer,w,h,{palette:table,loop:source.loop??undefined});
 for(const frame of source.frames){let left=w,top=h,right=0,bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(frame.data[(y*w+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}if(!right){left=top=0;right=bottom=1;}
  const pw=right-left,ph=bottom-top,indices=new Uint8Array(pw*ph);for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const p=(y*w+x)*4;if(frame.data[p+3])indices[(y-top)*pw+x-left]=colors.get(frame.data[p]*65536+frame.data[p+1]*256+frame.data[p+2]);}
  writer.addFrame(left,top,pw,ph,indices,{transparent:0,disposal:2,delay:Math.round(frame.delay/10)});
 }
 const out=buffer.subarray(0,writer.end());fs.writeFileSync(`${import.meta.dirname}/${id}-${quality}-trim.gif`,out);
 const [a,b]=await Promise.all([sharp(bytes,{animated:true}).ensureAlpha().raw().toBuffer(),sharp(out,{animated:true}).ensureAlpha().raw().toBuffer()]);
 const [ma,mb]=await Promise.all([sharp(bytes,{animated:true}).metadata(),sharp(out,{animated:true}).metadata()]);for(const key of ['width','height','pageHeight','pages','loop','delay'])assert.deepEqual(ma[key],mb[key]);
 let visibleExact=true;for(let p=0;p<a.length;p+=4){if(a[p+3]!==b[p+3]||a[p+3]&&[0,1,2].some(c=>a[p+c]!==b[p+c])){visibleExact=false;break;}}assert(visibleExact);
 results.push({file,width:w,height:h,frames:source.frames.length,currentBytes:bytes.length,trimBytes:out.length,reduction:1-out.length/bytes.length,visibleExact,metadataExact:true});
}
fs.writeFileSync(`${import.meta.dirname}/real-gif-trim.json`,JSON.stringify({node:process.version,oracle:{module:require.resolve(sharpPath),versions:sharp.versions},cases:results},null,2));console.log(JSON.stringify(results,null,2));
