import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const dir = 'bench/whole-app-performance-2026-10-17';
const json = p => JSON.parse(fs.readFileSync(p));
const sha = b => createHash('sha256').update(b).digest('hex');
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const tracked = new Set(git('ls-files').split('\n'));
const auditBase = '35fbb73859a6526dbd6e1ccfd3671e5181d8f954';
const historical = '217cb64360784c066e944f8121858d7726f0e4f2';
const record = {reviewedRevision:'133b3f1', checkedAt:new Date().toISOString()};
record.auditProductionDiff = git('diff','--name-only',auditBase,'133b3f1','--','src','build','package.json','package-lock.json','vite.config.js','index.html','public');
record.ownedQuantizerDiff = git('diff','--name-only',historical,'HEAD','--','src/lib/quantize.js','src/lib/quantize.test.js');
const manifest=json(dir+'/desktop/build-manifest.json');
record.lockMatchesHistorical = sha(fs.readFileSync('package-lock.json')) === sha(execFileSync('git',['show',historical+':package-lock.json']));
record.lockMatchesFrozen = sha(fs.readFileSync('package-lock.json')) === manifest.packageLockSha256;
record.installedVersions=Object.fromEntries(Object.entries(manifest.versions).map(([name,expected])=>[name,{expected,actual:json('node_modules/'+name+'/package.json').version}]));
record.replayBuilds={};
for(const variant of ['baseline','candidate']) {
  const replay='.tmp/whole-app-performance-2026-10-17/final-review-'+variant+'/dist';
  const mismatches=[];
  for(const f of manifest.builds[variant].files){
    const p=path.join(replay,f.file);
    if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==f.sha256) mismatches.push(f.file);
  }
  record.replayBuilds[variant]={files:manifest.builds[variant].files.length,mismatches};
}
record.candidateHash=sha(fs.readFileSync(dir+'/review/quantize.candidate.js'));
record.candidateHashMatchesFrozen=record.candidateHash===manifest.candidateQuantizeSha256;
record.frozenSourceAttribution=[];
for(const f of json(dir+'/manifest.json').source){
 const historicalBytes=execFileSync('git',['show',historical+':'+f.path]);
 const currentBytes=fs.readFileSync(f.path);
 const normalize=b=>b.toString().replaceAll('\r\n','\n');
 if(normalize(historicalBytes)!==normalize(currentBytes))record.frozenSourceAttribution.push({path:f.path,frozenMatchesCurrent:sha(currentBytes)===f.sha256,frozenMatchesHistoricalBytes:sha(historicalBytes)===f.sha256});
}
record.baselineStaticExceptions={omittedTrailer:'colorfetti-trailer.mp4',webmanifestNormalizedEqual:fs.readFileSync('.tmp/whole-app-performance-2026-10-17/final-review-baseline/dist/manifest.webmanifest','utf8').replaceAll('\r\n','\n')===fs.readFileSync('.tmp/whole-app-performance-2026-10-17/baseline/dist/manifest.webmanifest','utf8').replaceAll('\r\n','\n')};
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
record.pairReceipts={};
for(const [surface,file] of [['desktop','desktop/export-pairs/results.json'],['native','android/d1-pairs/results-all-wholeapp-d1-1792300555382.json']]){
  const r=json(dir+'/'+file),groups=[];
  for(const id of new Set(r.rows.map(x=>x.id)))for(const first of [true,false]){
    const rows=r.rows.filter(x=>x.id===id&&x.warmup===first),a=rows.filter(x=>x.variant==='baseline'),b=rows.filter(x=>x.variant==='candidate');
    const am=median(a.map(x=>x.cpuMs)),bm=median(b.map(x=>x.cpuMs));
    groups.push({id,first,baselineTrials:a.length,candidateTrials:b.length,baselineMedian:am,candidateMedian:bm,deltaMs:bm-am,deltaPercent:100*(bm/am-1),candidateSlowerPairs:a.filter(x=>b.find(y=>y.pair===x.pair).cpuMs>x.cpuMs).length,allOutputHashesEqual:new Set(rows.map(x=>x.outputHash)).size===1,maxTask:Math.max(...rows.map(x=>x.maxTaskMs))});
  }
  record.pairReceipts[surface]={trials:r.rows.length,errors:r.errors,groups};
}
record.retainedOutputWitnesses=[];
const native=json(dir+'/android/native-output-manifest.json');
for(const f of new Map(native.outputs.map(x=>[x.file,x])).values()){
 const p=dir+'/android/'+f.file;
 record.retainedOutputWitnesses.push({file:p,hashMatches:fs.existsSync(p)&&sha(fs.readFileSync(p))===f.sha256,tracked:tracked.has(p)});
}
const desktop=json(dir+'/desktop/export-pairs/results.json');
for(const id of new Set(desktop.rows.map(x=>x.id)))for(const variant of ['baseline','candidate']){
 const f=fs.readdirSync(dir+'/desktop/export-pairs').find(f=>f.startsWith(id+'-'+variant+'.'));
 const p=dir+'/desktop/export-pairs/'+f,expected=desktop.rows.find(x=>x.id===id&&x.variant===variant).outputHash;
 record.retainedOutputWitnesses.push({file:p,hashMatches:!!f&&sha(fs.readFileSync(p))===expected,tracked:tracked.has(p)});
}
record.totalTrialOutputs=Object.values(record.pairReceipts).reduce((n,r)=>n+r.trials,0);
record.summary={outputWitnesses:record.retainedOutputWitnesses.length,hashMismatches:record.retainedOutputWitnesses.filter(x=>!x.hashMatches),untracked:record.retainedOutputWitnesses.filter(x=>!x.tracked).map(x=>x.file)};
const onebit=json(dir+'/desktop/interactions-baseline/onebit-outputs.json').map(x=>({file:dir+'/desktop/interactions-baseline/'+x.style+'.png',sha256:x.sha256}));
onebit.push({file:dir+'/desktop/interactions-baseline/glow-keep.png'});
const witnesses={note:'Native encoded output witnesses, not screenshots or generated input fixtures. Exact canonical pairs represent all 280 first/warm trial outputs; duplicate trial copies are not required.',canonical:record.retainedOutputWitnesses.map(x=>x.file),onebitAndKeep:onebit.map(x=>x.file),nativeOutputFilesToForceStage:[...record.summary.untracked,...onebit.filter(x=>!tracked.has(x.file)).map(x=>x.file)],onebitHashChecks:onebit.map(x=>({file:x.file,exists:fs.existsSync(x.file),hashMatches:x.sha256?sha(fs.readFileSync(x.file))===x.sha256:null}))};
fs.writeFileSync(dir+'/final-review/witness-paths.json',JSON.stringify(witnesses,null,2)+'\n');
fs.writeFileSync(dir+'/final-review/check-results.json',JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({productionDiff:record.auditProductionDiff,ownedDiff:record.ownedQuantizerDiff,lockMatches:record.lockMatchesHistorical,builds:record.replayBuilds,pairTrials:record.totalTrialOutputs,outputSummary:record.summary,nativeWarm:record.pairReceipts.native.groups.filter(x=>!x.first)},null,2));
