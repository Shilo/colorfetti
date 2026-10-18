// Isolate the demonstrated App lifetime fix from concurrent import/GIF edits.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const baseline='5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce',root=process.cwd(),evidence=import.meta.dirname,target=path.resolve('.tmp/codex-independent-performance-2026-10-18/preview-trigger');
if(existsSync(target))throw Error('Refuse to overwrite a frozen candidate');
mkdirSync(target,{recursive:true});const archive=execFileSync('git',['archive','--format=tar',baseline,'src','build','public','index.html','package.json','package-lock.json','vite.config.js'],{maxBuffer:128*1024*1024});const tar=path.join(target,'source.tar');writeFileSync(tar,archive);execFileSync('tar',['-xf',tar,'-C',target]);
const lf=b=>b.toString().replaceAll('\r\n','\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const old=lf(execFileSync('git',['show',baseline+':src/App.svelte'])),current=lf(readFileSync('src/App.svelte'));
const before='    onclose={async () => { const trigger = viewTrigger, keyboard = viewKeyboardFocus; viewing = null; await tick(); if (keyboard) trigger?.focus({ preventScroll: true }); else trigger?.blur(); }} />';
const after=`    onclose={async () => {
      const trigger = viewTrigger, keyboard = viewKeyboardFocus;
      // A detached tile button retains its event closures and the source pixels.
      // Keep it only for this focus return, never for the rest of the app visit.
      viewTrigger = undefined; viewKeyboardFocus = false; viewing = null;
      await tick();
      if (keyboard) trigger?.focus({ preventScroll: true }); else trigger?.blur();
    }} />`;
if(!old.includes(before)||current!==old.replace(before,after))throw Error('Unexpected App source drift');
writeFileSync(path.join(target,'src/App.svelte'),current);
const result=spawnSync(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'build','--outDir','dist'],{cwd:target,encoding:'utf8',maxBuffer:8*1024*1024});writeFileSync(path.join(evidence,'preview-trigger-build.log'),(result.stdout||'')+(result.stderr||''));if(result.status!==0)throw Error('Build failed');
function files(dir,prefix=''){const out=[];for(const f of readdirSync(dir)){const absolute=path.join(dir,f),relative=prefix+f;if(statSync(absolute).isDirectory())out.push(...files(absolute,relative+'/'));else out.push({file:relative,bytes:statSync(absolute).size,sha256:sha(readFileSync(absolute))});}return out;}
writeFileSync(path.join(evidence,'preview-trigger-manifest.json'),JSON.stringify({baseline,candidate:'baseline plus only src/App.svelte Preview close lifetime fix',created:new Date().toISOString(),source:{beforeCanonicalLfSha256:sha(old),afterCanonicalLfSha256:sha(current)},excludedConcurrentEdits:['src/PaletteImport.svelte','src/lib/gif.js','src/lib/image-import-client.js','src/lib/image-import-worker.js','src/lib/palette-decode.js','src/lib/palette-import.js'],dist:files(path.join(target,'dist')),port:5409,protocol:'Same dependencies and unchanged baseline encoders; focus restoration still uses captured local trigger. Measure retained bytes separately from CPU/latency.'},null,2));console.log({target,build:result.status,onlySourceChange:'src/App.svelte'});
