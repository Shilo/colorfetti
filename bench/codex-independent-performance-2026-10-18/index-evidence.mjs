// Integrity index, not a performance benchmark or implementation-reading proxy.
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const base=import.meta.dirname,sha=b=>createHash('sha256').update(b).digest('hex');
function walk(dir,prefix=''){const out=[];for(const name of readdirSync(dir)){const file=path.join(dir,name),relative=prefix+name;if(statSync(file).isDirectory())out.push(...walk(file,relative+'/'));else if(relative!=='evidence-index.json'){const raw=readFileSync(file);if(name.endsWith('.json')||name.endsWith('.heapsnapshot'))JSON.parse(raw);out.push({file:relative,bytes:raw.length,rawSha256:sha(raw),...( /\.(?:json|heapsnapshot|md|mjs|js|patch|log)$/.test(name)?{canonicalLfSha256:sha(Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n')))}:{})});}}return out;}
const files=walk(base).sort((a,b)=>a.file.localeCompare(b.file));
const reportFile='docs/research/2026-10-18-independent-performance-audit.md',reportBytes=readFileSync(reportFile);
const provenance=JSON.parse(readFileSync(path.join(base,'final-provenance.json')));
if(provenance.sourceFiles.length!==96)throw Error('Inventory closure changed');
for(const surface of ['baseline','final'])for(const item of provenance.artifacts[surface]){const root=surface==='baseline'?'.tmp/codex-independent-performance-2026-10-18/current/dist':'.tmp/codex-independent-performance-2026-10-18/final/dist';if(sha(readFileSync(path.join(root,item.file)))!==item.sha256)throw Error('Frozen build changed: '+surface+'/'+item.file);}
const sourceRoot=provenance.snapshot.target;for(const f of provenance.sourceFiles)if(sha(readFileSync(path.join(sourceRoot,f.file)))!==f.rawSha256)throw Error('Frozen source changed: '+f.file);
for(const f of provenance.sourceFiles){const blob=execFileSync('git',['show','ae97d0e:'+f.file],{maxBuffer:64*1024*1024});if(sha(Buffer.from(blob.toString().replaceAll('\r\n','\n')))!==f.snapshotCanonicalLfSha256)throw Error('Validated runtime commit differs: '+f.file);}
const nativeCleanup=JSON.parse(readFileSync(path.join(base,'io-android/cleanup.json'))),desktopCleanup=JSON.parse(readFileSync(path.join(base,'desktop-cleanup.json')));
if(nativeCleanup.errors.length||!nativeCleanup.reservationReleased||desktopCleanup.remainingOwnedProcessIds.length||desktopCleanup.listenersInAuditPortRangeAfter.length)throw Error('Cleanup is incomplete');
writeFileSync(path.join(base,'evidence-index.json'),JSON.stringify({created:new Date().toISOString(),scope:'Audit evidence directory except this self-index, plus the separately hashed report. JSON parsed; frozen source/dist hashes and96source files against runtime commit rechecked. Index hashes establish artifact integrity, not reading, exhaustive tests or performance acceptance.',lineEndings:'Git may normalize text line endings; canonicalLfSha256 records reproducible text content separately from raw original-byte hashes. Binary output hashes stay exact.',runtimeCommit:'ae97d0e',runtimeSourceFilesMatchCommit:provenance.sourceFiles.length,report:{file:reportFile,bytes:reportBytes.length,rawSha256:sha(reportBytes),canonicalLfSha256:sha(Buffer.from(reportBytes.toString().replaceAll('\r\n','\n')))},files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),artifacts:files},null,2)+'\n');
console.log({artifacts:files.length,jsonValid:true,frozenSourceAndBuildsMatch:true,sourceFilesMatchCommittedRuntime:provenance.sourceFiles.length,cleanupComplete:true});
