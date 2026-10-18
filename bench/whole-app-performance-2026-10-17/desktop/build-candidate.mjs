import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),base='217cb64360784c066e944f8121858d7726f0e4f2';
const out=path.resolve(process.argv[2]||'.tmp/whole-app-performance-2026-10-17/replay-candidate');
if(!out.startsWith(root+path.sep))throw Error('Build destination must remain inside workspace.');
if(existsSync(path.join(out,'dist')))throw Error('Choose a new output directory; do not overwrite an active frozen build.');
mkdirSync(out,{recursive:true});
const paths=['src','build','package.json','package-lock.json','vite.config.js','index.html','public'];
const files=execFileSync('git',['ls-tree','-r','--name-only',base,'--',...paths],{encoding:'utf8'}).trim().split('\n').filter(f=>!f.endsWith('.mp4'));
for(const f of files){const dest=path.join(out,f);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,execFileSync('git',['show',`${base}:${f}`],{maxBuffer:20*1024*1024}));}
// Rebuild the archived tested runtime after D1's production rollback.
writeFileSync(path.join(out,'src/lib/quantize.js'),readFileSync(path.join(root,'bench/whole-app-performance-2026-10-17/review/quantize.candidate.js')));
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:out,stdio:'inherit'});
