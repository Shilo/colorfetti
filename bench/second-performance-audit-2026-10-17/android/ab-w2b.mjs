// C-A1 round two: A vs A1 alternating pairs, Threshold touch drag on a 1-bit wall of four distinct
// 512x512 crops (each <= ONEBIT_INSPECTION_PIXELS, so counts are collected). STYLE=checker|atkinson,
// PAIRS=n. Fresh owned tab per trial; never closes the shared browser. No Saves.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.join(import.meta.dirname,'ab-w2b'),fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const URLS={A:'http://localhost:5401/',A1:'http://localhost:5402/'};
const STYLE=process.env.STYLE||'checker',PAIRS=+process.env.PAIRS||7,ORDER=Array.from({length:PAIRS},(_,i)=>i%2?['A1','A']:['A','A1']).flat().slice(0,process.env.SMOKE?1:undefined);
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
const crops=path.resolve(import.meta.dirname,'../wave2/fixtures'),cropManifest=JSON.parse(await readFile(path.join(crops,'manifest.json'),'utf8'));
for(const c of cropManifest){const file=path.join(crops,c.file);assert.equal(sha(await readFile(file)),c.sha256,'crop hash '+c.file);manifest.records.push({id:c.file.replace('.png',''),file,localFile:file,width:c.w,height:c.h})}
await mkdir(out,{recursive:true});
const stamp=Date.now(),temp=()=>+adb('shell','dumpsys','battery').match(/temperature: (\d+)/)[1]/10;
const battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:|level:/.test(s)).map(s=>s.trim()).join(', ');
const report={stamp,style:STYLE,order:ORDER,urls:URLS,started:new Date().toISOString(),trials:[],errors:[],conditions:[],fixtures:{dragWall:cropManifest.map(c=>c.file.replace('.png','')),hashesVerified:true}};
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
// Every visible count settled: no busy count, and each small sprite shows a number.
const settled=t=>t.page.waitForFunction(()=>{const cs=[...document.querySelectorAll('.grid figure .caption-color-count')];return cs.length>=4&&cs.every(c=>c.getAttribute('aria-busy')!=='true'&&/\d/.test(c.textContent))},null,{polling:'raf'});
const captions=t=>t.page.evaluate(()=>[...document.querySelectorAll('.grid figure')].map(f=>({text:f.querySelector('.dim')?.textContent.trim(),busy:f.querySelector('.caption-color-count')?.getAttribute('aria-busy')??null})));
const touch=(t,type,x,y)=>t.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,radiusX:4,radiusY:4,force:1,id:7}]});
async function dragWorkload(t,rows){
 await reset(t,{family:'two-color',style:STYLE});await paste(t,report.fixtures.dragWall,'drag');await settled(t);await delay(500);
 const before=await captions(t);
 await t.page.getByRole('button',{name:'Style',exact:true}).click();await delay(900);
 const slider=t.page.getByRole('slider',{name:'Threshold',exact:true});
 const geo=await slider.evaluate(e=>{e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),v=+e.value,thumb=26;const x=r.x+thumb/2+(v-e.min)/(e.max-e.min)*(r.width-thumb),y=r.y+r.height/2;return{x,y,left:r.x,width:r.width,value:e.value,hit:document.elementFromPoint(x,y)===e}});
 assert(geo.hit,'Threshold thumb not hit-testable '+JSON.stringify(geo));
 await t.page.evaluate(()=>{const s=document.querySelector('input[type=range][aria-label=Threshold]');globalThis.__busySeen=false;globalThis.__probe=setInterval(()=>{if(document.querySelector('.grid figure .caption-color-count[aria-busy=true]'))__busySeen=true},5);for(const k of['pointerup','pointercancel','touchend'])s.addEventListener(k,()=>{globalThis.__releaseAt??=performance.now()},{capture:true})});
 // Calibration tap: a touch sets the value under the finger, so tap once, settle, then the same point is the thumb's own value.
 // Leaving Auto can resize the track, so repeat until a tap leaves the geometry unchanged.
 const measure=()=>slider.evaluate(e=>{const r=e.getBoundingClientRect(),v=+e.value,thumb=26;const x=r.x+thumb/2+(v-e.min)/(e.max-e.min)*(r.width-thumb),y=r.y+r.height/2;return{x,y,left:r.x,width:r.width,value:e.value,hit:document.elementFromPoint(x,y)===e}});
 for(let i=0;;i++){await touch(t,'touchStart',geo.x,geo.y);await touch(t,'touchEnd');await delay(300);await settled(t);await delay(500);const g=await measure();
  if(g.left===geo.left&&g.width===geo.width){geo.value=g.value;geo.calibrationTaps=i+1;break}assert(i<4,'Threshold geometry did not settle');Object.assign(geo,g);}const before2=await captions(t);
 await t.page.evaluate(()=>{globalThis.__busySeen=false;globalThis.__probe=setInterval(()=>{if(document.querySelector('.grid figure .caption-color-count[aria-busy=true]'))__busySeen=true},5)});
 // Press and release on the thumb without moving.
 await touch(t,'touchStart',geo.x,geo.y);await delay(300);await touch(t,'touchEnd');await delay(600);
 const press=await t.page.evaluate(()=>{clearInterval(__probe);return{busySeen:__busySeen,value:document.querySelector('input[type=range][aria-label=Threshold]').value}});const afterPress=await captions(t);
 press.captionsChanged=JSON.stringify(afterPress)!==JSON.stringify(before2);press.calibratedValue=geo.value;press.calibrationTaps=geo.calibrationTaps;press.valueChanged=press.value!==geo.value;
 // Scripted drag: 40 moves, 50 ms apart, from the thumb across 40% of the track, then release.
 await t.page.evaluate(()=>{globalThis.__releaseAt=undefined});const span=geo.width*.4;let moves=0;
 const row=await stage(t,rows,`A1 TARGET Threshold drag window (${STYLE})`,async()=>{const t0=Date.now();await touch(t,'touchStart',geo.x,geo.y);for(let i=1;i<=40;i++){await delay(Math.max(0,t0+i*50-Date.now()));await touch(t,'touchMove',geo.x+span*i/40,geo.y);moves++}await touch(t,'touchEnd');return{dragWallMs:Date.now()-t0}});
 await delay(50);await settled(t);const doneAt=await t.page.evaluate(()=>performance.now());
 const rel=await t.page.evaluate(()=>globalThis.__releaseAt);row.releaseToCaptionMs=rel!=null?doneAt-rel:null;row.moves=moves;
 row.finalCaptions=await captions(t);row.finalValue=await slider.inputValue();row.press=press;row.startValue=geo.value;
 await t.page.getByRole('button',{name:'Style',exact:true}).click();
}
async function trial(variant,triple,slot){
 const t=await openPage(variant),rows=[];t.slot=slot;
 try{
  await dragWorkload(t,rows);
 }finally{await closePage(t)}
 report.trials.push({variant,pair:triple,slot,tempC:temp(),rows});
 console.log(JSON.stringify({variant,triple,slot,temp:temp(),rows:rows.map(r=>[r.cpuMs.toFixed(0),r.maxLongTaskMs.toFixed(0),r.rafMaxMs.toFixed(0),r.releaseToCaptionMs?.toFixed(0)]),press:rows[0].press,final:rows[0].finalValue}));
}
try{
 report.browser=await bcdp.send('Browser.getVersion');report.conditions.push({at:'start',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});
 for(let i=0;i<ORDER.length;i++){while(temp()>38){report.conditions.push({at:'rest before slot '+i,tempC:temp()});await delay(60000)}await trial(ORDER[i],Math.floor(i/2),i);}
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach().catch(()=>{});
 report.conditions.push({at:'end',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});report.finished=new Date().toISOString();
 await writeFile(path.join(out,`${process.env.SMOKE?'smoke':'pairs'}-${STYLE}-${stamp}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
