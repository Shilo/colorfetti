// Deterministic, local artwork for wall QA. No source or browser state is changed.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zlibSync } from 'fflate';
import { GifWriter } from 'omggif';

const folder = new URL('./fixtures/', import.meta.url);
const colors = [0x1d2b53, 0x29adff, 0x00e436, 0xffec27, 0xffa300, 0xff004d, 0x83769c, 0xfff1e8];
const glyphs = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
  ':':['000','010','000','010','000'], 'X':['101','101','010','101','101'],
};
const crcTable = Uint32Array.from({length:256}, (_,n) => {
  for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n;
});
function chunk(type, data) {
  const buffer=Buffer.alloc(data.length+12);buffer.writeUInt32BE(data.length);buffer.write(type,4);buffer.set(data,8);
  let crc=~0;for(const byte of buffer.subarray(4,-4))crc=crcTable[(crc^byte)&255]^(crc>>>8);
  buffer.writeUInt32BE(~crc>>>0,buffer.length-4);return buffer;
}
function png(w,h,transparent=false) {
  const pixels=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const index=(y*w+x)*4,c=colors[(Math.floor(x/Math.max(1,w/8))+Math.floor(y/Math.max(1,h/6)))%colors.length];
    pixels[index]=c>>>16;pixels[index+1]=c>>>8;pixels[index+2]=c;
    pixels[index+3]=transparent && (Math.floor(x/12)+Math.floor(y/12))%4===0?0:255;
    if(w>20&&h>20&&(x<3||y<3||x>=w-3||y>=h-3))pixels.set([255,241,232,255],index);
  }
  if(w>=48&&h>=24) {
    const label=`${w}X${h}`,scale=Math.max(1,Math.floor(Math.min((w-16)/(label.length*4),h/10)));
    const left=Math.floor((w-(label.length*4-1)*scale)/2),top=Math.floor((h-5*scale)/2);
    for(let y=top-scale;y<top+6*scale;y++)for(let x=left-scale;x<left+(label.length*4)*scale;x++)pixels.set([29,43,83,255],(y*w+x)*4);
    for(let c=0;c<label.length;c++)for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(glyphs[label[c]][y][x]==='1')
      for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)pixels.set([255,241,232,255],((top+y*scale+yy)*w+left+c*4*scale+x*scale+xx)*4);
  }
  const raw=new Uint8Array(h*(w*4+1));for(let y=0;y<h;y++)raw.set(pixels.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1);
  const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('sRGB',Uint8Array.of(0)),chunk('IDAT',zlibSync(raw)),chunk('IEND',new Uint8Array())]);
}
function gif(w,h) {
  const bytes=Buffer.alloc(w*h*4+4096),writer=new GifWriter(bytes,w,h,{loop:0,palette:colors});
  for(let frame=0;frame<3;frame++)writer.addFrame(0,0,w,h,Uint8Array.from({length:w*h},(_,i)=>(Math.floor(i%w/8)+Math.floor(i/w/8)+frame)%8),{delay:20});
  return bytes.subarray(0,writer.end());
}
export async function generateFixtures() {
  await mkdir(folder,{recursive:true});
  const dimensions=[['square',256,256],['landscape',320,240],['portrait',240,320],['widescreen',384,216],['phone',216,384],['banner',384,128],['column',128,384],['strip',512,64],['tower',64,512],['aurora',256,1],['vertical',1,256],['transparent',320,180],['tiny',1,1],['long-name',320,240]];
  const manifest=[];
  for(const[id,w,h]of dimensions) {
    const name=id==='long-name'?'a-very-long-artwork-filename-that-must-remain-readable-beside-complete-resolution-and-colors.png':`${id}-${w}x${h}.png`;
    await writeFile(new URL(name,folder),png(w,h,id==='transparent'));
    manifest.push({id,name,w,h,path:fileURLToPath(new URL(name,folder)),animated:false});
  }
  for(const[id,w,h]of [['animated-wide',192,64],['animated-tall',64,192]]) {
    const name=`${id}-${w}x${h}.gif`;await writeFile(new URL(name,folder),gif(w,h));
    manifest.push({id,name,w,h,path:fileURLToPath(new URL(name,folder)),animated:true});
  }
  await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await generateFixtures(),null,2));
