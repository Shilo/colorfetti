import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import omggif from 'omggif';
const dir = '.tmp/high-color-stress/fixtures'; mkdirSync(dir,{recursive:true});
function chunk(type,data) {const body=Buffer.concat([Buffer.from(type),data]),out=Buffer.alloc(body.length+8);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),body.length+4);return out;}
function png(name,colors,{scale=1,transparent=false}={}) {
 const cols=Math.min(32,colors.length),rows=Math.ceil(colors.length/cols),w=cols*scale,h=rows*scale+(transparent?1:0);
 const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head.set([8,6,0,0,0],8);
 const pixels=Buffer.alloc((w*4+1)*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++) {const c=colors[Math.min(colors.length-1,Math.floor(y/scale)*cols+Math.floor(x/scale))],at=y*(w*4+1)+1+x*4;pixels.set([c>>16,c>>8&255,c&255,transparent&&y===h-1?0:255],at);}
 writeFileSync(`${dir}/${name}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('sRGB',Buffer.from([0])),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
// An exact 8x8x8 RGB cube: 512 unique colors, no antialiasing/profile ambiguity.
const cube=Array.from({length:512},(_,i)=>Math.round((i>>6)*255/7)<<16|Math.round((i>>3&7)*255/7)<<8|Math.round((i&7)*255/7));
for(const n of [255,256,257,512]) {const colors=cube.slice(0,n);png(`cube-${n}`,colors);png(`cube-${n}-patches`,colors,{scale:4});writeFileSync(`${dir}/cube-${n}.hex`,colors.map(c=>c.toString(16).padStart(6,'0')).join('\n'));}
png('cube-256-transparent',cube.slice(0,256),{transparent:true});
for(const n of [4096,4097]) png(`unique-${n}`,Array.from({length:n},(_,i)=>i));
// Each GIF frame uses 128 opaque colors + transparency, but the clip uses 256.
const bytes=new Uint8Array(16384),table=values=>[...values,...Array(128).fill(0)];
const writer=new omggif.GifWriter(bytes,129,1,{loop:0,palette:table(cube.slice(0,128))});
const indices=Uint8Array.from({length:129},(_,i)=>i);
writer.addFrame(0,0,129,1,indices,{delay:10,disposal:2,transparent:128});
writer.addFrame(0,0,129,1,indices,{delay:10,disposal:2,transparent:128,palette:table(cube.slice(128,256))});
writeFileSync(`${dir}/cube-256-transparent.gif`,bytes.subarray(0,writer.end()));
console.log('Created deterministic palette PNG/HEX fixtures.');
