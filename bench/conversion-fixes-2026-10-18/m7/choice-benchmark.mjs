import omggif from 'omggif';
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync}from'node:fs';
import{performance}from'node:perf_hooks';
import{decodeGif}from'../../../src/lib/gif.js';
import{gifFrameBounds}from'../../../src/lib/gif-frame-bounds.js';
export function choiceEncode(image, choose = true, maxAreaRatio = .75) {
  let storage=new Uint8Array(1024),writer=new omggif.GifWriter(storage,image.w,image.h,{palette:image.table,loop:image.loop??undefined});
  let candidates=0,selected=0,maxCrop=0,maxExtraEncodedCapacity=0,maxCapacity=storage.length,growths=0;
  const reserve=need=>{if(need>storage.length){const grown=new Uint8Array(Math.max(need,storage.length*2));grown.set(storage.subarray(0,writer.getOutputBufferPosition()));storage=grown;writer.setOutputBuffer(storage);growths++;maxCapacity=Math.max(maxCapacity,storage.length);}};
  for(const frame of image.frames){
    const crop=choose?gifFrameBounds(frame.indices,image.w,image.h,image.transparent,Math.max(1,Math.floor(image.w*image.h*maxAreaRatio))):{x:0,y:0,w:image.w,h:image.h,indices:frame.indices};
    const candidate=crop.w*crop.h<image.w*image.h&&crop.w*crop.h<=image.w*image.h*maxAreaRatio,start=writer.getOutputBufferPosition();
    const options={disposal:2,delay:frame.delay/10,...(image.transparent===null?{}:{transparent:image.transparent})};
    const extra=candidate?crop.w*crop.h*2+1024:0;
    reserve(start+image.w*image.h*2+1024);
    writer.addFrame(0,0,image.w,image.h,frame.indices,options);
    if(candidate){
      candidates++;maxCrop=Math.max(maxCrop,crop.indices.byteLength);maxExtraEncodedCapacity=Math.max(maxExtraEncodedCapacity,extra);
      const fullEnd=writer.getOutputBufferPosition();
      reserve(fullEnd+crop.w*crop.h*2+1024);
      writer.addFrame(crop.x,crop.y,crop.w,crop.h,crop.indices,options);
      const cropEnd=writer.getOutputBufferPosition(),cropBytes=cropEnd-fullEnd;
      if(cropBytes<fullEnd-start){storage.copyWithin(start,fullEnd,cropEnd);writer.setOutputBufferPosition(start+cropBytes);selected++;}
      else writer.setOutputBufferPosition(fullEnd);
    }
  }
  return{bytes:storage.slice(0,writer.end()),candidates,selected,maxCrop,maxExtraEncodedCapacity,maxCapacity,growths};
}
function imageFromGif(bytes){
  const source=decodeGif(bytes),colors=[],map=new Map();
  const frames=source.frames.map(f=>({delay:f.delay,indices:Uint8Array.from({length:source.width*source.height},(_,p)=>{
    const at=p*4;if(!f.data[at+3])return 0;
    const rgb=f.data[at]*65536+f.data[at+1]*256+f.data[at+2];
    if(!map.has(rgb)){map.set(rgb,colors.length+1);colors.push(rgb);}return map.get(rgb);
  })}));
  const table=[0,...colors];while(table.length&(table.length-1))table.push(0);
  return{w:source.width,h:source.height,loop:source.loop,table,transparent:0,frames};
}
const cases=[];
for(const name of['animation128','animation256'])for(const mode of['nearest','enhanced'])cases.push({id:name+'-'+mode,
  image:imageFromGif(readFileSync(`bench/practical-workloads-2026-10-16/desktop/${name}/${mode}.gif`))});
cases.push({id:'known-size-regression',image:{w:4,h:4,table:[0,0xffffff],transparent:0,loop:2,
  frames:[{indices:Uint8Array.from([0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0]),delay:100}]}});
cases.push({id:'dense-opaque256',image:{w:256,h:256,table:Array.from({length:256},(_,i)=>i*65793),transparent:null,loop:0,
  frames:Array.from({length:8},(_,f)=>({indices:Uint8Array.from({length:65536},(_,p)=>(p*17+f*13)%256),delay:100}))}});
cases.push({id:'dense-with-one-transparent-row',image:{w:256,h:256,table:Array.from({length:256},(_,i)=>i*65793),transparent:0,loop:0,
  frames:Array.from({length:8},(_,f)=>({indices:Uint8Array.from({length:65536},(_,p)=>p>=65280?0:1+(p*17+f*13)%255),delay:100}))}});
cases.push({id:'1000-moving-sparse-frames',image:{w:128,h:128,table:[0,0xffffff],transparent:0,loop:2,
  frames:Array.from({length:1000},(_,f)=>{const indices=new Uint8Array(16384);indices[(f*1717)%16384]=1;return{indices,delay:100};})}});
const rows=[];
const allocationOnly=process.argv.includes('--allocation-only');
for(const{id,image}of cases){
  for(let i=0;i<(allocationOnly?0:3);i++){choiceEncode(image,false);choiceEncode(image,true);}
  const times=[[],[]];
  for(let sample=0;sample<(allocationOnly?0:11);sample++)for(const choose of(sample%2?[true,false]:[false,true])){
    const start=performance.now();choiceEncode(image,choose);times[Number(choose)].push(performance.now()-start);
  }
  const baseline=choiceEncode(image,false),choice=choiceEncode(image,true),threshold=choiceEncode(image,true,.75);
  assert(choice.bytes.length<=baseline.bytes.length);
  assert.deepEqual(decodeGif(choice.bytes),decodeGif(baseline.bytes));
  const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
  rows.push({id,fullBytes:baseline.bytes.length,choiceBytes:choice.bytes.length,fullMedianMs:median(times[0]),choiceMedianMs:median(times[1]),
    cpuRatio:median(times[1])/median(times[0]),candidates:choice.candidates,selected:choice.selected,
    maxCroppedPixelBytes:choice.maxCrop,maxExtraEncodedCapacity:choice.maxExtraEncodedCapacity,
    fullMaxOutputCapacity:baseline.maxCapacity,choiceMaxOutputCapacity:choice.maxCapacity,fullGrowths:baseline.growths,choiceGrowths:choice.growths,
    atMost75PercentArea:{bytes:threshold.bytes.length,candidates:threshold.candidates,selected:threshold.selected,maxOutputCapacity:threshold.maxCapacity},rawMs:times});
}
writeFileSync(new URL(allocationOnly?'choice-allocation-final-results.json':'choice-benchmark-results.json',import.meta.url),JSON.stringify({node:process.version,allocationOnly,cases:rows},null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
