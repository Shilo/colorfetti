import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {quantize,colorize} from '../../../src/lib/quantize.js';
import {FULL_PRESETS} from '../../../src/lib/palette-library.js';
import {selectPaletteSubset} from '../../../src/lib/palette-limit.js';
import {shown} from '../../../src/lib/layout.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE ?? 'sharp');
const here=path.dirname(fileURLToPath(import.meta.url));
const solid=(w,h,v)=>({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:v)});
const bw=['#000000','#ffffff'],gray=FULL_PRESETS.find(p=>p.id==='preset-gray8').colors;
const source=solid(1024,128,128),[mw,mh]=shown(1024,128,256),opts={dither:'4x4',ditherStrength:100};
const full=colorize(quantize(source,bw,128,undefined,undefined,opts),bw),preview=colorize(quantize(source,bw,128,mw,mh,opts),bw);
const capSource=solid(64,64,128),subsetResult=await selectPaletteSubset(gray,2,async function*(){yield{data:capSource.data,weight:1};}),subset=subsetResult.indices.map(i=>gray[i]);
const all=colorize(quantize(capSource,gray,128,undefined,undefined,{dither:'8x8',ditherStrength:100}),gray),cap=colorize(quantize(capSource,subset,128,undefined,undefined,{dither:'8x8',ditherStrength:100}),subset);
const png=im=>sharp(Buffer.from(im.data),{raw:{width:im.width??im.w,height:im.height??im.h,channels:4}}).png().toBuffer();
for(const[name,im]of [['longstrip-source',source],['longstrip-export',full],['longstrip-preview',preview],['cap-source',capSource],['cap-all',all],['cap-max2',cap]])fs.writeFileSync(path.join(here,name+'.png'),await png(im));
const cols=[30,370,710],images=[];
for(const [i,im]of [source,full,preview].entries())images.push({input:await sharp(await png(im)).extract({left:0,top:0,width:64,height:32}).resize(256,128,{kernel:'nearest'}).png().toBuffer(),left:cols[i],top:148});
for(const [i,im]of [capSource,all,cap].entries())images.push({input:await sharp(await png(im)).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:cols[i],top:409});
const text=(x,y,s,size=18,fill='#253246')=>`<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" fill="${fill}">${s}</text>`;
const svg=`<svg width="1040" height="684" xmlns="http://www.w3.org/2000/svg"><rect width="1040" height="684" fill="#f7f8fa"/>
${text(30,37,'Two reproducible conversion-quality interactions',26)}
${text(30,70,'Current production functions only. Oklab · Cut128 · Cleanup Off · Dither100%',15,'#536175')}
${text(30,106,'A. A long image can lose the dither in its wall preview',21)}
${text(30,131,'Actual shown(1024,128,256) →256×32. Native-pixel crops below are enlarged4×.',15,'#536175')}
${text(30,300,'Source #808080',19)}${text(370,300,'Full-resolution export',19)}${text(710,300,'Sampled wall preview',19)}
${text(30,324,'1024×128 original',15,'#536175')}${text(370,324,'4×4 pattern ·25% white',15,'#536175')}${text(710,324,'256×32 sampled ·0% white',15,'#536175')}
<line x1="30" y1="347" x2="1010" y2="347" stroke="#d8dce3"/>
${text(30,380,'B. Max2 can discard the second color needed by dithering',21)}
${text(30,403,'Grayscale8 ·8×8 pattern. Both settings permit a two-color result.',15,'#536175')}
${text(30,625,'Source #808080',19)}${text(370,625,'All:2 colors',19)}${text(710,625,'Max2:1 color',19)}
${text(30,649,'64×64 source enlarged3×',15,'#536175')}${text(370,649,'#6d6d6d + #929292',15,'#536175')}${text(710,649,'Only #929292; dither is inert',15,'#536175')}
</svg>`;
fs.writeFileSync(path.join(here,'diagnostic.png'),await sharp(Buffer.from(svg)).composite(images).png().toBuffer());
console.log(JSON.stringify({file:path.join(here,'diagnostic.png'),shown:[mw,mh],subset}));
