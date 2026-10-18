// C-B5 phone A/B: rapid Brightness R->G->Value reanalysis on a 1-bit Checker sheet2048 and on a
// tiny 4-sprite wall. Alternating pairs, fresh owned tab per trial. Never closes the browser. No Saves.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.join(import.meta.dirname,'ab-b5'),fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const URLS={A:'http://localhost:5401/',B5:'http://localhost:5405/'};
const PAIRS=+process.env.PAIRS||7,ORDER=Array.from({length:PAIRS},(_,i)=>i%2?['B5','A']:['A','B5']).flat().slice(0,process.env.SMOKE?1:undefined);
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
await mkdir(path.join(out,'native'),{recursive:true});
const stamp=Date.now(),temp=()=>+adb('shell','dumpsys','battery').match(/temperature: (\d+)/)[1]/10;
const battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:|level:/.test(s)).map(s=>s.trim()).join(', ');
const report={stamp,order:ORDER,urls:URLS,started:new Date().toISOString(),trials:[],errors:[],conditions:[],fixtures:{target:'kenney-sheet-2048',tiny:['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion']},settings:'1-bit Checker, default inks, Brightness Luma -> R -> G -> Value'};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9361'),context=browser.contexts()[0],bcdp=await browser.newBrowserCDPSession();
const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
const storage={},ownedRemote=[];
function instrumentation(){
 if(globalThis.__wholeAudit)return;
 let rafId;const a=globalThis.__wholeAudit={longtasks:[],raf:[],active:false,start(){this.longtasks=[];this.raf=[];this.active=true;const loop=t=>{if(!this.active)return;this.raf.push(t);rafId=requestAnimationFrame(loop)};rafId=requestAnimationFrame(loop)},stop(){this.active=false;cancelAnimationFrame(rafId)}};
 new PerformanceObserver(l=>{if(a.active)for(const e of l.getEntries())a.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask'});
 const old=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(...args){const v=old.apply(this,args);if(this.canvas.closest('.grid,.image-viewer'))this.canvas.__wholePaintAt=performance.now();return v};
 const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){globalThis.__anchorAt=performance.now();globalThis.__anchorName=this.download}return click.call(this)};
}
async function openPage(variant){
 const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.addInitScript(instrumentation);await page.goto(URLS[variant]+'?audit=secondaudit-w2-'+stamp);
 if(!storage[variant])storage[variant]=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 await cdp.send('Performance.enable');return{page,cdp,errors,variant};
}
async function closePage(t){
 await t.page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage[t.variant]).catch(e=>report.errors.push('storage restore '+e.message));
 await t.cdp.detach().catch(()=>{});await t.page.close();if(t.errors.length)report.errors.push(...t.errors);
}
const metrics=async t=>Object.fromEntries((await t.cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
async function stage(t,rows,name,fn){
 const a=await metrics(t),start=await t.page.evaluate(()=>{__wholeAudit.start();return performance.now()});
 const extra=await fn(start);await t.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await metrics(t);
 const h=await t.page.evaluate(start=>{const a=__wholeAudit,g=a.raf.slice(1).map((x,i)=>x-a.raf[i]);a.stop();return{elapsedMs:performance.now()-start,maxLongTaskMs:Math.max(0,...a.longtasks.map(x=>x.duration)),longtasks:a.longtasks.length,rafMaxMs:Math.max(0,...g)}},start);
 const row={name,cpuMs:(b.TaskDuration-a.TaskDuration)*1000,startedAt:start,...h,...extra};rows.push(row);return row;
}
async function reset(t,settings={}){await t.page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},{...seed,...settings});await t.page.reload();await t.page.locator('.grid canvas').first().waitFor();}
async function paste(t,ids,caseName){
 const records=ids.map(id=>manifest.records.find(r=>r.id===id));assert(records.every(Boolean),ids.join());
 const payload=await Promise.all(records.map(async(r,i)=>({name:`secondaudit-w2-${t.variant}-${stamp}-s${t.slot}-${caseName}-${i}-${path.basename(r.file)}`,type:'image/png',base64:(await readFile(r.localFile||path.join(fx,r.file))).toString('base64')})));
 await t.page.evaluate(ps=>{const dt=new DataTransfer();for(const p of ps)dt.items.add(new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},payload);
 await t.page.waitForFunction(names=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length===names.length&&fs.every((f,i)=>f.querySelector('.caption-preview')?.textContent.includes(names[i].replace(/\.[^.]+$/,''))&&f.querySelector('.art canvas')?.__wholePaintAt)},payload.map(p=>p.name));
 return payload;
}
// Exact captions: every figure has a non-busy count with a number (optionally <= cap) and painted after `since`.
const exact=(t,since=0,cap=0)=>t.page.waitForFunction(({since,cap})=>{const fs=[...document.querySelectorAll('.grid figure')];if(!fs.length)return false;
 for(const f of fs){const c=f.querySelector('.caption-color-count'),n=+(c?.textContent.match(/\d+/)?.[0]);if(!c||c.getAttribute('aria-busy')==='true'||!n||(cap&&n>cap)||!(f.querySelector('.art canvas')?.__wholePaintAt>=since))return false}
 return performance.now()},{since,cap},{polling:'raf'}).then(h=>h.jsonValue());
const captions=t=>t.page.evaluate(()=>[...document.querySelectorAll('.grid figure .dim')].map(d=>d.textContent.trim()));
async function importExact(t,rows,ids,label,settings={}){
 await reset(t,settings);const records=ids.map(id=>manifest.records.find(r=>r.id===id));assert(records.every(Boolean),ids.join());
 const payload=await Promise.all(records.map(async(r,i)=>({name:`secondaudit-b1-${t.variant}-${stamp}-s${t.slot}-${i}-${path.basename(r.file)}`,type:r.file.endsWith('.gif')?'image/gif':'image/png',base64:(await readFile(path.join(fx,r.file))).toString('base64')})));
 await t.page.evaluate(ps=>{globalThis.__wholeFiles=ps.map(p=>new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}))},payload);
 const row=await stage(t,rows,label,async start=>{await t.page.evaluate(()=>{const dt=new DataTransfer();for(const f of __wholeFiles)dt.items.add(f);delete globalThis.__wholeFiles;document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
  await t.page.waitForFunction(n=>document.querySelectorAll('.grid figure').length===n&&!document.querySelector('.example-add'),payload.length);const done=await exact(t,start);return{exactCaptionMs:done-start}});
 row.captions=await captions(t);return payload;
}
// Rapid Brightness R -> G -> Value through the real Style panel buttons (as in earlier rounds).
// Window: first click .. final current paint after the last commit (+2 rAF). Elapsed to final paint
// is measured in page time from the window start.
async function brightness(t,rows,ids,prefix){
 await reset(t,{family:'two-color',style:'checker'});const records=ids.map(id=>manifest.records.find(r=>r.id===id));assert(records.every(Boolean),ids.join());
 const payload=await Promise.all(records.map(async(r,i)=>({name:`secondaudit-b5-${t.variant}-${stamp}-s${t.slot}-${i}-${path.basename(r.file)}`,type:'image/png',base64:(await readFile(path.join(fx,r.file))).toString('base64')})));
 await t.page.evaluate(ps=>{const dt=new DataTransfer();for(const p of ps)dt.items.add(new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},payload);
 await t.page.waitForFunction(n=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length===n&&!document.querySelector('.example-add')&&fs.every(f=>f.querySelector('.art canvas')?.__wholePaintAt)},payload.length);
 await t.page.waitForFunction(()=>[...document.querySelectorAll('.grid figure .caption-color-count')].every(c=>c.getAttribute('aria-busy')!=='true'),null,{polling:'raf'});await delay(500);
 await t.page.getByRole('button',{name:'Style',exact:true}).click();await t.page.getByRole('button',{name:/^Brightness:/}).click();await delay(400);
 await stage(t,rows,prefix+' Brightness R-G-Value',async start=>{await t.page.getByRole('button',{name:'R',exact:true}).click();await t.page.getByRole('button',{name:'G',exact:true}).click();const f=t.page.getByRole('button',{name:'Value',exact:true});await f.evaluate(b=>b.addEventListener('click',()=>globalThis.__lastCommitAt=performance.now(),{once:true}));await f.click();
  const done=await t.page.waitForFunction(()=>{if(JSON.parse(localStorage.getItem('colorfetti')).settings.checker.source!=='value')return false;const fs=[...document.querySelectorAll('.grid figure')];return fs.every(f=>f.querySelector('.art canvas')?.__wholePaintAt>=__lastCommitAt)&&[...document.querySelectorAll('.grid figure .caption-color-count')].every(c=>c.getAttribute('aria-busy')!=='true')?Math.max(...fs.map(f=>f.querySelector('.art canvas').__wholePaintAt)):false},null,{polling:'raf'}).then(h=>h.jsonValue());
  return{toFinalPaintMs:done-start,lastCommitToPaintMs:done-await t.page.evaluate(()=>__lastCommitAt)}});
 rows.at(-1).captions=await t.page.evaluate(()=>[...document.querySelectorAll('.grid figure .dim')].map(d=>d.textContent.trim()));
 await t.page.getByRole('button',{name:'Style',exact:true}).click();
}
async function trial(variant,triple,slot){
 const t=await openPage(variant),rows=[];t.slot=slot;
 try{
  await brightness(t,rows,report.fixtures.tiny,'ADVERSE tiny wall');
  await brightness(t,rows,['kenney-sheet-2048'],'TARGET sheet2048');
 }finally{await closePage(t)}
 report.trials.push({variant,pair:triple,slot,tempC:temp(),rows});
 console.log(JSON.stringify({variant,slot,temp:temp(),rows:rows.map(r=>[r.name.slice(0,16),r.cpuMs.toFixed(0),r.maxLongTaskMs.toFixed(0),r.rafMaxMs.toFixed(0),r.toFinalPaintMs?.toFixed(0)]),caps:rows.at(-1).captions}));
}
try{
 report.browser=await bcdp.send('Browser.getVersion');report.conditions.push({at:'start',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});
 for(let i=0;i<ORDER.length;i++){if(/isKeyguardShowing=true/.test(adb('shell','dumpsys','window'))||!/mWakefulness=Awake/.test(adb('shell','dumpsys','power'))){report.errors.push('Device locked or asleep before slot '+i+'; stopped, completed trials kept');break}while(temp()>38){report.conditions.push({at:'rest before slot '+i,tempC:temp()});await delay(60000)}await trial(ORDER[i],Math.floor(i/2),i);}
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach().catch(()=>{});
 report.conditions.push({at:'end',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});report.finished=new Date().toISOString();
 await writeFile(path.join(out,`${process.env.SMOKE?'smoke':'pairs'}-${stamp}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
