import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decode, compare, usedColors } from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const root = import.meta.dirname;
const read = async p => JSON.parse(await readFile(`${root}/${p}`, 'utf8'));
const round = x => Math.round(x * 1000) / 1000;
const median = a => { const s = [...a].sort((a,b) => a-b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const stats = a => ({ median: round(median(a)), min: round(Math.min(...a)), max: round(Math.max(...a)), values: a.map(round) });
const paired = (off, on) => ({ off: stats(off), on: stats(on), pairedOnMinusOff: stats(on.map((v,i) => v-off[i])), pairedPercent: off.every(v=>v!==0) ? stats(on.map((v,i) => (v-off[i])/off[i]*100)) : null, onFasterPairs: on.filter((v,i) => v < off[i]).length, pairs: off.length });
const out = { baseline: '5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce', generated: new Date().toISOString(), comparisons: {}, png: [], workerResources: {}, qualifications: [] };
for (const name of ['ab-analysis','ab-bands','ab-summary','ab-caption','ab-auto-repeat']) {
  const file = (await readdir(`${root}/${name}`)).find(x => x.endsWith('.json'));
  const j = await read(`${name}/${file}`);
  assert.equal(j.errors.length, 0);
  const names = [...new Set(j.trials.flatMap(t => t.rows.map(r => r.name)))];
  const records = {};
  for (const rowName of names) {
    const rows = ['off','on'].map(variant => j.trials.filter(t => t.variant === variant).sort((a,b)=>a.pair-b.pair).map(t => t.rows.find(r=>r.name===rowName)));
    records[rowName] = {};
    for (const metric of ['cpuMs','elapsedMs','stepMs','toFinalPaintMs','lastCommitToPaintMs','exactCaptionMs','releaseToCaptionMs','maxLongTaskMs','rafMaxMs']) {
      if (rows.flat().every(r => Number.isFinite(r[metric]))) records[rowName][metric] = paired(...rows.map(rs=>rs.map(r=>r[metric])));
    }
    records[rowName].captions = rows.map(rs=>rs.map(r=>r.captions || r.finalCaptions));
  }
  out.comparisons[name] = { source: `${name}/${file}`, urls: j.urls, order: j.order, rows: records };
}
for (const folder of ['ab-compression','ab-compression-action']) for (const file of (await readdir(`${root}/${folder}`)).filter(x=>x.endsWith('.json'))) {
  const j = await read(`${folder}/${file}`);
  for (const id of [...new Set(j.rows.map(r=>r.id))]) for (const warmup of [true,false]) {
    const rows = ['baseline','candidate'].map(variant => j.rows.filter(r=>r.id===id && r.variant===variant && r.warmup===warmup).sort((a,b)=>a.pair-b.pair));
    if (!rows.every(rs=>rs.length === 5)) continue;
    for (let i=0;i<5;i++) assert.equal(rows[0][i].outputHash,rows[1][i].outputHash);
    const record = { source: `${folder}/${file}`, case: id, phase: warmup?'first-export-new-document':'repeat-export-same-document', filteredBytes: rows[0][0].filteredBytes, exactBytePairs: 5, metrics: {} };
    for (const metric of ['elapsedMs','cpuMs','scriptMs','maxTaskMs','actionToAnchorMs']) if(rows.flat().every(r=>Number.isFinite(r[metric])))record.metrics[metric]=paired(...rows.map(rs=>rs.map(r=>r[metric])));
    out.png.push(record);
  }
}
const native = `${root}/ab-summary/native`, pngs = (await readdir(native)).filter(f=>f.endsWith('.png'));
const files = await Promise.all(pngs.map(async filename => { const bytes=await readFile(`${native}/${filename}`);return { filename, bytes, image: await decode(bytes), sha256: createHash('sha256').update(bytes).digest('hex') }; }));
assert.equal(files.length,4);
for (const f of files) { assert.equal(f.image.w,2048);assert.equal(f.image.h,2048);assert.ok(usedColors(f.image.frames).length<=8);assert.deepEqual(compare(f.image.frames[0],files[0].image.frames[0]),{alphaMismatch:0,rgbMismatch:0,first:null});assert.equal(f.sha256,files[0].sha256); }
out.summaryNativeWitness = { files: files.map(f=>({filename:f.filename,sha256:f.sha256,width:f.image.w,height:f.image.h,colors:usedColors(f.image.frames).length})), oracle: 'Sharp decode plus every alpha/visible RGB byte cross-comparison across reverse/current; <=8 colors checked. Not a separately rederived limiter algorithm.' };
const wfile=(await readdir(root)).find(f=>f.startsWith('worker-resources-all-')&&f.endsWith('.json'));
const w=await read(wfile);assert.equal(w.errors.length,0);
out.workerResources={ source:wfile, memorySnapshots:w.processMemory, idle:w.noRafLoopIdle, events:w.workerEvents, documents:w.workerDocuments.map(d=>({label:d.label,workers:d.workers.map(w=>({url:w.url,sent:w.sent,received:w.received,outboundTransferBytes:w.outboundTransferBytes,inboundBufferBytes:w.inboundBufferBytes,jobs:w.jobs,terminated:w.terminated,weightedChunks:w.events.filter(e=>e.direction==='out'&&e.weighted).map(e=>e.transferBytes)}))})), qualification:w.workerQualification };
out.qualifications = [
  'The five historical A/Bs use frozen starting builds, not the later filename-only changes. B1 uses5398vs5399 with B5 off;5394 is an unused partial reversal.',
  'Main TaskDuration excludes worker CPU. RPC spans include loading/scheduling/yields/transfer and are not worker CPU. Snapshots with explicit GC are not whole-app memory bounds or sampled peaks.',
  'PNG elapsed is Playwright dispatch to native download event and excludes ADBstat/pull/Sharp validation. actionToAnchorMs isolates actual click event to native download request; it does not measure download-manager completion.',
  'Each PNG first-export phase starts a new document in the same running Brave process; repeated export is warm. Neither is browser process-cold.',
  'Original combined baseline includes a root-probe injected Worker-undefined instrumentation failure. Corrected ?native= baseline has120stages/10exactoutputs/12profiles and no page errors.',
  'Auto original adverse concern retained. One preregistered repeat fails its absolute/relative criteria; no third attempt and no same-path/JIT dismissal.',
  'B4 above-threshold1024 repeat has a modest adverse phase in both series. Its same-path implementation and opposite first-phase result are context, not evidence that a regression is impossible.',
  'Synthetic File input/drop/paste exercises production handlers, excluding OS picker/clipboard transport latency. Actual Copy write succeeded without clipboard readback.',
  'Native independent pixel oracle uses Sharp plus scalar Oklab nearest for full palette. Fourteen style outputs use frozen style algorithm outsidebrowser and independent decode/alpha/color checks.',
  'No worker-CPU profile, GPU trace, physical multi-touch pinch, physical handset rotation, OS file picker, iOS/Safari/macOS or process-cold startup was run.'
];
await writeFile(`${root}/comparative-summary.json`,JSON.stringify(out,null,2)+'\n');
const inventory=JSON.parse(await readFile(`${root}/../inventory.json`,'utf8'));
const owned=inventory.files.filter(x=>x.owner==='io-android');assert.equal(owned.length,22);
await writeFile(`${root}/coverage.json`,JSON.stringify({ count:owned.length,baseline:out.baseline,method:'Every assigned implementation file read in full, with direct callers and source-summary helper; hashes are inventory/provenance, not the evidence of reading.',files:owned.map(({file,lines,sourceSha256LF})=>({file,lines,sourceSha256LF,reviewStatus:'implementation-read',ledger:'io-android/source-review.md',currentChangeQualification:file==='src/lib/save.js'?'Initial full review and frozen profiling predate concurrent filename-only commits1fe03ed/18de3f7; parent owns final cumulative diff/smoke.':undefined}))},null,2)+'\n');
console.log('Wrote comparative-summary.json, coverage.json; independently decoded four cap8 native witnesses.');
