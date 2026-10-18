import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected='217cb64360784c066e944f8121858d7726f0e4f2';
if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==expected)throw Error('Historical baseline manifest: materialize the original217cb64 checkout before regenerating; do not relabel a later tree as the audit baseline.');
function hashes(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const p=path.join(dir,e.name);return e.isDirectory()?hashes(p):[{path:p.replaceAll('\\','/'),bytes:statSync(p).size,sha256:sha(readFileSync(p)),...(p.endsWith('.js')||p.endsWith('.css')?{gzipBytes:gzipSync(readFileSync(p)).length}:{})}];
});}
const manifest={
 date:'2026-10-17 America/Los_Angeles',
 revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 runtimeBaseline:'34a95d97f65ec681d07b52ace85dc84e6c8ce56c',
 initialTree:'clean',
 node:process.version,
 lockfileSha256:sha(readFileSync('package-lock.json')),
 installedLockfileSha256:sha(readFileSync('node_modules/.package-lock.json')),
 source:hashes('src'),
 build:hashes('.tmp/whole-app-performance-2026-10-17/baseline/dist').filter(x=>!x.path.endsWith('.mp4')),
 practicalFixtureManifest:JSON.parse(readFileSync('bench/practical-workloads-2026-10-16/manifest.json','utf8')),
 tests:{host:'66 files passed; 1050 passed, 2 GC-dependent skipped',sandbox:'setup EPERM before tests; not product failure'},
 warning:'No A/B or optimization claim follows from this manifest; source changes by another active task must be identified separately.'
};
writeFileSync('bench/whole-app-performance-2026-10-17/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Frozen',manifest.revision,manifest.source.length,'source files;',manifest.build.length,'assets');
