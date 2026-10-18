// Final integration: every native Save output in final/ must be byte-identical to the matching
// second-baseline output (matched by case/fixture name after the label-timestamp prefix).
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const root=import.meta.dirname,key=f=>f.replace(/^secondaudit-[a-z-]+?-\d{13}-/,'');
const outputs=async d=>(await readdir(path.join(root,d))).filter(f=>/-palette\.(png|gif)$/.test(f));
const base=new Map();for(const f of await outputs('second-baseline'))base.set(key(f),f);
const rows=[];for(const f of await outputs('final')){const b=base.get(key(f));const h=sha(await readFile(path.join(root,'final',f)));const hb=b&&sha(await readFile(path.join(root,'second-baseline',b)));rows.push({case:key(f),final:f,baseline:b??null,sha256:h,identical:!!b&&h===hb})}
const missing=[...base.keys()].filter(k=>!rows.some(r=>r.case===k));
const receipts=(await readdir(path.join(root,'final'))).filter(f=>/^final-.*\.json$/.test(f));const runs=[];
for(const f of receipts){const r=JSON.parse(await readFile(path.join(root,'final',f),'utf8'));runs.push({file:f,rows:r.rows.length,outputs:r.outputs.length,errors:r.errors,failureChecks:r.failureChecks,workerFallback:r.workerFallback,teardown:r.teardown?.map(t=>t.figures),largeOnebit:r.largeOnebit?.map(x=>x.caption),restored:r.restored})}
const result={generated:new Date().toISOString(),allIdentical:rows.length===base.size&&rows.every(r=>r.identical)&&!missing.length,rows,missing,runs};
await writeFile(path.join(root,'final','output-comparison.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({allIdentical:result.allIdentical,compared:rows.length,mismatches:rows.filter(r=>!r.identical).map(r=>r.case),missing,errors:runs.map(r=>[r.file,r.errors.length])},null,1));
