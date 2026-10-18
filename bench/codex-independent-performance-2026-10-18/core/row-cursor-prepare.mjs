// Research-only nearest row cursor. Source preparation is separate from CPU windows.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, cp, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),directory=path.dirname(fileURLToPath(import.meta.url)),target=path.join(root,'.tmp/codex-independent-performance-2026-10-18/row-cursor'),baseline='5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce';
const normalized=s=>s.replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex');
const source=normalized(execFileSync('git',['show',`${baseline}:src/lib/quantize.js`],{cwd:root,encoding:'utf8'}));
const before='  const alpha = result.alpha;\n  for (let o = start; o < end; o++) {\n    const p = (ys[Math.floor(o / result.w)] * sourceW + xs[o % result.w]) * 4;';
const after='  const alpha = result.alpha, width = result.w;\n  let x = start % width, y = Math.floor(start / width), sourceRow = ys[y] * sourceW;\n  for (let o = start; o < end; o++) {\n    const p = (sourceRow + xs[x]) * 4;\n    if (++x === width) { x = 0; sourceRow = ys[++y] * sourceW; }';
if(source.split(before).length!==2)throw Error('Expected one exact nearest coordinate block');
const candidate=source.replace(before,after);
const imports=s=>s.replaceAll("'./palette-library.js'","'../../../src/lib/palette-library.js'").replaceAll("'./palette-dither-settings.js'","'../../../src/lib/palette-dither-settings.js'").replaceAll("'./palette-dither.js'","'../../../src/lib/palette-dither.js'").replaceAll("'./palette-alpha.js'","'../../../src/lib/palette-alpha.js'");
async function files(dir,prefix=''){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='dist'||entry.name==='node_modules')continue;const rel=path.join(prefix,entry.name);result.push(...(entry.isDirectory()?await files(path.join(dir,entry.name),rel):[rel]));}return result;}
if(process.argv[2]==='prepare'){
  for(const[name,body]of[['baseline',source],['candidate',candidate]])await writeFile(path.join(directory,`row-cursor-${name}.mjs`),imports(body)+'\nexport { job as rowCursorTestJob, convert as rowCursorTestConvert };\n');
  const diff=spawnSync('git',['diff','--no-index','--',path.join(directory,'row-cursor-baseline.mjs'),path.join(directory,'row-cursor-candidate.mjs')],{cwd:root,encoding:'utf8'});if(diff.status!==1)throw Error('Expected a nonempty research diff');await writeFile(path.join(directory,'row-cursor-candidate.patch'),diff.stdout);
  // Record the exact replacement independently of newline policy; production
  // proposal is only this convert() block, not the research-only test exports.
  await writeFile(path.join(directory,'row-cursor-change.json'),JSON.stringify({before,after},null,2)+'\n');
  await writeFile(path.join(directory,'row-cursor-plan.json'),JSON.stringify({created:new Date().toISOString(),baseline,currentHeadAtPreparation:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceCanonicalLfSha256:hash(source),candidateCanonicalLfSha256:hash(candidate),hypothesis:'A local row cursor in each nearest convert(state,start,end) call removes per-pixel division/modulo/source-row multiplication while retaining exact xs/ys coordinates. Advance precedes the alpha continue; each slice initializes from its own start. No persistent cursor, source-equality shortcut, table changes, memo change, dither change or source mutation.',acceptance:{nativeTarget:'1024/2048 PNG/export nearest: >=10% AND >=10ms lower renderer CPU, >=4/5 matched pairs faster; every paired output exact',adverse:'No practical tiny/preview/entropy/Keep/dither/Cleanup/animation regression exceeding BOTH5ms AND5%; no new blocking or retained memory',roundLimit:2,promotion:'Node and auxiliary whole conversion/export must show material benefit before a native candidate; kernel timing alone cannot authorize production.'},ports:{baseline:5407,candidate:5408},scope:'Research only; all runtime from immutable5ae baseline except candidate quantize.js block. Root owns native final decision and production edit authorization.'},null,2)+'\n');
  console.log('Row cursor source and criteria prepared; no tests/build/timing performed.');
}else if(process.argv[2]==='build'){
  try{await stat(target);throw Error('Row cursor destination exists; never rebuild active frozen variants');}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(target,{recursive:true});const frozen=path.join(root,'.tmp/codex-independent-performance-2026-10-18/variants/current-source');
  const frozenSource=normalized(await readFile(path.join(frozen,'src/lib/quantize.js'),'utf8'));if(frozenSource!==source)throw Error('Frozen source is not recorded5ae quantizer');
  const manifest={baseline,created:new Date().toISOString(),lockSha256:hash(await readFile(path.join(frozen,'package-lock.json'))),variants:[]};
  for(const[name,body,port]of[['baseline',source,5407],['candidate',candidate,5408]]){
    const dir=path.join(target,name);await cp(frozen,dir,{recursive:true,errorOnExist:true,force:false});await writeFile(path.join(dir,'src/lib/quantize.js'),body);
    const changed=[];for(const file of await files(dir)){const a=await readFile(path.join(frozen,file)),b=await readFile(path.join(dir,file));if(!a.equals(b))changed.push({file:file.replaceAll('\\','/'),beforeRawSha256:hash(a),afterRawSha256:hash(b),beforeCanonicalLfSha256:hash(normalized(a.toString('utf8'))),afterCanonicalLfSha256:hash(normalized(b.toString('utf8')))});}
    if(changed.some(f=>f.file!=='src/lib/quantize.js'))throw Error('Unexpected runtime/config source difference');
    const build=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--outDir','dist'],{cwd:dir,encoding:'utf8',maxBuffer:8*1024*1024});await writeFile(path.join(directory,`row-cursor-build-${name}.log`),(build.stdout??'')+(build.stderr??''));if(build.status!==0)throw Error(`${name} failed ${build.status}`);
    const dist=[];for(const file of await files(path.join(dir,'dist')))dist.push({file:file.replaceAll('\\','/'),sha256:hash(await readFile(path.join(dir,'dist',file)))});
    manifest.variants.push({name,port,sourceChanges:changed,dist});console.log(`${name} ready`);
  }
  manifest.hashPolicy='Raw SHA256 hashes exact filesystem bytes; canonical LF fields normalize CRLF before UTF-8 SHA256. Both builds normalize quantize.js toLF, so candidate comparison has only declared coordinate-loop semantics.';await writeFile(path.join(directory,'row-cursor-build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}else throw Error('Pass prepare or build');
