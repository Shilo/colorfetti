// Aggregate the longest contiguous non-idle sample run of one profiled stage (the long task's neighbourhood).
import {readFile} from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';
const {TraceMap,originalPositionFor}=createRequire(import.meta.url)('../../../node_modules/@jridgewell/trace-mapping');
const [receipt,stage]=process.argv.slice(2),r=JSON.parse(await readFile(receipt,'utf8')),row=r.rows.find(x=>x.name.includes(stage));
console.log(row.name,JSON.stringify(row.cpuMs),JSON.stringify(row.longtasks));
const p=JSON.parse(await readFile(path.join(path.dirname(receipt),row.profileFile),'utf8')),nodes=new Map(p.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of p.nodes)for(const c of n.children||[])parent.set(c,n.id);
const maps=path.resolve(import.meta.dirname,'../../../.tmp/second-audit-2026-10-17/baseline-maps/dist/assets'),cache=new Map();
async function where(f){const file=f.url.split('/').at(-1);if(!file.endsWith('.js'))return f.functionName||'(native)';if(!cache.has(file))cache.set(file,new TraceMap(await readFile(path.join(maps,file+'.map'),'utf8')));const o=originalPositionFor(cache.get(file),{line:f.lineNumber+1,column:f.columnNumber});return`${o.name||f.functionName} ${o.source?.replace(/^(\.\.\/)+/,'')}:${o.line}`}
const idle=id=>/^\((idle|program)\)$/.test(nodes.get(id).callFrame.functionName);let best=[0,0,0],s=0,t=0;
for(let i=0;i<p.samples.length;i++){if(idle(p.samples[i])){s=i+1;t=0}else{t+=p.timeDeltas[i];if(t>best[2])best=[s,i,t]}}
console.log('busiest run ms',best[2]/1000);const self=new Map(),inc=new Map();
for(let i=best[0];i<=best[1];i++){const id=p.samples[i],us=p.timeDeltas[i];const k=await where(nodes.get(id).callFrame);self.set(k,(self.get(k)||0)+us);const seen=new Set();for(let x=id;x!=null;x=parent.get(x)){const kk=await where(nodes.get(x).callFrame);if(!seen.has(kk)){seen.add(kk);inc.set(kk,(inc.get(kk)||0)+us)}}}
const show=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>`  ${(v/1000).toFixed(1)} ${k}`).join('\n');console.log('self\n'+show(self)+'\ninclusive\n'+show(inc));
