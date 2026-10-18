import { quantize } from '../../src/lib/quantize.js';
// 512x512 horizontal gray ramp, black/white palette, 4x4 dither, previewed at 128 (4x down)
const W=512,H=512,data=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4,v=Math.round(x*255/(W-1));data[p]=data[p+1]=data[p+2]=v;data[p+3]=255;}
const img={width:W,height:H,data};
for (const [mw,label] of [[512,'export'],[128,'preview 4x'],[170,'preview 3x']]) {
  const r=quantize(img,['#000000','#FFFFFF'],128,mw,mw,{dither:'4x4',ditherStrength:100});
  // fraction of white per column-band of 8 equal bands
  const bands=[];for(let b=0;b<8;b++){let w=0,n=0;for(let y=0;y<r.h;y++)for(let x=Math.floor(b*r.w/8);x<Math.floor((b+1)*r.w/8);x++){n++;w+=r.indices[y*r.w+x]===1;}bands.push((w/n).toFixed(2));}
  console.log(label.padEnd(12),bands.join(' '));
}
