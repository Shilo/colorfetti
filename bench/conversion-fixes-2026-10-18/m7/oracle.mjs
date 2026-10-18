import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import omggif from 'omggif';
import { unzipSync } from 'fflate';
import { encodeGif, encodeGifAsync, encodePaletteGif, decodeGif } from '../../../src/lib/gif.js';
import { exportPalette, markUsed, compactTable } from '../../../src/lib/palette-export.js';
import { imageFixture, legacyFixture, sourceGif } from './fixtures.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const report={node:process.version,oracle:sharp.versions,cases:[],actualUI:[]};
const path=name=>new URL(name,import.meta.url);
async function compare(id,baseline,output){
  const [a,b,ma,mb]=await Promise.all([sharp(baseline,{animated:true}).ensureAlpha().raw().toBuffer(),sharp(output,{animated:true}).ensureAlpha().raw().toBuffer(),
    sharp(baseline,{animated:true}).metadata(),sharp(output,{animated:true}).metadata()]);
  assert.equal(a.length,b.length,id);
  for(let p=0;p<a.length;p+=4){assert.equal(a[p+3],b[p+3],`${id} alpha ${p/4}`);if(a[p+3])assert.deepEqual(a.subarray(p,p+3),b.subarray(p,p+3),`${id} rgb ${p/4}`);}
  for(const key of['width','height','pages','pageHeight','delay','loop'])assert.deepEqual(ma[key],mb[key],`${id} ${key}`);
  assert(output.length<=baseline.length,`${id} must not grow`);
  return{id,baselineBytes:baseline.length,outputBytes:output.length,reduction:1-output.length/baseline.length,
    width:mb.width,frameHeight:mb.pageHeight,pages:mb.pages,totalPlays:mb.loop,delays:mb.delay,visibleRGBExact:true,allAlphaExact:true};
}
function fullPalette(image){
  const state=exportPalette(image);for(const frame of image.frames)markUsed(frame.indices,state);
  const{table,map,transparent}=compactTable(state);while(table.length&(table.length-1)||table.length<2)table.push(0);
  const storage=new Uint8Array(4096+image.frames.length*(image.w*image.h*2+1024));
  const writer=new omggif.GifWriter(storage,image.w,image.h,{palette:table,loop:image.loop??undefined});
  for(const f of image.frames)writer.addFrame(0,0,image.w,image.h,Uint8Array.from(f.indices,i=>map[i]),
    {disposal:2,delay:Math.round(f.delay/10),...(transparent===null?{}:{transparent})});
  return storage.slice(0,writer.end());
}
for(const emptyFirst of[false,true]){
  const image=imageFixture(emptyFirst),output=await encodePaletteGif(image),id=`palette-empty-first-${emptyFirst}`;
  report.cases.push(await compare(id,fullPalette(image),output));writeFileSync(path(`${id}-after.gif`),output);
}
for(const[name,first,second]of[['both','#000000','#ffffff'],['first-none',null,'#ffffff'],['second-none','#000000',null]]){
  const image=legacyFixture(first,second),baseline=encodeGif(image),output=await encodeGifAsync(image);
  report.cases.push(await compare('legacy-'+name,baseline,output));writeFileSync(path(`legacy-${name}-after.gif`),output);
}
const colors=Array.from({length:256},(_,i)=>'#'+(i*65793).toString(16).padStart(6,'0'));
{
  const w=64,h=48,indices=new Uint16Array(w*h).fill(256);for(let i=0;i<255;i++)indices[(6+Math.floor(i/17))*w+8+i%17]=i;
  const image={w,h,colors,loop:0,frames:[{indices,delay:100},{indices:new Uint16Array(w*h).fill(256),delay:200}]};
  report.cases.push(await compare('255-colors-plus-transparent',fullPalette(image),await encodePaletteGif(image)));
}
{
  const image={w:16,h:16,colors,loop:null,frames:[{indices:Uint16Array.from({length:256},(_,i)=>i),delay:100}]};
  const baseline=fullPalette(image),output=await encodePaletteGif(image);assert.deepEqual(output,baseline);
  report.cases.push(await compare('256-opaque-exact-bytes',baseline,output));
  await assert.rejects(encodePaletteGif({...image,w:257,h:1,frames:[{indices:Uint16Array.from([...Array(256).keys(),256]),delay:100}]}),{code:'PALETTE_GIF_LIMIT'});
  report.rejected256PlusTransparency=true;
}
for(const name of['animation128','animation256'])for(const mode of['nearest','enhanced']){
  const source=decodeGif(readFileSync(`bench/practical-workloads-2026-10-16/desktop/${name}/${mode}.gif`)),colors=[],map=new Map();
  const image={w:source.width,h:source.height,loop:source.loop,colors,frames:source.frames.map(f=>({delay:f.delay,
    indices:Uint16Array.from({length:source.width*source.height},(_,p)=>{const at=p*4;if(!f.data[at+3])return 256;
      const rgb=f.data[at]*65536+f.data[at+1]*256+f.data[at+2];if(!map.has(rgb)){map.set(rgb,colors.length);colors.push('#'+rgb.toString(16).padStart(6,'0'));}return map.get(rgb);})}))};
  report.cases.push(await compare(`${name}-${mode}`,fullPalette(image),await encodePaletteGif(image)));
}
for(const label of['palette','1bit-first-none','1bit-second-none']){
  const beforePath=path(`before-ui-${label}-crop-challenge-colorfetti.gif`),afterPath=path(`after-ui-${label}-crop-challenge-colorfetti.gif`);
  if(existsSync(beforePath)&&existsSync(afterPath))report.actualUI.push(await compare(`actual-App-Save-${label}`,readFileSync(beforePath),readFileSync(afterPath)));
  const beforeZip=path(`before-ui-${label}-colorfetti.zip`),afterZip=path(`after-ui-${label}-colorfetti.zip`);
  if(existsSync(beforeZip)&&existsSync(afterZip)){
    const a=unzipSync(readFileSync(beforeZip)),b=unzipSync(readFileSync(afterZip));assert.deepEqual(Object.keys(a),Object.keys(b));
    for(const name of Object.keys(a))report.actualUI.push(await compare(`actual-App-ZIP-${label}-${name}`,a[name],b[name]));
  }
}
if(process.argv.includes('--require-ui'))assert.equal(report.actualUI.filter(c=>c.id.includes('palette')).length,3,'Actual App Save and both ZIP entries are required');
const paletteAfter=path('after-ui-palette-crop-challenge-colorfetti.gif');
if(existsSync(paletteAfter)){await compare('actual-Palette-Save-versus-known-source',sourceGif(),readFileSync(paletteAfter));report.actualPaletteMatchesKnownSource=true;}
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
report.sourceSHA256=Object.fromEntries(['src/lib/gif.js','src/lib/gif-frame-bounds.js','src/lib/gif-crop.test.js','src/lib/gif.test.js','src/lib/converted-animation.test.js'].map(file=>[file,hash(file)]));
report.artifactsSHA256=Object.fromEntries(readdirSync(new URL('.',import.meta.url)).filter(name=>/^(before-ui-|after-ui-|browser-(before|after)\.json|before-root\.jpg|after-root\.jpg)/.test(name)).map(name=>[name,hash(path(name))]));
report.buildSHA256={};for(const phase of['before','after']){const root=`.tmp/conversion-fixes-m7-${phase}`,hashes={};
  function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())visit(file);else hashes[relative(root,file).replaceAll('\\','/')]=hash(file);}}visit(root);report.buildSHA256[phase]=hashes;}
writeFileSync(path('oracle-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases,actualUI:report.actualUI,rejected256PlusTransparency:report.rejected256PlusTransparency},null,2));
