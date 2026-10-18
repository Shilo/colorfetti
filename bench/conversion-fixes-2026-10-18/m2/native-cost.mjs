import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {analyze,mask,colorize} from '../../../src/lib/recolor.js';
import {preparePalette,quantizeAsync,colorize as palettePixels} from '../../../src/lib/quantize.js';
const dir='bench/conversion-fixes-2026-10-18/m2';mkdirSync(dir,{recursive:true});
const w=2048,h=2048,data=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4,t=(x^y)&255;data.set([t,128,255-t,(x%64<2||y%64<2)?0:255],p);}
const source={width:w,height:h,data};
const measure=async(name,run)=>{global.gc?.();const before=process.memoryUsage(),start=performance.now();const value=await run(),after=process.memoryUsage();return {name,ms:performance.now()-start,before,after,value};};
const palette=preparePalette(['#000000','#ffffff','#ff004d','#0099ff']);
const q=await measure('2048x2048 palette Keep/dither4x4',async()=>{const indices=await quantizeAsync(source,palette,128,w,h,{alphaMode:'keep',dither:'4x4',ditherStrength:50});const rgba=palettePixels(indices,palette);return {indices:indices.indices.byteLength,alpha:indices.alpha.byteLength,rgba:rgba.data.byteLength};});
const img=analyze(source);
const legacy=await measure('2048x2048 cold Stencil',()=>{const result=mask(img,'stencil');const rgba=colorize(result,'#000000','#ffffff');return {mask:result.byteLength,rgba:rgba.byteLength,retainedStructural:Object.fromEntries(Object.entries(img.sprites).filter(([,v])=>ArrayBuffer.isView(v)).map(([k,v])=>[k,v.byteLength]))};});
const icon=await measure('2048x2048 cold Icon',()=>{const local={...img,icons:{}};const result=mask(local,'icon');const rgba=colorize(result,'#000000','#ffffff');return {mask:result.byteLength,rgba:rgba.byteLength,retainedStructural:Object.fromEntries(Object.entries(local.icons.auto).filter(([,v])=>ArrayBuffer.isView(v)).map(([k,v])=>[k,v.byteLength]))};});
const result={scope:'Node CPU and process array-buffer deltas; does not measure browser/GPU peak. Source and analysis already owned. Four MP native raster proposal; one selected frame only.',maximumNativePixels:w*h,proposalRasterReservationBytes:84*1024*1024,measurements:[q,legacy,icon]};
writeFileSync(dir+'/native-cost.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
