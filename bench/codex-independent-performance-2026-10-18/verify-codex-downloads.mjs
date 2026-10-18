// Actual Codex Browser native downloads; independent scalar matcher and decoder.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
import {unzipSync} from 'fflate';
const root=import.meta.dirname,out=path.join(root,'codex-browser','outputs');mkdirSync(out,{recursive:true});
const colors=['000000','1d2b53','7e2553','008751','ab5236','5f574f','c2c3c7','fff1e8','ff004d','ffa300','ffec27','00e436','29adff','83769c','ff77a8','ffccaa'].map(h=>[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)));
const linear=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
function lab(rgb){const[r,g,b]=rgb.map(linear),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
const labs=colors.map(lab),cache=new Map(),sha=b=>createHash('sha256').update(b).digest('hex');
function nearest(rgb){const key=rgb.join(',');if(cache.has(key))return cache.get(key);const p=lab(rgb);let at=0,best=Infinity;for(let i=0;i<labs.length;i++){const d=p.reduce((s,x,c)=>s+(x-labs[i][c])**2,0);if(d<best){best=d;at=i;}}cache.set(key,colors[at]);return colors[at];}
const results=[];
async function verify(name,bytes,source,alphaMode='cut'){const decoded=await sharp(bytes,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),original=await sharp(source,{animated:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),meta=await sharp(bytes,{animated:true}).metadata(),before=await sharp(source,{animated:true}).metadata();
 if(decoded.info.width!==original.info.width||decoded.info.height!==original.info.height)throw Error('dimensions '+name);
 let visible=0;const used=new Set();for(let i=0;i<original.data.length;i+=4){const alpha=alphaMode==='keep'?original.data[i+3]:original.data[i+3]>=128?255:0;if(decoded.data[i+3]!==alpha)throw Error('alpha '+name+'@'+i);if(!alpha)continue;const expected=nearest([...original.data.subarray(i,i+3)]);if(expected.some((v,c)=>v!==decoded.data[i+c]))throw Error('RGB '+name+'@'+i);used.add(expected.join(','));visible++;}
 if(name.endsWith('.gif')&&(JSON.stringify(meta.delay)!==JSON.stringify(before.delay)||meta.loop!==before.loop||meta.pages!==before.pages))throw Error('GIF metadata '+name);
 writeFileSync(path.join(out,name),bytes);results.push({name,alphaMode,sha256:sha(bytes),bytes:bytes.length,width:meta.width,height:meta.pageHeight||meta.height,frames:meta.pages||1,delay:meta.delay,loop:meta.loop,visiblePixels:visible,colors:used.size,scalarNearestAndAlphaExact:true});}
const fixture=path.resolve('bench/practical-workloads-2026-10-16/fixtures');
const zipPath=process.argv[2]||'C:/Users/shilo/Downloads/colorfetti (3).zip';
const zip=readFileSync(zipPath);writeFileSync(path.join(out,'practical-nine.zip'),zip);const entries=unzipSync(zip);
if(Object.keys(entries).length!==9)throw Error('entry count');
for(const[name,bytes]of Object.entries(entries)){const base=name.replace(/-palette(?=\.[^.]+$)/,'');await verify(name,bytes,readFileSync(path.join(fixture,base)));}
const sheetPath=process.argv[3]||'C:/Users/shilo/Downloads/kenney-sheet-1024-palette.png';await verify('kenney-sheet-1024-palette.png',readFileSync(sheetPath),readFileSync(path.join(fixture,'kenney-sheet-1024.png')));
if(process.argv[4])await verify('partial-glow64-keep.png',readFileSync(process.argv[4]),readFileSync(path.resolve('bench/whole-app-performance-2026-10-17/android/fixtures/partial-glow64.png')),'keep');
if(process.argv[5])await verify('kenney-motion-256-palette.gif',readFileSync(process.argv[5]),readFileSync(path.join(fixture,'kenney-motion-256.gif')),'keep');
writeFileSync(path.join(root,'codex-browser','output-verification.json'),JSON.stringify({baseline:'5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce',surface:'actual Codex Browser Windows Chrome155 native downloads',settings:'PICO8 / Oklab / All / CleanupOff / DitherOff / Cut128',zipSha256:sha(zip),results,qualification:'Every visible RGB and all alpha/dimensions checked against independent scalar nearest; hidden RGB under alpha0 ignored. GIF frames/delays/loop independently decoded. No canvas readback oracle.'},null,2));console.log({entries:9,individuallyChecked:results.length,allExact:true});
