// Immutable, source-only reverse variants. Never resets/checks out the user's tree.
// Run `node <this-file> materialize`, then `... build` only in an exclusive CPU window.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, writeFile, readFile, cp, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const evidence=path.dirname(fileURLToPath(import.meta.url));
const target=path.resolve(process.env.CODEX_AUDIT_VARIANT_DIR||path.join(root,'.tmp/codex-independent-performance-2026-10-18/variants'));
if(!target.startsWith(path.join(root,'.tmp')+path.sep))throw Error('Variant destination must remain under the workspace .tmp directory');
// A fresh reproduction must never overwrite the historical evidence manifest.
const output=process.env.CODEX_AUDIT_VARIANT_DIR?path.join(target,'evidence'):evidence;
const baseline='5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});
const version=(ref,file)=>git('show',`${ref}:${file}`);
const variants=[
 {name:'without-b1',port:5394,change:'4c1a975',note:'B1 removed from current synchronous analyze/seams; later B5 analyzeAsync retains its own single-loop analysis. This cannot isolate B1 live-analysis gain that B5 superseded.'},
 {name:'without-b2',port:5395,change:'0a4eb91',note:'Only tiny-PNG compression dispatch removed; comments from immediate parent restored.'},
 {name:'without-b3',port:5396,change:'5e19c48',note:'Only dragging-budget gate removed; latest wording comment removed with it.'},
 {name:'without-b4',port:5397,change:'236bbcc',note:'Summary histogram producer/consumers restored to immediate pre-B4 implementations; later difference was one diagnostic comment.'},
 {name:'without-b5',port:5398,change:'90b2d05',note:'Banded implementation and reanalysis caller restored to immediate pre-B5 implementations; all other current runtime preserved.'},
 {name:'without-b1-b5',port:5399,change:'4c1a975+90b2d05',note:'Compare with without-b5 for isolated B1 causality in synchronous live reanalysis; not a single-change variant against current.'},
];
async function files(dir,prefix=''){let out=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(['node_modules','dist'].includes(entry.name))continue;const rel=path.join(prefix,entry.name);out.push(...(entry.isDirectory()?await files(path.join(dir,entry.name),rel):[rel]));}return out;}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function removeB1(dir){
  const file=path.join(dir,'src/lib/recolor.js'),old=version('4c1a975^','src/lib/recolor.js').replaceAll('\r\n','\n');let current=(await readFile(file,'utf8')).replaceAll('\r\n','\n');
  const a=current.indexOf('export function analyze('),b=current.indexOf('\n// `analyze` for live reanalysis',a),c=current.indexOf('\n// Makes every frame',a);
  const x=old.indexOf('export function analyze('),y=old.indexOf('\n// Makes every frame',x);
  if(a<0||x<0||y<0)throw Error('Analyze markers not found');current=current.slice(0,a)+old.slice(x,y)+current.slice(b>=0?b:c);
  current=current.replace('    const r = right[p], d = down[p];\n    if (!r && !d) continue;\n','').replace('if (r && x + 1 < w && lum[p + 1] > t === light) hist[r]++;','if (x + 1 < w && lum[p + 1] > t === light) hist[right[p]]++;').replace('if (d && y + 1 < h && lum[p + w] > t === light) hist[d]++;','if (y + 1 < h && lum[p + w] > t === light) hist[down[p]]++;').replace('// A difference of 0 (identical or empty neighbours) only counts in hist[0], which\n// seamThreshold always clears, so those pairs are skipped.\n','');
  if(!current.includes(old.slice(x,y))||['if (!r && !d) continue;','if (r && x + 1','if (d && y + 1'].some(marker=>current.includes(marker)))throw Error('Incomplete B1 reversal');
  await writeFile(file,current);
}
if(process.argv[2]==='materialize'){
  git('cat-file','-e',baseline+'^{commit}'); // Inputs come from this exact object, never the mutable checkout.
  try{await stat(target);throw Error('Destination already exists: choose a fresh CODEX_AUDIT_VARIANT_DIR; never rewrite active frozen builds');}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(target,{recursive:true});await mkdir(output,{recursive:true});const base=path.join(target,'current-source');
  await mkdir(base,{recursive:true});const tar=execFileSync('git',['archive','--format=tar',baseline,'src','public','build','index.html','package.json','package-lock.json','vite.config.js'],{cwd:root,maxBuffer:128*1024*1024});
  const archive=path.join(target,'source.tar');await writeFile(archive,tar);execFileSync('tar',['-xf',archive,'-C',base],{cwd:root});
  for(const variant of variants){
    const dir=path.join(target,variant.name);let exists=false;try{exists=(await stat(dir)).isDirectory();}catch(error){if(error.code!=='ENOENT')throw error;}if(!exists)await cp(base,dir,{recursive:true,errorOnExist:true,force:false});
    if(variant.name==='without-b1')await removeB1(dir);
    if(variant.name==='without-b2')await writeFile(path.join(dir,'src/lib/save.js'),version('0a4eb91^','src/lib/save.js'));
    if(variant.name==='without-b3'){
      const file=path.join(dir,'src/Tile.svelte'),source=await readFile(file,'utf8');const line='    if (analysisPending || !active || budget > 0) return;';if(!source.includes(line))throw Error('B3 marker changed');
      await writeFile(file,source.replace('    // While a slider is dragged each move would start, then discard, a full mask; count at rest.\n','').replace(line,'    if (analysisPending || !active) return;'));
    }
    if(variant.name==='without-b4')for(const file of ['source-color-summary','palette-generated-client','palette-generated-worker','palette-generated','palette-limit-client','palette-limit-worker','palette-limit'])await writeFile(path.join(dir,`src/lib/${file}.js`),version('236bbcc^',`src/lib/${file}.js`));
    if(['without-b5','without-b1-b5'].includes(variant.name)){
      for(const file of ['recolor','image-reanalysis'])await writeFile(path.join(dir,`src/lib/${file}.js`),version('90b2d05^',`src/lib/${file}.js`));
      if(variant.name==='without-b1-b5')await removeB1(dir);
    }
    // These are nested under the root checkout; native package resolution climbs
    // to its existing node_modules. No junction, dependency copy or install needed.
    variant.sourceChanges=[];for(const file of await files(dir)){const actual=await readFile(path.join(dir,file)),before=await readFile(path.join(base,file));if(!actual.equals(before))variant.sourceChanges.push({file:file.replaceAll('\\','/'),before:sha(before),after:sha(actual)});}
  }
  const manifest={created:new Date().toISOString(),baseline,lockSha:sha(await readFile(path.join(base,'package-lock.json'))),variants,protocol:'All keep the starting current runtime except explicitly removed changes; no live checkout changes. B1/B5 overlap requires supplementary without-b5 vs without-b1-b5 comparison. Builds still pending.'};
  await writeFile(path.join(output,'variant-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
}else if(process.argv[2]==='build'){
  const manifest=JSON.parse(await readFile(path.join(output,'variant-manifest.json'),'utf8'));
  if(manifest.built)throw Error('Refusing to rebuild frozen evidence; materialize into a fresh destination');
  for(const variant of manifest.variants){const dir=path.join(target,variant.name);try{await stat(path.join(dir,'dist'));throw Error('Refusing to replace existing dist: '+dir);}catch(error){if(error.code!=='ENOENT')throw error;}const result=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--outDir','dist'],{cwd:dir,encoding:'utf8',maxBuffer:8*1024*1024});await writeFile(path.join(output,`build-${variant.name}.log`),(result.stdout??'')+(result.stderr??''));if(result.status!==0)throw Error(`${variant.name} build failed ${result.status}`);variant.distFiles=[];for(const file of await files(path.join(dir,'dist')))variant.distFiles.push({file:file.replaceAll('\\','/'),sha256:sha(await readFile(path.join(dir,'dist',file)))});console.log(`${variant.name} built`);}
  manifest.built=new Date().toISOString();await writeFile(path.join(output,'variant-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}else throw Error('Pass materialize or build');
