// One bounded candidate: replace Auto farthest-seed Array.includes with Set.has.
// Research-only modules; no production edits. Prepare separately from CPU windows.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { captureGeneratedSources } from '../../../src/lib/palette-generated-sources.js';
const directory=new URL('.',import.meta.url);
let seed=0x61a84dc;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
function make(width,height,unique,partial=false){const data=new Uint8ClampedArray(width*height*4),table=Array.from({length:unique},()=>rand()>>>8);for(let p=0;p<width*height;p++){const c=table[(rand()>>>8)%unique];data[p*4]=c>>>16;data[p*4+1]=c>>>8&255;data[p*4+2]=c&255;data[p*4+3]=partial?[0,1,127,128,254,255][(rand()>>>8)%6]:(rand()>>>8)%7?255:0;}return {width,height,data};}
function snapshot(unique,frames=1,assets=1,partial=false){return captureGeneratedSources(Array.from({length:assets},()=>frames>1?{frames:Array.from({length:frames},(_,i)=>({original:make(unique>4096?128:64,unique>4096?128:64,unique,partial),delay:[10,70,30][i%3]}))}:{original:make(unique>4096?128:64,unique>4096?128:64,unique,partial)}),partial?1:128);}
function instrument(source){
  const marker='      let first = 0;';if(!source.includes(marker))throw Error('Seed marker missing');
  source=source.replace(marker,'      const __seedStart = performance.now();\n'+marker);
  const end='      colors.sort((a, b) => a - b);';if(!source.includes(end))throw Error('Seed end missing');
  return source.replace(end,'      const __seedMs = performance.now() - __seedStart;\n'+end).replace('return Object.freeze({ colors: Object.freeze(best.map(hex)), binned, assets: nonempty,','return Object.freeze({ __seedMs, colors: Object.freeze(best.map(hex)), binned, assets: nonempty,');
}
if(process.argv[2]==='prepare'){
  const original=await readFile(new URL('../../../src/lib/palette-generated.js',import.meta.url),'utf8');
  const rewrite=source=>source.replaceAll("'./quantize.js'","'../../../src/lib/quantize.js'").replaceAll("'./palette-generated-sources.js'","'../../../src/lib/palette-generated-sources.js'").replaceAll("'./palette-library.js'","'../../../src/lib/palette-library.js'");
  let candidate=original.replace('let colors = [rgb[first]], nearest = new Float64Array(length).fill(Infinity);','let colors = [rgb[first]], selectedRgb = new Set(colors), nearest = new Float64Array(length).fill(Infinity);').replace('!colors.includes(rgb[i])','!selectedRgb.has(rgb[i])').replace('if (selected < 0) break; colors.push(rgb[selected]);','if (selected < 0) break; colors.push(rgb[selected]); selectedRgb.add(rgb[selected]);');
  if(candidate===original||!candidate.includes('selectedRgb.add'))throw Error('Candidate substitution failed');
  for(const [name,source]of Object.entries({'auto-original':original,'auto-set-candidate':candidate,'auto-original-instrumented':instrument(original),'auto-set-instrumented':instrument(candidate)}))await writeFile(new URL(name+'.mjs',directory),rewrite(source));
  await writeFile(new URL('auto-seed-candidate-plan.json',directory),JSON.stringify({created:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:createHash('sha256').update(original).digest('hex'),candidate:'Only seed RGB membership changes, Array.includes to Set.has; source ordering, strict tie arithmetic and picked RGBs unchanged.',practicalTargets:['Four licensed distinct sprites with shared Auto','Licensed sheets1024/2048','High-entropy diagnostic input (cannot alone establish a practical win)'],acceptance:'Exact generated colors+all diagnostics over exact/binned/partial/GIF cohorts required. First-round promotion requires at least one practical whole-Auto target >=5% and >=3ms lower median, faster in >=4/5 paired trials; no cohort regresses by both >5% and >3ms (tiny cohorts >1ms absolute). Then actual app browser+Android worker/output/latency/CPU evidence is required before production. No production change from kernel timing alone.',correctionRounds:2,limitation:'Instrumented seed elapsed includes scheduler waits. Whole kernel elapsed includes source histogram and full fitting; neither includes browser import/worker/UI. No universal app acceptance threshold is inferred from this candidate gate.'},null,2)+'\n');console.log('Research-only candidate modules prepared.');
}else{
  const original=await import('./auto-original.mjs'),candidate=await import('./auto-set-candidate.mjs'),instrumented=await import('./auto-original-instrumented.mjs'),instrumentedCandidate=await import('./auto-set-instrumented.mjs');
  const cohorts=[['tiny',snapshot(8)],['boundary64',snapshot(64)],['exact128',snapshot(128)],['exact1024',snapshot(1024)],['exact4096',snapshot(4096)],['binned',snapshot(12000)],['assets4',snapshot(128,1,4)],['clip3',snapshot(256,3)],['partial',snapshot(180,2,1,true)]];
  const sharp=createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json')('sharp');
  const decode=async name=>{const {data,info}=await sharp(fileURLToPath(new URL(`../../practical-workloads-2026-10-16/fixtures/${name}.png`,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {width:info.width,height:info.height,data:new Uint8ClampedArray(data.buffer,data.byteOffset,data.byteLength)};};
  const practical=await Promise.all(['dungeon-wizard','dungeon-archer','platformer-pilot','town-water-bucket'].map(decode));
  cohorts.push(['practical4',captureGeneratedSources(practical.map(original=>({original})))]);
  for(const size of [1024,2048])cohorts.push([`sheet${size}`,captureGeneratedSources([{original:await decode(`kenney-sheet-${size}`)}])]);
  const equal=[];
  for(const [name,input]of cohorts){const a=await original.generatePaletteAsync(input),b=await candidate.generatePaletteAsync(input);assert.deepEqual(b,a);equal.push({name,colors:a.colors.length,binned:a.binned,assets:a.assets});}
  const output={created:new Date().toISOString(),node:process.version,seed:'0x61a84dc',equality:equal,round:1};
  if(process.argv[2]==='timing'){
    output.raw=[];
    for(const [name,input]of cohorts){await original.generatePaletteAsync(input);await candidate.generatePaletteAsync(input);for(let pair=0;pair<5;pair++)for(const kind of pair%2?['set','original']:['original','set']){const module=kind==='set'?candidate:original,start=performance.now();const result=await module.generatePaletteAsync(input);output.raw.push({name,pair,kind,ms:performance.now()-start,colors:result.colors.length});}}
    output.attribution=[];
    for(const [name,input]of cohorts){for(const [kind,module]of [['original',instrumented],['set',instrumentedCandidate]]){const start=performance.now(),result=await module.generatePaletteAsync(input),total=performance.now()-start;output.attribution.push({name,kind,totalMs:total,seedMs:result.__seedMs??0,seedFraction:(result.__seedMs??0)/total});}}
  }
  await writeFile(new URL(process.argv[2]==='timing'?'auto-seed-round1.json':'auto-seed-correctness.json',directory),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
}
