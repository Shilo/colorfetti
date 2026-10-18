import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {renderNativeFrame} from '../../../src/lib/viewer-inspection.js';
import {fullPaletteImage,prepareFullPaletteImage} from '../../../src/lib/palette-state.js';
import {getPaletteCleanup,applyCleanup} from '../../../src/lib/palette-cleanup-client.js';
import {decodeGif,encodePaletteGif} from '../../../src/lib/gif.js';
import {analyzeImportFrames} from '../../../src/lib/image-import-core.js';
import {analyze,mask} from '../../../src/lib/recolor.js';
import {pngBytes,palettePngBytes} from '../../../src/lib/save.js';
import {effectiveAlphaCut} from '../../../src/lib/palette-alpha.js';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE??'sharp');
const dir='bench/conversion-fixes-2026-10-18/m2',measurements=[];
function sameVisible(a,b){assert.equal(a.length,b.length);for(let p=0;p<a.length;p+=4){assert.equal(a[p+3],b[p+3]);if(a[p+3])for(let c=0;c<3;c++)assert.equal(a[p+c],b[p+c]);}}
async function pngItem(name){const {data,info}=await sharp(fs.readFileSync(`${dir}/${name}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});const original={width:info.width,height:info.height,data:new Uint8ClampedArray(data)};return {name,original,img:analyze(original)};}
const colors=['#000000','#ffffff','#ff004d','#0099ff'];
const base={family:'full-palette',colors,metric:'oklab',alphaCut:128,alphaMode:'cut',maxColors:0,cleanup:false,dither:'4x4',ditherStrength:100};
{
  const width=67,height=41,data=new Uint8ClampedArray(width*height*4);
  for(let p=0;p<width*height;p++)data.set([(p*11)&255,(p*31)&255,(p*19)&255,p%7===0?0:p%9===0?111:255],p*4);
  const original={width,height,data},item={name:'partial-alpha-noninteger',original,img:analyze(original)};
  for(const metric of ['oklab','rgb'])for(const alphaMode of ['cut','keep'])for(const ditherStrength of [0,50,100]){
    const settings={...base,metric,alphaMode,ditherStrength,maxColors:3,cleanup:true};
    const prepared=await prepareFullPaletteImage(item,settings),clean=await getPaletteCleanup(item,prepared.palette,effectiveAlphaCut(alphaMode,128),metric);
    const native=await renderNativeFrame(item,{...settings,palette:prepared.palette,cleanup:{result:clean,apply:applyCleanup}});
    const raw=await sharp(palettePngBytes(await fullPaletteImage(item,settings))).ensureAlpha().raw().toBuffer();sameVisible(native.data,raw);
    measurements.push({name:item.name,case:`cap3/Cleanup/${metric}/${alphaMode}/dither${ditherStrength}`,exactVisibleRgbAndAllAlpha:true});
  }
}
for(const name of ['gray-2048','gray-long-sheet']){
  const item=await pngItem(name),start=performance.now(),prepared=await prepareFullPaletteImage(item,base),native=await renderNativeFrame(item,{...base,palette:prepared.palette});
  const saved=palettePngBytes(await fullPaletteImage(item,base)),raw=await sharp(saved).ensureAlpha().raw().toBuffer();sameVisible(native.data,raw);
  measurements.push({name,case:'Palette4x4/source-coordinates',width:native.width,height:native.height,pixels:native.width*native.height,exactVisibleRgbAndAllAlpha:true,ms:performance.now()-start});
  if(name==='gray-2048'){
    for(const style of ['stencil','icon']){
      const start=performance.now(),native=await renderNativeFrame(item,{family:'two-color',style,set:{},first:null,second:'#fafafa'});
      const saved=pngBytes({w:item.img.w,h:item.img.h,mask:mask({...item.img,icons:{}},style),first:null,second:'#fafafa'}),raw=await sharp(saved).ensureAlpha().raw().toBuffer();sameVisible(native.data,raw);
      assert.equal(item.img.sprites,undefined);assert.equal(item.img.icons,undefined);
      measurements.push({name,case:`cold${style}/None`,exactVisibleRgbAndAllAlpha:true,sourceLazyCachesUnchanged:true,ms:performance.now()-start});
    }
  }
}
const decoded=decodeGif(new Uint8Array(fs.readFileSync(`${dir}/gray-20frames.gif`)));
const analyzed=await analyzeImportFrames({frames:decoded.frames.map(frame=>({original:{width:decoded.width,height:decoded.height,data:frame.data},delay:frame.delay})),loop:decoded.loop},'luma',128,{cooperative:false});
const item={name:'gray-20frames',...analyzed.frames[0],frames:analyzed.frames,loop:decoded.loop};
for(const metric of ['oklab','rgb']){
  const settings={...base,metric,maxColors:2,cleanup:true,ditherStrength:50},start=performance.now();
  const prepared=await prepareFullPaletteImage(item,settings),clean=await getPaletteCleanup(item,prepared.palette,effectiveAlphaCut(settings.alphaMode,settings.alphaCut),metric);
  const saved=await encodePaletteGif(await fullPaletteImage(item,settings));
  const {data,info}=await sharp(saved,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(const frameIndex of [0,7,19]){
    const frame=item.frames[frameIndex],native=await renderNativeFrame(frame,{...settings,palette:prepared.palette,cleanup:{result:clean,apply:applyCleanup}});
    const page=data.subarray(frameIndex*info.width*info.pageHeight*4,(frameIndex+1)*info.width*info.pageHeight*4);sameVisible(native.data,page);
  }
  measurements.push({name:item.name,case:`whole-clipCap2/Cleanup/${metric}/dither50`,selectedFrames:[0,7,19],frameCount:item.frames.length,exactVisibleRgbAndAllAlpha:true,ms:performance.now()-start});
}
fs.writeFileSync(`${dir}/export-parity.json`,JSON.stringify({oracle:sharp.versions,scope:'Production native renderer versus independently Sharp-decoded production Save PNG/GIF. This does not replace live Svelte/browser acceptance.',measurements},null,2)+'\n');console.log(JSON.stringify(measurements,null,2));
