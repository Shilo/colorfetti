import {mkdirSync,writeFileSync} from 'node:fs';
import omggif from 'omggif';
import {palettePngBytes} from '../../../src/lib/save.js';
const dir='bench/conversion-fixes-2026-10-18/m2';mkdirSync(dir,{recursive:true});
for(const [name,w,h] of [['gray-2048',2048,2048],['gray-alias',1024,128],['gray-oversize',2049,2048],['gray-long-sheet',16384,8]]){
  const indices=new Uint16Array(w*h);
  writeFileSync(`${dir}/${name}.png`,palettePngBytes({w,h,colors:['#808080'],indices}));
}
const storage=new Uint8Array(20*1024*1024),writer=new omggif.GifWriter(storage,1024,1024,{palette:[0x808080,0x000000,0xffffff,0xff004d],loop:0});
for(let n=0;n<20;n++){const indices=new Uint8Array(1024*1024);for(let y=0;y<32;y++)indices.fill(n%3+1,y*1024+n*32,y*1024+n*32+32);writer.addFrame(0,0,1024,1024,indices,{delay:20,disposal:1});}
writeFileSync(`${dir}/gray-20frames.gif`,storage.slice(0,writer.end()));
console.log('Created native-inspection fixture PNGs and 20-frame GIF.');
