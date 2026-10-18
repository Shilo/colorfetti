// Fresh independent historical causal run. Prior harness inspected/adapted; no prior receipts/verdicts imported.
// C-B1 phone A/B: Max colors 2->4->8 on sheet2048 after the exact caption built the source summary,
// tiny-wall Max colors, Auto 8 sprites+effect import, sheet2048 import->exact caption. Alternating
// pairs, fresh owned tab per trial; native Save of sheet2048 at cap 8 in pairs 0-1. Never closes the browser.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.join(import.meta.dirname,'ab-summary'),fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const URLS={off:'http://localhost:5397/',on:'http://localhost:5391/'};
const PAIRS=+process.env.PAIRS||5,ORDER=Array.from({length:PAIRS},(_,i)=>i%2?['on','off']:['off','on']).flat().slice(0,process.env.SMOKE?1:undefined);
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
await mkdir(path.join(out,'native'),{recursive:true});
const stamp=Date.now(),temp=()=>+adb('shell','dumpsys','battery').match(/temperature: (\d+)/)[1]/10;
const battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:|level:/.test(s)).map(s=>s.trim()).join(', ');
const report={stamp,order:ORDER,urls:URLS,started:new Date().toISOString(),trials:[],errors:[],conditions:[],fixtures:{target:'kenney-sheet-2048',tiny:['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion'],auto:'first 8 practical sprites + real-magic GIF'},settings:'Resurrect 64, Oklab nearest, dither none, Cleanup off, alpha cut 128'};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9345'),context=browser.contexts()[0],bcdp=await browser.newBrowserCDPSession();
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
 await page.addInitScript(instrumentation);await page.goto(URLS[variant]+'?native=codexio-ab-summary-w2-'+stamp);
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
 const payload=await Promise.all(records.map(async(r,i)=>({name:`codexio-ab-summary-w2-${t.variant}-${stamp}-s${t.slot}-${caseName}-${i}-${path.basename(r.file)}`,type:'image/png',base64:(await readFile(r.localFile||path.join(fx,r.file))).toString('base64')})));
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
 const payload=await Promise.all(records.map(async(r,i)=>({name:`codexio-ab-summary-b1-${t.variant}-${stamp}-s${t.slot}-${i}-${path.basename(r.file)}`,type:r.file.endsWith('.gif')?'image/gif':'image/png',base64:(await readFile(path.join(fx,r.file))).toString('base64')})));
 await t.page.evaluate(ps=>{globalThis.__wholeFiles=ps.map(p=>new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}))},payload);
 const row=await stage(t,rows,label,async start=>{await t.page.evaluate(()=>{const dt=new DataTransfer();for(const f of __wholeFiles)dt.items.add(f);delete globalThis.__wholeFiles;document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
  await t.page.waitForFunction(n=>document.querySelectorAll('.grid figure').length===n&&!document.querySelector('.example-add'),payload.length);const done=await exact(t,start);return{exactCaptionMs:done-start}});
 row.captions=await captions(t);return payload;
}
// Max colors 2 -> 4 -> 8 through the real number field handlers (input, then change commits).
async function capSequence(t,rows,prefix){
 await t.page.getByRole('button',{name:'Palette settings',exact:true}).click();const chip=t.page.locator('.palette-setting-chip').filter({hasText:'Max colors'});if(await chip.count())await chip.first().click();
 await t.page.getByRole('spinbutton',{name:'Max colors value',exact:true}).waitFor();await delay(300);let total=0,cpu=0;
 for(const v of[2,4,8]){const row=await stage(t,rows,`${prefix} Max colors ${v}`,async()=>{const t0=await t.page.evaluate(v=>{const n=document.querySelector('input[aria-label="Max colors value"]'),t0=performance.now();n.value=String(v);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));return t0},v);const done=await exact(t,t0,v);return{stepMs:done-t0}});
  row.captions=await captions(t);total+=row.stepMs;cpu+=row.cpuMs;}
 const last=rows.slice(-3);rows.push({name:`${prefix} Max colors 2-4-8 total`,cpuMs:cpu,stepMs:total,elapsedMs:total,maxLongTaskMs:Math.max(...last.map(x=>x.maxLongTaskMs)),rafMaxMs:Math.max(...last.map(x=>x.rafMaxMs)),captions:last.at(-1).captions});
 await t.page.getByRole('button',{name:'Palette settings',exact:true}).click();
}
async function save(t,payload){
 const name=payload[0].name.replace(/\.png$/,'-palette.png'),remote='/sdcard/Download/'+name;
 try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting native output '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
 await t.page.locator('.grid figure').first().locator('.caption-preview').click();await t.page.locator('dialog.image-viewer .art canvas').waitFor();
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});ownedRemote.push(remote);await t.page.locator('dialog.image-viewer').getByRole('button',{name:'Save image',exact:true}).click();
 const file=path.join(out,'native',name);let ok=false;for(let n=0;n<600&&!ok;n++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){await delay(250);adb('pull',remote,file);ok=true}}catch{}if(!ok)await delay(200)}assert(ok,'Native download timeout '+name);
 adb('shell','rm',remote);ownedRemote.splice(ownedRemote.indexOf(remote),1);await t.page.getByRole('button',{name:'Close preview',exact:true}).click();return path.relative(out,file).split(path.sep).join('/');
}
async function trial(variant,triple,slot){
 const t=await openPage(variant),rows=[];t.slot=slot;
 try{
  await importExact(t,rows,report.fixtures.tiny,'ADVERSE tiny wall import');await capSequence(t,rows,'ADVERSE tiny wall');
  await importExact(t,rows,[...manifest.records.slice(0,8).map(r=>r.id),'real-magic'],'ADVERSE Auto 8 sprites+effect import',{paletteId:'generated-32'});
  const sheet=await importExact(t,rows,['kenney-sheet-2048'],'ADVERSE sheet2048 import');await capSequence(t,rows,'TARGET sheet2048');
  if(t.slot<4)t.output=await save(t,sheet);
 }finally{await closePage(t)}
 report.trials.push({variant,pair:triple,slot,tempC:temp(),rows,output:t.output});
 console.log(JSON.stringify({variant,slot,temp:temp(),rows:rows.filter(r=>/total|import/.test(r.name)).map(r=>[r.name.slice(0,20),r.cpuMs.toFixed(0),(r.stepMs??r.exactCaptionMs).toFixed(0)]),caps:rows.at(-1).captions}));
}
try{
 report.browser=await bcdp.send('Browser.getVersion');report.conditions.push({at:'start',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});
 for(let i=0;i<ORDER.length;i++){while(temp()>38){report.conditions.push({at:'rest before slot '+i,tempC:temp()});await delay(60000)}await trial(ORDER[i],Math.floor(i/2),i);}
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach().catch(()=>{});
 report.conditions.push({at:'end',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});report.finished=new Date().toISOString();
 await writeFile(path.join(out,`${process.env.SMOKE?'smoke':'pairs'}-${stamp}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
