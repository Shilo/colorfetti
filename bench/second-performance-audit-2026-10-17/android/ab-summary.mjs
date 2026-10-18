// Summarize ab-c pairs + exact receipts against the README's declared Candidate C gates.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {decode,nearest,compare,sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../../src/lib/palette-library.js';
const dir=path.join(import.meta.dirname,'ab-c'),files=await readdir(dir);
const load=async p=>JSON.parse(await readFile(path.join(dir,files.filter(f=>f.startsWith(p)&&f.endsWith('.json')).sort().at(-1)),'utf8'));
const pairs=await load('pairs-'),exact=await load('exact-');
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const names=[...new Set(pairs.trials.flatMap(t=>t.rows.map(r=>r.name)))].filter(n=>/TARGET|ADVERSE/.test(n));
const pick=(v,n,k)=>pairs.trials.filter(t=>t.variant===v).map(t=>t.rows.find(r=>r.name===n)[k]);
let md=`# Candidate C native A/B (Pixel 8 Pro, Brave)\n\nA = base-repro (5381), B = cand-all (5382). Order ${pairs.order.join('')} (slots 0-9 = pairs 0-4), fresh owned tab per trial, every workload after a page reload and fresh import.\nDevice-state change: before this run the user closed all other phone apps and every Brave tab; Brave restarted (PID 16561 -> 32363, socket re-discovered and verified before each batch). All 10 trials ran after the change. Judge only from these pairs; absolute numbers are NOT comparable with the earlier second-baseline receipts (taken with apps/tabs open).\nConditions: ${pairs.conditions.map(c=>c.at+': '+(c.battery||'temp '+c.tempC)).join('; ')}. Per-trial temperature C: ${pairs.trials.map(t=>t.variant+t.tempC).join(' ')}. No rest needed (threshold 38 C). Temperature drifted up ~0.8 C; both variants rose over time, which ABBA alternation balances.\n\n## Medians (5 trials each; CPU = renderer TaskDuration ms, LT = max Long Task ms)\n\n| Workload | A CPU | B CPU | dCPU | A LT | B LT | dLT | Gate | Result |\n|---|---:|---:|---:|---:|---:|---:|---|---|\n`;
const verdict={};
for(const n of names){
 const [ac,bc,al,bl]=[pick('A',n,'cpuMs'),pick('B',n,'cpuMs'),pick('A',n,'maxLongTaskMs'),pick('B',n,'maxLongTaskMs')].map(med);
 const dc=(bc-ac)/ac*100,dl=al?(bl-al)/al*100:0;let gate,pass;
 if(/TARGET/.test(n)){gate='>=10% better CPU or LT';pass=dc<=-10||(al>0&&dl<=-10)}
 else{gate='not >5% and >3ms worse CPU';pass=!(dc>5&&bc-ac>3)}
 verdict[n]=pass;md+=`| ${n} | ${ac.toFixed(1)} | ${bc.toFixed(1)} | ${dc.toFixed(1)}% | ${al.toFixed(0)} | ${bl.toFixed(0)} | ${al?dl.toFixed(1)+'%':'-'} | ${gate} | ${pass?'PASS':'FAIL'} |\n`;
}
md+='\n## All trials (CPU ms / max LT ms)\n\n| Workload | '+pairs.trials.map(t=>`${t.slot}:${t.variant}`).join(' | ')+' |\n|---|'+pairs.trials.map(()=>'---:').join('|')+'|\n';
for(const n of[...new Set(pairs.trials.flatMap(t=>t.rows.map(r=>r.name)))])md+=`| ${n} | `+pairs.trials.map(t=>{const r=t.rows.find(r=>r.name===n);return`${r.cpuMs.toFixed(0)}/${r.maxLongTaskMs.toFixed(0)}`}).join(' | ')+' |\n';
md+='\n## Exact native outputs (encoded bytes A vs B)\n\n| Output | A sha256 | B equal | Independent check of A |\n|---|---|---|---|\n';
const palette=FULL_PRESETS.find(x=>x.id==='preset-res64').colors,fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8')),syn=JSON.parse(await readFile(path.join(import.meta.dirname,'fixtures/manifest.json'),'utf8'));
const src=id=>{const r=manifest.records.find(r=>r.id===id);return r?path.join(fx,r.file):path.join(import.meta.dirname,syn.records.find(r=>r.id===id).file)};
let allEqual=true;
for(const a of exact.outputs.filter(o=>o.variant==='A')){
 const b=exact.outputs.find(o=>o.variant==='B'&&o.tag===a.tag),ab=await readFile(path.join(dir,a.file)),bb=await readFile(path.join(dir,b.file)),eq=ab.equals(bb);allEqual&&=eq;
 let check='1-bit: byte equality only (no independent style oracle)';
 if(!a.oneBitStyle){const d=await decode(ab),s=await decode(await readFile(src(a.id)));let ok=d.w===s.w&&d.h===s.h&&d.frames.length===s.frames.length&&(s.frames.length<2||JSON.stringify(d.delay)===JSON.stringify(s.delay)&&d.loop===s.loop);
  for(let i=0;ok&&i<s.frames.length;i++){const c=compare(d.frames[i],nearest(s.frames[i],palette,a.settings.alphaMode==='keep'?{alphaMode:'keep'}:{}).data);ok=!c.alphaMismatch&&!c.rgbMismatch}check=ok?'scalar Oklab oracle exact (RGB, alpha, dims, delays/loop)':'ORACLE MISMATCH';if(!ok)allEqual=false}
 md+=`| ${a.tag} | ${sha(ab).slice(0,16)}… | ${eq?'yes':'NO'} | ${check} |\n`;
}
md+=`\nExact gate (phone bytes): ${allEqual?'PASS':'FAIL'} — ${exact.outputs.length/2} outputs per variant. npm test / bench/equiv.mjs / palette-qa are host gates owned by the coordinator.\n\n## Per-patch phone verdict\n\n`;
const T=n=>verdict[n],adverse=Object.entries(verdict).filter(([n])=>/ADVERSE/.test(n)).every(([,v])=>v);
for(const[p,ts]of[['C-icon',['TARGET cold Icon 2048','TARGET cold Icon 1024']],['C-sprites',['TARGET cold Stencil 2048','TARGET cold Stencil 1024']],['C-seams+C-fused',['TARGET Brightness R-G-Value 2048']]])md+=`- ${p}: targets ${ts.map(n=>n.replace('TARGET ','')+' '+(T(n)?'PASS':'FAIL')).join(', ')}; adverse ${adverse?'PASS':'FAIL'}; exact ${allEqual?'PASS':'FAIL'} → phone ${ts.every(T)&&adverse&&allEqual?'ACCEPT':ts.some(T)&&adverse&&allEqual?'PARTIAL (see targets)':'REJECT'}. Desktop gate pending (desktop profiler).\n`;
md+=`\nErrors: pairs ${pairs.errors.length}, exact ${exact.errors.length}. Receipts: ${files.filter(f=>f.endsWith('.json')).join(', ')}; native files in native/.\n`;
await writeFile(path.join(dir,'summary.md'),md);console.log(md);
// Supplementary (not the declared gate): within-pair deltas, which cancel the monotonic drift seen across slots.
let sup='\n## Supplementary: within-pair deltas (not the declared gate)\n\nEvery workload, including untouched palette paths, rose ~30-40% from slot 0 to 9 (e.g. tiny 11 styles 1216 -> 1708 ms) while temperature rose only 0.8 C, so per-variant medians carry drift noise. Each pair compares adjacent A and B.\n\n| Workload | per-pair dCPU % (pairs 0-4) | median | per-pair dLT % | median |\n|---|---|---:|---|---:|\n';
for(const n of names){const d=[],l=[];for(let p=0;p<5;p++){const a=pairs.trials.find(t=>t.pair===p&&t.variant==='A').rows.find(r=>r.name===n),b=pairs.trials.find(t=>t.pair===p&&t.variant==='B').rows.find(r=>r.name===n);d.push((b.cpuMs-a.cpuMs)/a.cpuMs*100);if(a.maxLongTaskMs)l.push((b.maxLongTaskMs-a.maxLongTaskMs)/a.maxLongTaskMs*100)}
 sup+=`| ${n} | ${d.map(x=>x.toFixed(0)).join(', ')} | ${med(d).toFixed(1)}% | ${l.map(x=>x.toFixed(0)).join(', ')||'-'} | ${l.length?med(l).toFixed(1)+'%':'-'} |\n`;}
await writeFile(path.join(dir,'summary.md'),md+sup);console.log(sup);
