// C-A1 round two summary (README gate unchanged; judged on Checker, Atkinson reported separately).
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const dir=path.join(import.meta.dirname,'ab-w2b'),files=await readdir(dir);
const med=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2},pc=(b,a)=>(b-a)/a*100,fx=(x,d=1)=>x==null?'-':x.toFixed(d);
const K=[['cpuMs','renderer CPU'],['maxLongTaskMs','max Long Task'],['rafMaxMs','max rAF gap'],['releaseToCaptionMs','release→final caption'],['elapsedMs','drag window elapsed']];
let md='# C-A1 round two native A/A1 (Pixel 8 Pro, Brave)\n\nA = w2-base 5401, A1 = w2-a1 5402. Gate: README "C-A1", unchanged; judged on Checker. Wall: four distinct 512×512 crops (wave2/fixtures/kenney-crop-a..d, hashes verified before each run), 1-bit. Same touch drag as round one: calibration taps until track geometry is stable, 300 ms press without move, 40 touchMoves 50 ms apart across 40% of the real Threshold range, touchEnd. One smoke trial on A excluded (ab-w2b/smoke/).\n\n';
const verdict={};
for(const style of['checker','atkinson']){
 const f=files.filter(x=>x.startsWith(`pairs-${style}-`)).sort().at(-1);if(!f)continue;const r=JSON.parse(await readFile(path.join(dir,f),'utf8'));
 const rows=v=>r.trials.filter(t=>t.variant===v).map(t=>t.rows[0]),pairs=[...new Set(r.trials.map(t=>t.pair))];
 md+=`## ${style} (${pairs.length} pairs, order ${r.order.join(' ')})\n\nConditions: ${r.conditions.map(c=>c.at+': '+(c.battery||'temp '+c.tempC)).join('; ')}. Per-trial C: ${r.trials.map(t=>t.variant+'@'+t.tempC).join(' ')}. Errors: ${r.errors.length}.\n\n| Metric | A median | A1 median | Δ | paired Δ per pair (median) |\n|---|---:|---:|---:|---|\n`;
 const res={};
 for(const[k,l]of K){const a=med(rows('A').map(x=>x[k])),b=med(rows('A1').map(x=>x[k]));const p=pairs.map(i=>{const A=r.trials.find(t=>t.pair===i&&t.variant==='A').rows[0][k],B=r.trials.find(t=>t.pair===i&&t.variant==='A1').rows[0][k];return A?pc(B,A):null}).filter(x=>x!=null);res[k]={a,b};
  md+=`| ${l} | ${fx(a)} | ${fx(b)} | ${a?fx(pc(b,a))+'%':'-'} | ${p.length?p.map(x=>x.toFixed(0)).join(', ')+' ('+med(p).toFixed(1)+'%)':'-'} |\n`}
 const caps=[...new Set(r.trials.map(t=>JSON.stringify(t.rows[0].finalCaptions.map(c=>c.text))))],vals=[...new Set(r.trials.map(t=>t.rows[0].finalValue))];
 const press=r.trials.every(t=>{const p=t.rows[0].press;return!p.captionsChanged&&!p.busySeen&&!p.valueChanged});
 const cpu=pc(res.cpuMs.b,res.cpuMs.a),rel=res.releaseToCaptionMs,relOk=!(rel.b-rel.a>50&&pc(rel.b,rel.a)>20);
 verdict[style]={cpu,cpuOk:cpu<=-15,relOk,capsOk:caps.length===1,press};
 md+=`\nFinal captions identical in all trials: ${caps.length===1?'yes':'NO'} (${caps.join(' | ')}); final slider values: ${vals.join(', ')}. Press without move: ${press?'no caption change, no aria-busy (5 ms polling), value unchanged in every trial':'FAILED'}.\n\nAll trials (CPU / LT / rAF max / release→caption ms):\n\n| Slot | Variant | CPU | LT | rAF | release→caption | moves | drag ms |\n|---:|---|---:|---:|---:|---:|---:|---:|\n`;
 for(const t of r.trials){const x=t.rows[0];md+=`| ${t.slot} | ${t.variant} | ${fx(x.cpuMs,0)} | ${fx(x.maxLongTaskMs,0)} | ${fx(x.rafMaxMs,0)} | ${fx(x.releaseToCaptionMs,0)} | ${x.moves} | ${x.dragWallMs} |\n`}
 md+=`\nReceipt: ${f}.\n\n`;
}
const c=verdict.checker;
md+=`## Gate verdict (phone, Checker)\n\n- Drag-window renderer CPU ${c.cpu.toFixed(1)}% (need <= -15%): ${c.cpuOk?'PASS':'FAIL'}\n- Release→final caption not worse by >50 ms and >20%: ${c.relOk?'PASS':'FAIL'}\n- Final captions identical: ${c.capsOk?'PASS':'FAIL'}\n- Press without move unchanged: ${c.press?'PASS':'FAIL'}\n\nC-A1 on the phone: **${c.cpuOk&&c.relOk&&c.capsOk&&c.press?'ACCEPT':'REJECT'}**.`+(verdict.atkinson?` Atkinson (informational): CPU ${verdict.atkinson.cpu.toFixed(1)}%, release ${verdict.atkinson.relOk?'ok':'worse'}, captions ${verdict.atkinson.capsOk?'identical':'DIFFER'}, press ${verdict.atkinson.press?'ok':'FAILED'}.`:'')+'\n';
await writeFile(path.join(dir,'summary.md'),md);console.log(md);
