// Freeze the reviewed baseline plus known filename/discovery commits and accepted
// audit runtime deltas. Concurrent dirty import/GIF work never enters this build.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),out=import.meta.dirname,target=path.resolve('.tmp/codex-independent-performance-2026-10-18/final');
const cumulativeBase='18de3f7b231e59d144aba6fa32ceba43c03a04eb';
if(existsSync(target))throw Error('Refuse to replace frozen final source');
const lf=b=>b.toString().replaceAll('\r\n','\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const runtime=[{file:'src/App.svelte',expected:JSON.parse(readFileSync(path.join(out,'preview-trigger-manifest.json'))).source.afterCanonicalLfSha256}];
if(process.argv.includes('--row-cursor')){
  const decision=JSON.parse(readFileSync(path.join(out,'core/row-cursor-native-decision.json')));
  if(decision.accepted!==true)throw Error('Row cursor requires an accepted native decision');
  runtime.push({file:'src/lib/quantize.js',expected:JSON.parse(readFileSync(path.join(out,'core/row-cursor-plan.json'))).candidateCanonicalLfSha256});
}
for(const f of runtime)if(sha(lf(readFileSync(f.file)))!==f.expected)throw Error('Unreviewed audit source delta: '+f.file);
mkdirSync(target,{recursive:true});
const archive=execFileSync('git',['archive','--format=tar',cumulativeBase,'src','build','public','index.html','package.json','package-lock.json','vite.config.js','docs/styles.md','bench/brand-icons-qa.mjs','.github/workflows/deploy.yml'],{maxBuffer:128*1024*1024});
const tar=path.join(target,'source.tar');writeFileSync(tar,archive);execFileSync('tar',['-xf',tar,'-C',target]);
for(const f of runtime)writeFileSync(path.join(target,f.file),lf(readFileSync(f.file)));
const manifest={created:new Date().toISOString(),baseline:'5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce',cumulativeBase,auditRuntimeFiles:runtime.map(f=>f.file),runtime,headAtPreparation:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Exact tracked18de3f7 plus declared audit runtime files. Other current dirty GIF/import/docs changes excluded and preserved. All tests/fixtures come from cumulativeBase.',target};
writeFileSync(path.join(target,'audit-source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');writeFileSync(path.join(out,'final-source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(process.argv.includes('--build')){
 const result=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--outDir','dist'],{cwd:target,encoding:'utf8',maxBuffer:8*1024*1024});
 writeFileSync(path.join(out,'final-build.log'),(result.stdout||'')+(result.stderr||''));if(result.status!==0)throw Error('Final build failed');
}
console.log(manifest);
