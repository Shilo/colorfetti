import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=import.meta.dirname;
const med=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const range=a=>({median:med(a),min:Math.min(...a),max:Math.max(...a)});
async function pairs(file,key,metric){const r=JSON.parse(await readFile(path.join(root,file))),groups=new Map();for(const row of r.rows.filter(r=>!r.warmup)){const k=key(row);if(!groups.has(k))groups.set(k,{baseline:[],candidate:[]});groups.get(k)[row.variant].push(row[metric])}return[...groups].map(([caseName,g])=>{const a=range(g.baseline),b=range(g.candidate);return{case:caseName,baseline:a,candidate:b,percentChange:a.median?(b.median/a.median-1)*100:null}})}
const kernel=await pairs('kernel-results.json',r=>JSON.stringify(r.case),'ms');
let exported;try{exported={cpu:await pairs('export-pairs/results.json',r=>r.id,'cpuMs'),elapsed:await pairs('export-pairs/results.json',r=>r.id,'elapsedMs')}}catch{}
const profiles=[];
for(const i of [0,2,3,5,6]){const p=JSON.parse(await readFile(path.join(root,'baseline-profile/sheet2048/profile-'+i+'.json'))),nodes=new Map(p.nodes.map(n=>[n.id,n.callFrame])),totals=new Map();for(let s=0;s<p.samples.length;s++){const n=nodes.get(p.samples[s]),key=n.functionName+' '+n.url+':'+n.lineNumber;totals.set(key,(totals.get(key)||0)+(p.timeDeltas[s]||0));}profiles.push({stage:i,selfSamples:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([frame,us])=>({frame,ms:us/1000}))})}
const summary={date:new Date().toISOString(),kernel,exported,profiles};await writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({kernel,exported},null,2));
