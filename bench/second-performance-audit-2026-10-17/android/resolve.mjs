// Resolve saved native CPU profiles to src file:line via the byte-identical sourcemap build.
// Usage: node resolve.mjs <receipt.json> [maps dir]
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {TraceMap,originalPositionFor}=createRequire(import.meta.url)('../../../node_modules/@jridgewell/trace-mapping');
const receipt=process.argv[2],maps=process.argv[3]||path.resolve(import.meta.dirname,'../../../.tmp/second-audit-2026-10-17/baseline-maps/dist/assets');
const r=JSON.parse(await readFile(receipt,'utf8')),cache=new Map();
async function where(f){
 const file=f.url.split('/').at(-1);if(!file.endsWith('.js'))return`${f.functionName||'(native)'} [native]`;
 if(!cache.has(file))cache.set(file,await readFile(path.join(maps,file+'.map'),'utf8').then(s=>new TraceMap(s)).catch(()=>null));
 const m=cache.get(file),o=m&&originalPositionFor(m,{line:f.lineNumber+1,column:f.columnNumber});
 return o?.source?`${o.name||f.functionName||'(anonymous)'} ${o.source.replace(/^(\.\.\/)+/,'')}:${o.line}`:`${f.functionName} ${file}:${f.lineNumber}:${f.columnNumber}`;
}
const out=[];
for(const row of r.rows.filter(x=>x.profileFile)){
 const p=JSON.parse(await readFile(path.join(path.dirname(receipt),row.profileFile),'utf8'));
 const nodes=new Map(p.nodes.map(n=>[n.id,n])),parent=new Map(),self=new Map();
 for(const n of p.nodes)for(const c of n.children||[])parent.set(c,n.id);
 p.samples.forEach((id,i)=>self.set(id,(self.get(id)||0)+(p.timeDeltas[i]||0)));
 const selfBy=new Map(),incBy=new Map();
 for(const[id,us]of self){
  const k=await where(nodes.get(id).callFrame);selfBy.set(k,(selfBy.get(k)||0)+us);
  const seen=new Set();for(let x=id;x!=null;x=parent.get(x)){const kk=await where(nodes.get(x).callFrame);if(!seen.has(kk)){seen.add(kk);incBy.set(kk,(incBy.get(kk)||0)+us)}}
 }
 const top=(m,n)=>[...m].filter(([k])=>!/^\((idle|program|root)\)/.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([frame,us])=>({frame,ms:+(us/1000).toFixed(1)}));
 out.push({stage:row.name,cpuMs:+row.cpuMs.TaskDuration.toFixed(1),maxLongTaskMs:Math.max(0,...row.longtasks.map(t=>t.duration)),self:top(selfBy,12),inclusive:top(incBy,12)});
}
await writeFile(receipt.replace(/\.json$/,'.resolved.json'),JSON.stringify(out,null,2)+'\n');
for(const s of out)console.log(`\n## ${s.stage} (cpu ${s.cpuMs}, max LT ${s.maxLongTaskMs})\n self: `+s.self.slice(0,8).map(x=>`${x.frame} ${x.ms}`).join('\n       ')+'\n incl: '+s.inclusive.slice(0,8).map(x=>`${x.frame} ${x.ms}`).join('\n       '));
