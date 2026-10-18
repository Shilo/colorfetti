import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {decode,nearest,compare,contract,usedColors,sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../../src/lib/palette-library.js';
import {preparePalette,quantize,colorize} from '../../../src/lib/quantize.js';
import {getLimitedPalette} from '../../../src/lib/palette-limit-client.js';
import {prepareCleanupAsync,applyCleanup} from '../../../src/lib/palette-cleanup.js';
const root=import.meta.dirname, fixtures=new URL('../../practical-workloads-2026-10-16/fixtures/',import.meta.url);
const bytes=await readFile(root+'/baseline-enhanced.zip'),entries=unzipSync(bytes),results=[];
assert.deepEqual(Object.keys(entries).sort(),['dungeon-wizard-palette.png','real-magic-palette.gif']);
const palette=preparePalette(FULL_PRESETS.find(x=>x.id==='preset-res64').colors);
for(const [name,out] of Object.entries(entries)){
 const originalName=name.replace('-palette',''),source=await decode(await readFile(new URL(originalName,fixtures))),actual=await decode(Buffer.from(out));
 assert.equal(actual.w,source.w);assert.equal(actual.h,source.h);assert.equal(actual.frames.length,source.frames.length);
 if(source.frames.length>1){assert.deepEqual(actual.delay,source.delay);assert.equal(actual.loop,source.loop);}
 const sources=source.frames.map(data=>({width:source.w,height:source.h,data}));
 const item=source.frames.length>1?{frames:sources.map((original,i)=>({original,delay:source.delay[i]})),original:sources[0],loop:source.loop}:{original:sources[0]};
 const active=await getLimitedPalette(item,palette,128,'rgb',8),cleanup=await prepareCleanupAsync(sources,active.colors,128,'rgb');
 for(let i=0;i<sources.length;i++){
  const q=quantize(sources[i],active,128,undefined,undefined,{metric:'rgb',dither:'4x4',ditherStrength:50});applyCleanup(q,cleanup);
  const eq=compare(actual.frames[i],colorize(q,active).data),ct=contract(actual.frames[i],source.frames[i],active.colors);
  assert.equal(eq.rgbMismatch,0);assert.equal(eq.alphaMismatch,0);assert.equal(ct.offPalette,0);assert.equal(ct.alphaWrong,0);
 }
 results.push({name,width:actual.w,height:actual.h,frames:actual.frames.length,delay:actual.delay,loop:actual.loop,usedColors:usedColors(actual.frames).length,sha256:sha(out),rgbMismatch:0,alphaMismatch:0});
}
const clipboard=await decode(await readFile(root+'/clipboard.png')),source=await decode(await readFile(new URL('dungeon-wizard.png',fixtures)));
assert.equal(clipboard.w,16);assert.equal(clipboard.h,16);const ct=contract(clipboard.frames[0],source.frames[0],['#000000','#ffffff','#ff004d','#00ff00']);assert.equal(ct.alphaWrong,0);assert.equal(ct.offPalette,0);
results.push({name:'clipboard.png',width:16,height:16,independentAlphaAndMembership:true});
const glow=await decode(await readFile(new URL('../desktop/fixtures/glow64.png',import.meta.url))),kept=await decode(await readFile(root+'/baseline-glow-keep.png'));
assert.equal(kept.w,glow.w);assert.equal(kept.h,glow.h);
const glowComparison=compare(kept.frames[0],nearest(glow.frames[0],palette.colors,{alphaMode:'keep'}).data);
assert.equal(glowComparison.rgbMismatch,0);assert.equal(glowComparison.alphaMismatch,0);
results.push({name:'baseline-glow-keep.png',width:64,height:64,rgbMismatch:0,alphaMismatch:0,oracle:'independent scalar Oklab nearest, exact every original alpha byte',sha256:sha(await readFile(root+'/baseline-glow-keep.png'))});
const report={baseline:'217cb64360784c066e944f8121858d7726f0e4f2',zipSha256:sha(bytes),results,oracle:'Native Codex Browser Save ZIP independently decoded with Sharp; enhanced pipeline integration parity uses production modules, not independent algorithm oracle. Independent alpha, membership, dimensions, GIF timing/loop. Hidden RGB ignored only at alpha0. Clipboard transport separately checked alpha/membership.'};
await writeFile(root+'/output-verification.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Codex native ZIP (all entries and frames) + native PNG clipboard');
