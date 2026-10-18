// Summaries for the Codex challenge phone runs (retention + two deciders).
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const root=import.meta.dirname,files=await readdir(root),latest=p=>files.filter(f=>f.startsWith(p)&&f.endsWith('.json')).sort().at(-1);
const med=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2},MB=x=>x==null?'-':(x/1e6).toFixed(3),pc=(b,a)=>(b-a)/a*100;
let md='# Codex challenge: native phone evidence (Pixel 8 Pro, Brave)\n\n';
const rf=latest('retention-');if(rf){const r=JSON.parse(await readFile(path.join(root,rf),'utf8'));
 md+=`## Part 1: retention (${r.method})\n\nP = 18de3f7 :5431, H = 6f8238a :5432, F = H + trigger-release.patch :5433. Fixture kenney-motion-256.gif (256×256×48). Each trial: fresh owned tab; never-opened control (import→Remove all→11 s→2 GC) then, after reload, the scenario→Remove all→11 s→2 GC. Conditions ${r.conditions.map(c=>c.at+': '+c.battery).join('; ')}. Errors: ${r.errors.length}.\n\n| Scenario | Variant | control backingStorage MB (3 trials) | after scenario+removal MB (3 trials) | median removed MB |\n|---|---|---|---|---:|\n`;
 const groups=[...new Set(r.trials.map(t=>t.scenario+'|'+t.variant))];
 for(const g of groups){const[s,v]=g.split('|'),ts=r.trials.filter(t=>t.scenario===s&&t.variant===v);md+=`| ${s} | ${v} | ${ts.map(t=>MB(t.control?.backingStorageSize)).join(', ')} | ${ts.map(t=>MB(t.scenarioRemoved?.backingStorageSize)).join(', ')} | ${MB(med(ts.map(t=>t.scenarioRemoved?.backingStorageSize)))} |\n`}
 md+='\nFocus after close (H vs F, identical descriptors expected except the removed-image labels):\n\n';
 for(const s of['share','reuse','sharepreview']){const d=v=>[...new Set(r.trials.filter(t=>t.scenario===s&&t.variant===v).map(t=>JSON.stringify(Object.fromEntries(Object.entries(t.focus).map(([k,f])=>[k,{tag:f.tag,cls:f.cls,figure:f.figure,label:f.label?.replace(/codexchallenge-[A-Z]-\d+-\w+-\d+-/,'')}])))))];const h=d('H'),f=d('F');md+=`- ${s}: H ${h.join(' / ')}; F ${f.join(' / ')} → ${JSON.stringify(h)===JSON.stringify(f)?'same':'DIFFERENT'}\n`}
 const pv=[...new Set(r.trials.filter(t=>t.scenario==='preview').map(t=>t.variant+':'+t.focus.afterPreviewClose?.tag))];md+=`- preview (P vs H): ${pv.join(', ')}\n\nReceipt: ${rf}.\n\n`;}
for(const mode of['auto','save']){const f=latest('decide-'+mode+'/pairs-');const dir=path.join(root,'decide-'+mode);let df;try{df=(await readdir(dir)).filter(x=>/^pairs-/.test(x)).sort().at(-1)}catch{}if(!df)continue;
 const r=JSON.parse(await readFile(path.join(dir,df),'utf8')),row=t=>t.rows[0],k=mode==='auto'?'exactCaptionMs':'clickToDownloadMs',lab=mode==='auto'?'paste→exact captions':'click→download anchor';
 const pairs=[...new Set(r.trials.map(t=>t.pair))],get=(v,key)=>r.trials.filter(t=>t.variant===v).map(t=>row(t)[key]);
 const pd=key=>pairs.map(i=>{const a=row(r.trials.find(t=>t.pair===i&&t.variant==='A'))[key],b=row(r.trials.find(t=>t.pair===i&&t.variant==='B'))[key];return{d:b-a,p:pc(b,a)}});
 md+=`## Part 2${mode==='auto'?'e: Auto source-cold import (A w2-base :5401 vs B1 w2-b1 :5404)':'f: sheet1024 palette Save (A w2-base :5401 vs B4 w2-b4 :5403)'}\n\n${pairs.length} alternating pairs (${r.order.join(' ')}), fresh owned tab per trial, workload first in the tab. Errors: ${r.errors.length}. Per-trial C: ${r.trials.map(t=>t.variant+'@'+t.tempC).join(' ')}.\n\n| Metric | A median | B median | Δ | paired Δ ms per pair | paired median | B worse pairs |\n|---|---:|---:|---:|---|---:|---:|\n`;
 for(const[key,l]of[[k,lab],['cpuMs','renderer CPU'],['maxLongTaskMs','max Long Task']]){const a=med(get('A',key)),b=med(get('B',key)),p=pd(key);md+=`| ${l} | ${a.toFixed(1)} | ${b.toFixed(1)} | ${a?pc(b,a).toFixed(1)+'%':'-'} | ${p.map(x=>x.d.toFixed(1)).join(', ')} | ${med(p.map(x=>x.d)).toFixed(1)} ms (${med(p.filter(x=>isFinite(x.p)).map(x=>x.p)).toFixed(1)}%) | ${p.filter(x=>x.d>0).length}/${p.length} |\n`}
 if(mode==='auto'){const caps=new Set(r.trials.map(t=>JSON.stringify(row(t).captions)));md+=`\nExact captions identical across all trials: ${caps.size===1?'yes':'NO'}.\n`}
 else{const h=new Set();for(const t of r.trials)h.add(sha(await readFile(path.join(dir,row(t).output))));md+=`\nNative Save bytes identical across all ${r.trials.length} trials: ${h.size===1?'yes':'NO ('+h.size+' hashes)'}.\n`}
 md+=`\nReceipt: decide-${mode}/${df}.\n\n`;}
await writeFile(path.join(root,'summary.md'),md);console.log(md);
