// Reproduce historical production sources without checking out/resetting this tree.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),base='217cb64360784c066e944f8121858d7726f0e4f2';
const out=path.resolve(process.argv[2]||'.tmp/whole-app-performance-2026-10-17/replay-baseline');
if(!out.startsWith(root+path.sep))throw Error('Build destination must remain inside the workspace.');
if(existsSync(path.join(out,'dist')))throw Error('Choose a new destination; do not overwrite an active frozen build.');
const files=execFileSync('git',['ls-tree','-r','--name-only',base,'--','src','build','package.json','package-lock.json','vite.config.js','index.html','public'],{encoding:'utf8'}).trim().split('\n').filter(f=>!f.endsWith('.mp4'));
for(const file of files){const dest=path.join(out,file);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,execFileSync('git',['show',base+':'+file],{maxBuffer:20*1024*1024}));}
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:out,stdio:'inherit'});
