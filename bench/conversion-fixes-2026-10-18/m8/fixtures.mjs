import{zlibSync}from'fflate';
export function sizeGateFixture(){let seed=41;return{w:49,h:1,colors:['#c1482e'],indices:new Uint16Array(49),
  alpha:Uint8Array.from({length:49},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return 1+(seed>>>24)%2;})};}
export function legacyGateFixture(tie=false){let seed=tie?7:8;const w=3,h=tie?1025:257;return{w,h,first:null,second:'#abcdef',
  mask:Uint8Array.from({length:w*h},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed>>>31)*2;})};}
export function keepFixture(){const w=512,h=512,colors=Array.from({length:8},(_,i)=>'#'+((32+i*29)*65536+(37+i*17)*256+44+i*19).toString(16).padStart(6,'0')),
  indices=new Uint16Array(w*h),alpha=new Uint8Array(w*h);let seed=42;
  for(let p=0;p<indices.length;p++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const state=seed>>>25;indices[p]=state>>4;alpha[p]=1+(state%16)*16;}
  return{w,h,colors,indices,alpha};}
export function boundaryFixture(count){const w=65,h=65,indices=new Uint16Array(w*h),alpha=new Uint8Array(w*h);let seed=77;
  for(let p=0;p<indices.length;p++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const state=p<count?p:(seed>>>16)%count;
    if(!state){indices[p]=256;alpha[p]=0;}else if(state<=255){indices[p]=0;alpha[p]=state;}else{indices[p]=1;alpha[p]=1;}}
  return{w,h,colors:['#c1482e','#267ae1'],indices,alpha};}
export function legacyFixture(kind='opaque',w=256,h=256){let seed=741;const mask=Uint8Array.from({length:w*h},(_,p)=>{
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;return kind==='opaque'?1+(seed>>>31):p%3;});
  return{w,h,first:kind==='none'?null:'#193c58',second:'#e4ddae',mask};}
export function legacyAsPalette(image){return{w:image.w,h:image.h,colors:[image.first??image.second,image.second??image.first],
  indices:Uint16Array.from(image.mask,role=>role===0||role===1&&!image.first||role===2&&!image.second?256:role-1)};}
function chunk(type,data){const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);view.setUint32(0,data.length);out.set(new TextEncoder().encode(type),4);out.set(data,8);
  let crc=~0;for(let p=4;p<out.length-4;p++){crc^=out[p];for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}view.setUint32(out.length-4,~crc>>>0);return out;}
export function rgbaOf(image){const rgba=new Uint8Array(image.w*image.h*4);for(let p=0;p<image.indices.length;p++){if(image.indices[p]===256)continue;const rgb=parseInt(image.colors[image.indices[p]].slice(1),16);rgba.set([rgb>>16,rgb>>8&255,rgb&255,image.alpha?.[p]??255],p*4);}return rgba;}
export function sourcePng(image){const head=new Uint8Array(13),view=new DataView(head.buffer);view.setUint32(0,image.w);view.setUint32(4,image.h);head.set([8,6,0,0,0],8);
  const rgba=rgbaOf(image),stride=image.w*4+1,rows=new Uint8Array(stride*image.h);for(let y=0;y<image.h;y++)rows.set(rgba.subarray(y*image.w*4,(y+1)*image.w*4),y*stride+1);
  const parts=[Uint8Array.of(137,80,78,71,13,10,26,10),chunk('IHDR',head),chunk('sRGB',Uint8Array.of(0)),chunk('IDAT',zlibSync(rows,{level:3})),chunk('IEND',new Uint8Array(0))],out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
