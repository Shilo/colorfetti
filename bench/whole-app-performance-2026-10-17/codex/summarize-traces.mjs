import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const root=import.meta.dirname,rows=[];
for(const variant of ['baseline','candidate']){
 const trace=JSON.parse(await readFile(root+'/'+variant+'-codex-trace.json','utf8'));
 const imported=trace.records.find(r=>r.event.type==='change'&&r.event.inputValue?.endsWith('kenney-sheet-2048.png'));
 assert(imported);assert(imported.wall.some(w=>w.name?.includes('kenney-sheet-2048.png')&&w.caption?.includes('26 colors')));
 rows.push({variant,environment:trace.env,startup:trace.startup,navigation:trace.navigation,import:{firstPaintMs:imported.paints[0].at-imported.start,finalCaptionObservedAtMs:imported.end-imported.start,canvas:[imported.paints[0].width,imported.paints[0].height],rafP95Ms:imported.rafP95Ms,rafMaxMs:imported.rafMaxMs,longtasks:imported.longtasks},save:trace.records.filter(r=>r.event.label==='Save kenney-sheet-2048.png').map(r=>({windowMs:r.elapsed,rafMaxMs:r.rafMaxMs,longtasks:r.longtasks}))});
}
const before=await readFile(root+'/baseline-sheet2048.png'),after=await readFile(root+'/candidate-sheet2048.png');assert(before.equals(after));
const report={rows,encodedBytesEqual:true,sha256:sha(after),notes:['Actual Codex Browser IAB; production bundles unchanged. Optional finite probe injected only into test HTML query audit=1.','One observed pair is functional tracing and source attribution context, not a statistically supported performance comparison. Five-pair auxiliary desktop/native measurements decide acceptance.','Change-event handler to first imported canvas paint excludes chooser/file transport. A final 26-color caption was confirmed only at the end of the finite window; that is not precise count-ready latency.','Every event starts a finite rAF observation, stopped after2s or superseding interaction. rAF/observer overhead is included; these receipts cannot establish production idle polling. No CDP CPU metrics available here.','Fresh-context startup records first enabled button and first art paint, not universal startup bounds. Raw receipts preserve all preceding actions.']};
await writeFile(root+'/trace-summary.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.rows.map(r=>({variant:r.variant,firstPaintMs:r.import.firstPaintMs,rafMaxMs:r.import.rafMaxMs})),null,2));
