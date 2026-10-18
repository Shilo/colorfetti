// Summarize round-two triples against the README's declared Candidate C gates (unchanged).
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const dir=path.join(import.meta.dirname,'ab-c2'),f=(await readdir(dir)).filter(f=>/^triples-\d+\.json$/.test(f)).sort().at(-1),r=JSON.parse(await readFile(path.join(dir,f),'utf8'));
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2},pc=(b,a)=>(b-a)/a*100;
const row=(t,n)=>t.rows.find(x=>x.name===n),names=[...new Set(r.trials.flatMap(t=>t.rows.map(x=>x.name)))];
const vals=(v,n,k)=>r.trials.filter(t=>t.variant===v).map(t=>row(t,n)[k]);
const paired=(v,n,k)=>r.triples.map((_,i)=>{const a=r.trials.find(t=>t.triple===i&&t.variant==='A'),b=r.trials.find(t=>t.triple===i&&t.variant===v);return row(a,n)[k]?pc(row(b,n)[k],row(a,n)[k]):null}).filter(x=>x!=null);
let md=`# Candidate C round two native A/B/B (Pixel 8 Pro, Brave)\n\nA = base-repro 5381, B1 = cand-analyze 5383 (C-seams+C-fused), B2 = cand-icon 5384 (C-icon). Gates: README "Candidate C", unchanged.\nTriples (order recorded): ${r.triples.map(x=>x.join(' ')).join(' / ')}. Positions: ${['A','B1','B2'].map(v=>v+' '+[0,1,2].map(p=>r.trials.filter(t=>t.variant===v&&t.position===p).length).join('/')).join(', ')} (first/second/third).\nFresh owned tab per trial; every trial runs every workload, each after reload + fresh import (B1 workloads on B2 and B2 workloads on B1 serve as untouched-path controls). Palette imports use the paste route; exact caption = paste dispatch to every caption count non-busy with a number (includes worker analysis outside renderer CPU).\nDevice: other apps/Brave tabs closed by the user before round one; Brave PID 32363 verified before the batch. Rest relaxed by coordinator (charging phone could not reach 35 C): rested 7.4 min, started at 35.6 C (rule: <=36.0 C or 10 min). Conditions: ${r.conditions.map(c=>c.at+': '+(c.battery||'temp '+c.tempC)).join('; ')}. Per-trial C: ${r.trials.map(t=>t.variant+'@'+t.tempC).join(' ')}. Errors: ${r.errors.length}. Judge only from these triples.\n\n`;
const sections=[['B1','B1 '],['B2','B2 ']];let verdict={};
for(const[v,p]of sections){
 md+=`## ${v} vs A\n\n| Workload | A CPU | ${v} CPU | dCPU | paired dCPU (median) | A LT | ${v} LT | dLT | paired dLT | A caption ms | ${v} caption ms | dCaption | Gate |\n|---|---:|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---|\n`;
 for(const n of names.filter(n=>n.startsWith(p))){
  const[ac,bc,al,bl]=[vals('A',n,'cpuMs'),vals(v,n,'cpuMs'),vals('A',n,'maxLongTaskMs'),vals(v,n,'maxLongTaskMs')].map(med);
  const cap=row(r.trials[0],n).exactCaptionMs!=null,[aC,bC]=cap?[med(vals('A',n,'exactCaptionMs')),med(vals(v,n,'exactCaptionMs'))]:[0,0];
  const dc=pc(bc,ac),dl=al?pc(bl,al):0,pd=paired(v,n,'cpuMs'),pl=paired(v,n,'maxLongTaskMs');let pass,gate;
  if(/TARGET/.test(n)){gate='>=10% better median CPU or LT';pass=dc<=-10||(al>0&&dl<=-10)}else{gate='CPU not >5% and >3ms worse';pass=!(dc>5&&bc-ac>3);if(cap&&pc(bC,aC)>5&&bC-aC>3)gate+='; caption worse (reported)'}
  verdict[v+n]=pass;
  md+=`| ${n.slice(3)} | ${ac.toFixed(1)} | ${bc.toFixed(1)} | ${dc.toFixed(1)}% | ${pd.map(x=>x.toFixed(0)).join(',')} (${med(pd).toFixed(1)}%) | ${al.toFixed(0)} | ${bl.toFixed(0)} | ${al?dl.toFixed(1)+'%':'-'} | ${pl.length?pl.map(x=>x.toFixed(0)).join(',')+' ('+med(pl).toFixed(1)+'%)':'-'} | ${cap?aC.toFixed(0):'-'} | ${cap?bC.toFixed(0):'-'} | ${cap?pc(bC,aC).toFixed(1)+'%':'-'} | ${gate}: **${pass?'PASS':'FAIL'}** |\n`;
 }
 const other=v==='B1'?'B2':'B1';md+=`\nControl (${other}'s patch is absent from ${v}; ${other} workloads on ${v} vs A, median dCPU): `+names.filter(n=>n.startsWith(other+' ')).map(n=>`${n.slice(3)} ${pc(med(vals(v,n,'cpuMs')),med(vals('A',n,'cpuMs'))).toFixed(1)}%`).join('; ')+'\n\n';
}
md+='## Verdict (phone, declared gates)\n\n';
for(const[v,patch]of[['B1','C-seams+C-fused'],['B2','C-icon']]){const ks=Object.keys(verdict).filter(k=>k.startsWith(v)),t=ks.filter(k=>/TARGET/.test(k)),ad=ks.filter(k=>/ADVERSE/.test(k));md+=`- ${patch} (${v}): targets ${t.map(k=>k.slice(v.length).replace(/^B\d TARGET /,'')+' '+(verdict[k]?'PASS':'FAIL')).join(', ')}; adverse ${ad.every(k=>verdict[k])?'PASS':'FAIL ('+ad.filter(k=>!verdict[k]).map(k=>k.slice(v.length).replace(/^B\d ADVERSE /,'')).join(', ')+')'}; exact bytes PASS (round one). Phone: **${t.every(k=>verdict[k])&&ad.every(k=>verdict[k])?'ACCEPT':'REJECT'}**.\n`}
md+='\n## All trials (CPU ms / max LT ms [/ exact caption ms])\n\n| Workload | '+r.trials.map(t=>`${t.slot}:${t.variant}`).join(' | ')+' |\n|---|'+r.trials.map(()=>'---:').join('|')+'|\n';
for(const n of names)md+=`| ${n} | `+r.trials.map(t=>{const x=row(t,n);return`${x.cpuMs.toFixed(0)}/${x.maxLongTaskMs.toFixed(0)}`+(x.exactCaptionMs!=null?'/'+x.exactCaptionMs.toFixed(0):'')}).join(' | ')+' |\n';
md+=`\nCaption texts (trial 0): ${r.trials[0].rows.filter(x=>x.captions).map(x=>x.name.slice(3)+': '+x.captions.join(',')).join('; ')}. Receipt: ${f}.\n`;
await writeFile(path.join(dir,'summary.md'),md);console.log(md);
