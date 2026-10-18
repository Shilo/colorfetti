// Artifact-only adversarial verification. No browser/device access or new timing.
// Run from the repository root: node bench/codex-performance-adversarial-review-2026-10-18/evidence-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {decode, nearest, compare} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';

const audit='bench/codex-independent-performance-2026-10-18';
const output='bench/codex-performance-adversarial-review-2026-10-18/evidence-results.json';
const baseline='5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce';
const read=f=>fs.readFileSync(f);
const json=f=>JSON.parse(read(f));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=b=>Buffer.from(b.toString().replaceAll('\r\n','\n'));
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results={created:new Date().toISOString(),head:git('rev-parse','HEAD').toString().trim(),baseline,
  qualification:'Fresh checks of retained artifacts only. No new browser/device execution, timing, peak-memory measurement or whole-app regression guarantee.'};

const index=json(audit+'/evidence-index.json');
const mismatches=[];
for(const a of index.artifacts){
  const bytes=read(audit+'/'+a.file);
  if(sha(a.canonicalLfSha256?canonical(bytes):bytes)!==(a.canonicalLfSha256||a.rawSha256))mismatches.push(a.file);
}
assert.equal(mismatches.length,0);
results.integrity={checked:index.artifacts.length,mismatches};
const inventory=json(audit+'/inventory.json');
const seen=new Set(inventory.files.map(x=>x.file));
const tracked=git('ls-tree','-r','--name-only',baseline).toString().trim().split('\n');
const omitted=tracked.filter(f=>((f.startsWith('src/')&&!f.includes('.test.')&&!f.startsWith('src/assets/')&&!f.includes('/fixtures/'))||(f.startsWith('build/')&&!f.includes('.test.'))||['index.html','package.json','package-lock.json','vite.config.js','.github/workflows/deploy.yml'].includes(f))&&!seen.has(f));
assert.equal(omitted.length,0);
results.inventory={entries:inventory.files.length,omitted,
  qualification:'Checks inventory completeness under its declared implementation/configuration boundaries, not proof that authors read every line.'};

results.focus=[];
const decision=json(audit+'/io-android/preview-trigger-final-decision.json');
for(const round of decision.rounds){
  const receipt=json(audit+'/io-android/'+round.source),summary={source:round.source,methods:{},pngHashes:[]};
  assert.deepEqual(receipt.errors,[]);
  assert.equal(receipt.rows.length,20);
  for(const method of ['keyboard','pointer']){
    const rows=v=>receipt.rows.filter(x=>x.method===method&&x.variant===v).sort((a,b)=>a.pair-b.pair);
    const a=rows('baseline'),b=rows('candidate');
    assert.equal(a.length,5);assert.equal(b.length,5);
    for(const row of [...a,...b]){assert.equal(row.focusCorrect,true);assert.equal(row.viewerRemoved,true);}
    summary.methods[method]={};
    for(const metric of ['rendererCpuMs','eventToSettledMs']){
      const delta=b.map((x,i)=>x[metric]-a[i][metric]);
      const pct=b.map((x,i)=>(x[metric]-a[i][metric])/a[i][metric]*100);
      const observed={pairedDeltaMedian:median(delta),pairedPercentMedian:median(pct),candidateWorsePairs:delta.filter(x=>x>0).length};
      assert.ok(Math.abs(observed.pairedDeltaMedian-round.methods[method][metric].pairedDelta.median)<1e-9);
      summary.methods[method][metric]=observed;
    }
  }
  for(const a of receipt.outputs){
    const file=audit+'/io-android/'+round.source.replace('.json','-'+a.variant+'.png');
    assert.equal(sha(read(file)),a.sha256);
    summary.pngHashes.push({variant:a.variant,sha256:a.sha256});
  }
  assert.equal(summary.pngHashes[0].sha256,summary.pngHashes[1].sha256);
  results.focus.push(summary);
}

const retention=label=>json(audit+'/io-android/'+label).snapshots;
const initial=retention('retention-probe-1792320293818.json');
const candidate=retention('retention-preview-trigger-fixed-1792320712815.json');
const backing=(rows,label)=>rows.find(x=>x.label===label).heap.backingStorageSize;
results.memory={neverPreviewBytes:backing(initial,'no-preview removed after11s+twoGC'),baselinePreviewBytes:backing(initial,'preview-close removed after11s+twoGC'),replacementBytes:backing(initial,'tiny preview replaced old trigger, removed after11s+twoGC'),candidatePreviewBytes:backing(candidate,'preview-close removed after11s+twoGC')};
results.memory.releasedBytes=results.memory.baselinePreviewBytes-results.memory.candidatePreviewBytes;
assert.equal(results.memory.releasedBytes,22380821);
assert.ok(results.memory.candidatePreviewBytes<2000000);

// The palette data are unchanged from the audit baseline; the decoder and scalar
// nearest oracle import no app conversion functions. One-bit exports are excluded.
assert.equal(sha(canonical(read('src/lib/palette-library.js'))),sha(canonical(git('show',baseline+':src/lib/palette-library.js'))));
const rec=json(audit+'/io-android/final-cumulative-smoke-1792321456883.json');
const dir=audit+'/io-android/final-cumulative-smoke';
const fx='bench/practical-workloads-2026-10-16/fixtures';
const colors=FULL_PRESETS.find(p=>p.id==='preset-res64').colors;
results.nativeOutputs={checks:[],frames:0,pixels:0,errors:0};
async function exact(bytes,file,receipt){
  assert.equal(sha(bytes),receipt.sha256);
  const source=await decode(read(fx+'/'+file)),actual=await decode(bytes);
  assert.equal(actual.w,source.w);assert.equal(actual.h,source.h);
  assert.deepEqual(actual.delay,source.delay);assert.equal(actual.loop,source.loop);
  assert.equal(actual.frames.length,source.frames.length);
  for(let i=0;i<source.frames.length;i++){
    assert.deepEqual(compare(actual.frames[i],nearest(source.frames[i],colors).data),{alphaMismatch:0,rgbMismatch:0,first:null});
    results.nativeOutputs.frames++;results.nativeOutputs.pixels+=actual.w*actual.h;
  }
  results.nativeOutputs.checks.push({source:file,sha256:receipt.sha256,frames:actual.frames.length});
}
for(const a of rec.outputs.filter(x=>x.name&&!x.name.includes('-onebit-')))
  await exact(read(dir+'/'+a.name),a.name.includes('-full-gif-')?'kenney-motion-256.gif':'dungeon-wizard.png',a);
const zip=unzipSync(read(dir+'/'+rec.zip.name));
for(const a of rec.outputs.filter(x=>x.zipEntry))await exact(zip[a.zipEntry],a.zipEntry.endsWith('.gif')?'real-magic.gif':'dungeon-wizard.png',a);
assert.equal(results.nativeOutputs.frames,56);assert.equal(results.nativeOutputs.pixels,3152384);
results.gateProvenance={explicitClaim:audit+'/preview-trigger-decision.md:43',originalPlan:audit+'/preview-trigger-plan.md',finding:'The original retained plan specifies latency 5ms AND5%, not the later CPU four-worse-pairs repeat rule. The artifacts do not independently establish when that CPU rule was chosen. This does not establish that it was chosen after measurement; original chat chronology was not verified.',decision:'Keep the demonstrated memory correction. CPU uncertainty remains unresolved; no blanket no-regression claim.'};
fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({output,integrity:results.integrity,inventory:results.inventory,nativeOutputs:results.nativeOutputs},null,2));
