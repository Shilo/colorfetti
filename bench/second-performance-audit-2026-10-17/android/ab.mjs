// Candidate C native A/B on the USB phone. `node ab.mjs pairs` times 5 alternating pairs
// (ABBA ABBA AB), a fresh owned tab per trial; `node ab.mjs exact` pulls native Saves only
// (decoding/hashing deferred to compare.mjs). Never closes the shared browser.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {STYLES} from '../../../src/lib/presets.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.join(import.meta.dirname,'ab-c'),fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const URLS={A:'http://localhost:5381/',B:'http://localhost:5382/'},mode=process.argv[2];
const ORDER=['A','B','B','A','A','B','B','A','A','B'];
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
const synthetic=JSON.parse(await readFile(path.join(import.meta.dirname,'fixtures/manifest.json'),'utf8'));
manifest.records.push(...synthetic.records.map(r=>({...r,localFile:path.join(import.meta.dirname,r.file)})));
const stamp=Date.now(),battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:|level:/.test(s)).map(s=>s.trim()).join(', ');
const temp=()=>+adb('shell','dumpsys','battery').match(/temperature: (\d+)/)[1]/10;
const report={mode,stamp,order:ORDER,urls:URLS,started:new Date().toISOString(),trials:[],outputs:[],errors:[],conditions:[]};
await mkdir(path.join(out,'native'),{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9361'),context=browser.contexts()[0],bcdp=await browser.newBrowserCDPSession();
const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
const storage={},ownedRemote=[];
function instrumentation(){
 if(globalThis.__wholeAudit)return;
 let rafId;const a=globalThis.__wholeAudit={longtasks:[],raf:[],active:false,start(){this.longtasks=[];this.raf=[];this.active=true;const loop=t=>{if(!this.active)return;this.raf.push(t);rafId=requestAnimationFrame(loop)};rafId=requestAnimationFrame(loop)},stop(){this.active=false;cancelAnimationFrame(rafId)}};
 new PerformanceObserver(l=>{if(a.active)for(const e of l.getEntries())a.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask'});
 const old=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(...args){const v=old.apply(this,args);if(this.canvas.closest('.grid,.image-viewer')){this.canvas.__wholePaintAt=performance.now();this.canvas.__wholePaintCount=(this.canvas.__wholePaintCount||0)+1}return v};
}
async function openPage(variant,{noWorker=false}={}){
 const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 if(noWorker)await page.addInitScript(()=>{globalThis.Worker=undefined});
 await page.addInitScript(instrumentation);await page.goto(URLS[variant]+'?audit=secondaudit-abc-'+stamp);
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
 await fn(start);await t.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await metrics(t);
 const h=await t.page.evaluate(start=>{const a=__wholeAudit;a.stop();return{elapsedMs:performance.now()-start,maxLongTaskMs:Math.max(0,...a.longtasks.map(x=>x.duration)),longtasks:a.longtasks.length}},start);
 rows.push({name,cpuMs:(b.TaskDuration-a.TaskDuration)*1000,...h});
}
async function reset(t,settings={}){await t.page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},{...seed,...settings});await t.page.reload();await t.page.locator('.grid canvas').first().waitFor();}
async function importRecords(t,rows,ids,caseName,{measure=true}={}){
 const records=ids.map(id=>manifest.records.find(r=>r.id===id));assert(records.every(Boolean),ids.join());
 const payload=await Promise.all(records.map(async(r,i)=>({name:`secondaudit-abc-${t.variant}-${stamp}-${caseName}-${i}-${path.basename(r.file)}`,type:r.file.endsWith('.gif')?'image/gif':'image/png',base64:(await readFile(r.localFile||path.join(fx,r.file))).toString('base64')})));
 await t.page.evaluate(ps=>{globalThis.__wholeFiles=ps.map(p=>new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}))},payload);
 const run=async start=>{await t.page.evaluate(()=>{const dt=new DataTransfer();for(const f of __wholeFiles)dt.items.add(f);const n=document.querySelector('input[type=file]');n.files=dt.files;n.dispatchEvent(new Event('change',{bubbles:true}));delete globalThis.__wholeFiles});
  await t.page.waitForFunction(({names,start})=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length===names.length&&fs.every((f,i)=>f.querySelector('.caption-preview')?.textContent.includes(names[i].replace(/\.[^.]+$/,''))&&f.querySelector('.art canvas')?.__wholePaintAt>=start)},{names:payload.map(p=>p.name),start})};
 if(measure)await stage(t,rows,caseName+' import',run);else await run(await t.page.evaluate(()=>performance.now()));
 return{records,payload};
}
const paintAfter=(t,start)=>t.page.waitForFunction(s=>document.querySelector('.grid figure .art canvas')?.__wholePaintAt>=s,start);
async function pickStyle(t,name){await t.page.getByRole('button',{name:'Style',exact:true}).click();await t.page.getByRole('button',{name:/^Style /}).click();await t.page.getByRole('button',{name,exact:true}).click();await t.page.getByRole('button',{name:'Style',exact:true}).click();}
async function trial(variant,pair,slot){
 const t=await openPage(variant),rows=[];
 try{
  for(const[id,size]of[['kenney-sheet-2048',2048],['kenney-sheet-1024',1024]])for(const style of['Icon','Stencil']){
   await reset(t,{family:'two-color',style:'cutout'});await importRecords(t,rows,[id],`onebit-sheet${size}-for-${style}`);
   await stage(t,rows,`TARGET cold ${style} ${size}`,async s=>{await pickStyle(t,style);await paintAfter(t,s)});}
  await reset(t,{family:'two-color',style:'checker'});await importRecords(t,rows,['kenney-sheet-2048'],'onebit-sheet2048-for-brightness');
  await t.page.getByRole('button',{name:'Style',exact:true}).click();await t.page.getByRole('button',{name:/^Brightness:/}).click();
  await stage(t,rows,'TARGET Brightness R-G-Value 2048',async()=>{await t.page.getByRole('button',{name:'R',exact:true}).click();await t.page.getByRole('button',{name:'G',exact:true}).click();const f=t.page.getByRole('button',{name:'Value',exact:true});await f.evaluate(b=>b.addEventListener('click',()=>globalThis.__lastCommitAt=performance.now(),{once:true}));await f.click();await t.page.waitForFunction(()=>document.querySelector('.grid figure .art canvas')?.__wholePaintAt>=__lastCommitAt&&JSON.parse(localStorage.getItem('colorfetti')).settings.checker.source==='value')});
  await t.page.getByRole('button',{name:'Style',exact:true}).click();
  await reset(t,{paletteId:'generated-32'});await importRecords(t,rows,[...manifest.records.slice(0,8).map(r=>r.id),'real-magic'],'ADVERSE sprites8+effect Auto');
  for(const id of['kenney-sheet-1024','kenney-sheet-2048','kenney-motion-256']){await reset(t);await importRecords(t,rows,[id],'ADVERSE '+id);}
  await reset(t,{family:'two-color',style:'cutout'});await importRecords(t,rows,['dungeon-wizard'],'tiny-styles',{measure:false});
  await stage(t,rows,'ADVERSE tiny all 11 styles',async()=>{for(const[key,name]of[...STYLES.filter(([k])=>k!=='cutout'),...STYLES.filter(([k])=>k==='cutout')]){const s=await t.page.evaluate(()=>performance.now());await pickStyle(t,name);await paintAfter(t,s)}});
  for(const style of['Icon','Stencil']){await reset(t,{family:'two-color',style:'cutout'});await importRecords(t,rows,['dungeon-knight'],'tiny-'+style,{measure:false});await stage(t,rows,`ADVERSE tiny cold ${style} 16px`,async s=>{await pickStyle(t,style);await paintAfter(t,s)});}
 }finally{await closePage(t)}
 report.trials.push({variant,pair,slot,tempC:temp(),rows});console.log(JSON.stringify({variant,pair,slot,temp:temp(),rows:rows.filter(r=>/TARGET/.test(r.name)).map(r=>[r.name,r.cpuMs.toFixed(0),r.maxLongTaskMs.toFixed(0)])}));
}
async function nativeSave(variant,id,{settings={},noWorker=false,oneBitStyle=null,tag=id}={}){
 const t=await openPage(variant,{noWorker});
 try{
  await reset(t,oneBitStyle?{family:'two-color',style:oneBitStyle}:settings);const spec=await importRecords(t,[],[id],'exact-'+tag,{measure:false});
  const name=spec.payload[0].name.replace(/\.(png|gif)$/,(oneBitStyle?'-1bit':'-palette')+'.$1'),remote='/sdcard/Download/'+name;
  try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting native output '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
  await t.page.locator('.grid figure').first().locator('.caption-preview').click();await t.page.locator('dialog.image-viewer .art canvas').waitFor();
  await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});ownedRemote.push(remote);
  await t.page.locator('dialog.image-viewer').getByRole('button',{name:'Save image',exact:true}).click();
  const file=path.join(out,'native',name);let ok=false;for(let n=0;n<600&&!ok;n++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){await delay(250);adb('pull',remote,file);ok=true}}catch{}if(!ok)await delay(200)}assert(ok,'Native download timeout '+name);
  adb('shell','rm',remote);ownedRemote.splice(ownedRemote.indexOf(remote),1);
  report.outputs.push({variant,id,tag,name,file:path.relative(out,file).split(path.sep).join('/'),settings,oneBitStyle,noWorker});console.log('saved',variant,tag);
 }finally{await closePage(t)}
}
try{
 report.browser=await bcdp.send('Browser.getVersion');report.conditions.push({at:'start',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});
 if(mode==='pairs')for(let i=0;i<ORDER.length;i++){while(temp()>38){console.log('resting, temp',temp());report.conditions.push({at:'rest before slot '+i,tempC:temp()});await delay(60000)}await trial(ORDER[i],i>>1,i);}
 if(mode==='exact')for(const v of['A','B']){
  for(const id of['kenney-sheet-1024','kenney-sheet-2048','real-magic','kenney-motion-128','kenney-motion-256','transparent32','silhouette32','entropy512'])await nativeSave(v,id);
  await nativeSave(v,'partial-glow64',{settings:{alphaMode:'keep'}});await nativeSave(v,'real-magic',{noWorker:true,tag:'worker-unavailable'});
  for(const s of['icon','stencil'])await nativeSave(v,'kenney-sheet-1024',{oneBitStyle:s,tag:'onebit-'+s+'-sheet1024'});}
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach().catch(()=>{});
 report.conditions.push({at:'end',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});report.finished=new Date().toISOString();
 await writeFile(path.join(out,`${mode}-${stamp}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
