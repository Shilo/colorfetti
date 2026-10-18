import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const input=process.argv[2];assert.ok(input,'Pass an owned .heapsnapshot path');
const h=JSON.parse(await readFile(input,'utf8')),nf=h.snapshot.meta.node_fields,ef=h.snapshot.meta.edge_fields,ns=nf.length,es=ef.length;
const ni=Object.fromEntries(nf.map((k,i)=>[k,i])),ei=Object.fromEntries(ef.map((k,i)=>[k,i])),nt=h.snapshot.meta.node_types[ni.type],et=h.snapshot.meta.edge_types[ei.type],N=h.nodes.length/ns;
const name=i=>h.strings[h.nodes[i*ns+ni.name]],type=i=>nt[h.nodes[i*ns+ni.type]],size=i=>h.nodes[i*ns+ni.self_size];
const starts=new Uint32Array(N+1);for(let i=0;i<N;i++)starts[i+1]=starts[i]+h.nodes[i*ns+ni.edge_count]*es;
const targets=[];for(let i=0;i<N;i++)if(size(i)>=65536&&/ArrayBufferData|backing store|array buffer/i.test(name(i)))targets.push(i);
targets.sort((a,b)=>size(b)-size(a));
const parent=new Int32Array(N).fill(-1),edgeAt=new Int32Array(N).fill(-1),q=new Uint32Array(N);let head=0,tail=1;q[0]=0;parent[0]=0;
while(head<tail){const u=q[head++];for(let e=starts[u];e<starts[u+1];e+=es){const t=et[h.edges[e+ei.type]],v=h.edges[e+ei.to_node]/ns;if(t==='weak'||parent[v]!==-1)continue;parent[v]=u;edgeAt[v]=e;q[tail++]=v;}}
const edgeName=e=>{const t=et[h.edges[e+ei.type]],x=h.edges[e+ei.name_or_index];return t==='element'||t==='hidden'?`${t}:${x}`:h.strings[x]};
const path=i=>{const p=[];let cursor=i;for(let step=0;step<80;step++){const e=edgeAt[cursor];p.push({index:cursor,id:h.nodes[cursor*ns+ni.id],type:type(cursor),name:name(cursor),selfSize:size(cursor),via:e>=0?edgeName(e):null});if(cursor===0||parent[cursor]<0)break;cursor=parent[cursor];}return p.reverse()};
const selected=targets.slice(0,12).map(i=>({index:i,name:name(i),size:size(i),path:path(i)}));
const out={input,nodeCount:N,largeBackingCount:targets.length,largeBackingBytes:targets.reduce((n,i)=>n+size(i),0),selected,qualification:'Breadth-first paths ignore weak edges but are diagnostic, not a complete V8 ephemeron or native DOM ownership proof. Paths and controlled behavior must agree.'};
await writeFile(input+'.paths.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
