// Summarize wave-two triples against README "Wave-two candidates and gates" (C-A1, C-B4), unchanged.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const dir=path.join(import.meta.dirname,'ab-w2'),f=(await readdir(dir)).filter(f=>/^triples-\d+\.json$/.test(f)).sort().at(-1),r=JSON.parse(await readFile(path.join(dir,f),'utf8'));
const med=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2},pc=(b,a)=>(b-a)/a*100,fx=(x,d=1)=>x==null?'-':x.toFixed(d);
const row=(t,n)=>t.rows.find(x=>x.name===n),names=[...new Set(r.trials.flatMap(t=>t.rows.map(x=>x.name)))];
const vals=(v,n,k)=>r.trials.filter(t=>t.variant===v).map(t=>row(t,n)?.[k]);
const paired=(v,n,k)=>r.triples.map((_,i)=>{const a=row(r.trials.find(t=>t.triple===i&&t.variant==='A'),n)?.[k],b=row(r.trials.find(t=>t.triple===i&&t.variant===v),n)?.[k];return a&&b!=null?pc(b,a):null}).filter(x=>x!=null);
const metricsFor=n=>/drag/.test(n)?[['cpuMs','CPU'],['maxLongTaskMs','LT'],['rafMaxMs','rAF max'],['releaseToCaptionMs','release→caption']]:[['cpuMs','CPU'],['clickToDownloadMs','click→download'],['maxLongTaskMs','LT']];
let md=`# Wave-two native A/A1/B4 (Pixel 8 Pro, Brave)\n\nA = w2-base 5401, A1 = w2-a1 5402 (C-A1), B4 = w2-b4 5403 (C-B4); builds from 0c61dd0. Gates: README "Wave-two candidates and gates", unchanged.\nTriples: ${r.triples.map(x=>x.join(' ')).join(' / ')}. Fresh owned tab per trial; every trial runs every workload (each candidate is the other's control).\nFixtures: drag wall ${r.fixtures.dragWall.join(', ')} (4 distinct 16px sprites + sheet1024; Checker). Tiny Save ${r.fixtures.tinySave}; below-threshold ${r.fixtures.belowThreshold}; above-threshold ${r.fixtures.adverseSaves.join(', ')}. Palette Saves: fixed Resurrect 64, Oklab, no cap.\nDrag: CDP Input touch on the real Threshold range: calibration taps until track geometry is stable, press 300 ms without moving, then 40 touchMoves 50 ms apart across 40% of the track and touchEnd. Drag window = touchStart..touchEnd + 2 rAF. release→caption = slider pointerup/touchend to every count non-busy with a number (polled per rAF). click→download = in-page Save click to the app's download anchor click.\nConditions: ${r.conditions.map(c=>c.at+': '+(c.battery||'temp '+c.tempC)).join('; ')}. Per-trial C: ${r.trials.map(t=>t.variant+'@'+t.tempC).join(' ')}. Errors: ${r.errors.length}. Two smoke trials on A before the run are excluded (ab-w2/smoke/).\n\n`;
for(const v of['A1','B4']){
 md+=`## ${v} vs A (medians of 7; paired = within-triple % deltas)\n\n| Workload | Metric | A | ${v} | Δ | paired Δ (median) |\n|---|---|---:|---:|---:|---|\n`;
 for(const n of names)for(const[k,l]of metricsFor(n)){const a=med(vals('A',n,k)),b=med(vals(v,n,k)),p=paired(v,n,k);md+=`| ${n} | ${l} | ${fx(a)} | ${fx(b)} | ${a?fx(pc(b,a))+'%':'-'} | ${p.length?p.map(x=>x.toFixed(0)).join(',')+' ('+med(p).toFixed(1)+'%)':'-'} |\n`}
 md+='\n';
}
const drag='A1 TARGET Threshold drag window',tiny='B4 TARGET tiny palette Save',t255='B4 ADVERSE below-threshold 255px palette Save';
const capKey=t=>JSON.stringify(row(t,drag).finalCaptions.map(c=>c.text)),capSet=[...new Set(r.trials.map(capKey))],valSet=[...new Set(r.trials.map(t=>row(t,drag).finalValue))];
const pressOk=r.trials.every(t=>{const p=row(t,drag).press;return!p.captionsChanged&&!p.busySeen&&!p.valueChanged});
// Bytes: every Save output identical across variants per workload.
const bytes={};for(const t of r.trials)for(const x of t.rows.filter(x=>x.output)){const h=sha(await readFile(path.join(dir,x.output)));(bytes[x.name]??=new Set()).add(h)}
const bytesOk=Object.values(bytes).every(s=>s.size===1);
const floor=(v,n,k='cpuMs')=>{const a=med(vals('A',n,k)),b=med(vals(v,n,k));return!(pc(b,a)>5&&b-a>3)};
const a1cpu=pc(med(vals('A1',drag,'cpuMs')),med(vals('A',drag,'cpuMs'))),relA=med(vals('A',drag,'releaseToCaptionMs')),relB=med(vals('A1',drag,'releaseToCaptionMs'));
const relOk=!(relB-relA>50&&pc(relB,relA)>20),a1Adverse=names.filter(n=>/Save/.test(n)).every(n=>floor('A1',n)&&floor('A1',n,'clickToDownloadMs'));
const b4tiny=pc(med(vals('B4',tiny,'clickToDownloadMs')),med(vals('A',tiny,'clickToDownloadMs')));
const b4lt=med(vals('B4',t255,'maxLongTaskMs'))-med(vals('A',t255,'maxLongTaskMs'));
const b4Adverse=['B4 ADVERSE sheet2048 palette Save','B4 ADVERSE sheet1024 palette Save'].every(n=>floor('B4',n)&&floor('B4',n,'clickToDownloadMs'))&&floor('B4',drag)&&floor('B4',drag,'releaseToCaptionMs');
md+=`## Exactness\n\n- Final drag captions identical across all 21 trials: ${capSet.length===1?'yes':'NO'} (${capSet.join(' | ')}); final slider value set: ${valSet.join(', ')}.\n- Press without move: ${pressOk?'no caption change, no aria-busy observed (5 ms polling), value unchanged in every trial':'FAILED in some trial'}.\n- Native Save bytes identical across A/A1/B4 for every workload and trial: ${bytesOk?'yes':'NO'} (${Object.entries(bytes).map(([n,s])=>n.replace('B4 ','')+': '+s.size+' hash').join('; ')}).\n\n## Gate verdicts (phone)\n\n`;
md+=`- **C-A1**: drag-window CPU ${a1cpu.toFixed(1)}% (need <= -15%) ${a1cpu<=-15?'PASS':'FAIL'}; release→caption ${fx(relA)}→${fx(relB)} ms ${relOk?'PASS':'FAIL'} (fail only if >50 ms and >20% worse); captions identical ${capSet.length===1?'PASS':'FAIL'}; press-without-move ${pressOk?'PASS':'FAIL'}; Save controls floor ${a1Adverse?'PASS':'FAIL'} → phone **${a1cpu<=-15&&relOk&&capSet.length===1&&pressOk&&a1Adverse?'ACCEPT':'REJECT'}**.\n`;
md+=`- **C-B4**: tiny click→download ${b4tiny.toFixed(1)}% (need <= -15%) ${b4tiny<=-15?'PASS':'FAIL'}; 255px below-threshold max LT Δ ${b4lt.toFixed(1)} ms (need <= +5) ${b4lt<=5?'PASS':'FAIL'}; sheet1024/2048 Save + drag control floor ${b4Adverse?'PASS':'FAIL'}; bytes ${bytesOk?'PASS':'FAIL'} → phone **${b4tiny<=-15&&b4lt<=5&&b4Adverse&&bytesOk?'ACCEPT':'REJECT'}**.\n\nDesktop gates and npm test are owned by others.\n`;
md+='\n## All trials\n\n| Workload | Metric | '+r.trials.map(t=>`${t.slot}:${t.variant}`).join(' | ')+' |\n|---|---|'+r.trials.map(()=>'---:').join('|')+'|\n';
for(const n of names)for(const[k,l]of metricsFor(n))md+=`| ${n} | ${l} | `+r.trials.map(t=>fx(row(t,n)?.[k],0)).join(' | ')+' |\n';
md+=`\nReceipt: ${f}; native outputs in ab-w2/native/.\n`;
await writeFile(path.join(dir,'summary.md'),md);console.log(md);
