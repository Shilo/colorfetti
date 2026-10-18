import {readFileSync,writeFileSync,readdirSync,copyFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,relative,resolve} from 'node:path';
const output=new URL('validation.json',import.meta.url);
if(existsSync(output))throw new Error('Historical receipt exists; retain it instead of replacing it with a later build.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
const paths=files('src').filter(p=>/\.(js|svelte|css)$/.test(p)).concat(['CLAUDE.md','package.json','package-lock.json','vite.config.js']);
const testedRuntimeCommit='6b9e290927066f5f361e6dfee174e7f557bf5665';
const runtimeDiff=execFileSync('git',['diff','--name-only',testedRuntimeCommit,'HEAD','--','src','build','public','index.html','package.json','package-lock.json','vite.config.js'],{encoding:'utf8'}).trim();
if(runtimeDiff)throw new Error('Runtime differs from the tested revision: '+runtimeDiff);
const receipt={
 date:'2026-10-18',recordedUTC:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 testedRuntimeCommit,interveningRuntimeDiff:runtimeDiff,revisionNote:'Later commits during review add the first review and contact sheets only; tested runtime remains identical to 6b9e290.',
 trackedDiff:execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim(),node:process.version,
 validation:{unitTestFiles:68,passed:1186,skipped:2,build:'passed',buildDirectory:'.tmp/master-review/dist',browserUrl:'http://127.0.0.1:5196/',browserBuild:'Immutable in-memory static server; independent CUA observations recorded separately.',temp:'Process-local workspace TEMP/TMP'},
 reviewInputs:Object.fromEntries(['conversion-review.md','codex-review.md'].map(name=>[name,hash(readFileSync(new URL('inputs/'+name,import.meta.url)))])),
 sourceSHA256:Object.fromEntries(paths.sort().map(p=>[p.replaceAll('\\','/'),hash(readFileSync(p))])),
 buildSHA256:Object.fromEntries(files('.tmp/master-review/dist').sort().map(p=>[relative(resolve('.tmp/master-review/dist'),resolve(p)).replaceAll('\\','/'),hash(readFileSync(p))])),
 contribution:'Review/probes/documentation only. No product source/config/spec changes.',
 limits:['No new physical-phone, Safari/iOS, assistive-technology user study, or whole-process peak memory measurements.','Fixture error metrics are not artist preference.','No rejected experimental recommendation has been implemented.']
};
copyFileSync('.tmp/master-review/unit-tests.txt',new URL('unit-tests.txt',import.meta.url));copyFileSync('.tmp/master-review-build.txt',new URL('build.txt',import.meta.url));
writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({head:receipt.head,trackedDiff:receipt.trackedDiff,validation:receipt.validation,sourceFiles:paths.length,buildFiles:Object.keys(receipt.buildSHA256).length}));
