// Wave-two native A/A1/B4 triples on the USB phone (C-A1 Threshold drag, C-B4 palette PNG Save).
// Every trial runs every workload (each build is a control for the other's patch). Fresh owned
// tab per trial; never closes the shared browser. Native Saves pulled by exact name and removed;
// byte comparison is done afterwards by ab-w2-summary.mjs.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sharp} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const out=path.join(import.meta.dirname,'ab-w2'),fx=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16');
const URLS={A:'http://localhost:5401/',A1:'http://localhost:5402/',B4:'http://localhost:5403/'};
const TRIPLES=[['A','A1','B4'],['B4','A1','A'],['A1','A','B4'],['B4','A','A1'],['A','B4','A1'],['A1','B4','A'],['A','A1','B4']],ORDER=process.env.SMOKE?['A']:TRIPLES.flat();
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
// Largest below-threshold palette PNG: 255x255 at 8 bpp packs 255*(1+255)=65280 row bytes (<=65536).
await mkdir(path.join(out,'native'),{recursive:true});
{const w=255,h=255,data=new Uint8Array(w*h*4);for(let p=0;p<w*h;p++){const x=p%w,y=(p/w)|0;data.set([x,y,(x*7+y*13)&255,255],p*4)}
 const file=path.join(out,'threshold255.png');await writeFile(file,await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer());manifest.records.push({id:'threshold255',file,localFile:file,width:w,height:h});}
const stamp=Date.now(),temp=()=>+adb('shell','dumpsys','battery').match(/temperature: (\d+)/)[1]/10;
const battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:|level:/.test(s)).map(s=>s.trim()).join(', ');
const report={stamp,triples:TRIPLES,urls:URLS,started:new Date().toISOString(),trials:[],errors:[],conditions:[],fixtures:{dragWall:['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion','kenney-sheet-1024'],tinySave:'dungeon-knight',belowThreshold:'threshold255 synthetic (8bpp, 65280 row bytes)',adverseSaves:['kenney-sheet-1024','kenney-sheet-2048']}};
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
 await reset(t,{family:'two-color',style:'checker'});await paste(t,report.fixtures.dragWall,'drag');await settled(t);await delay(500);
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
 const row=await stage(t,rows,'A1 TARGET Threshold drag window',async()=>{const t0=Date.now();await touch(t,'touchStart',geo.x,geo.y);for(let i=1;i<=40;i++){await delay(Math.max(0,t0+i*50-Date.now()));await touch(t,'touchMove',geo.x+span*i/40,geo.y);moves++}await touch(t,'touchEnd');return{dragWallMs:Date.now()-t0}});
 await delay(50);await settled(t);const doneAt=await t.page.evaluate(()=>performance.now());
 const rel=await t.page.evaluate(()=>globalThis.__releaseAt);row.releaseToCaptionMs=rel!=null?doneAt-rel:null;row.moves=moves;
 row.finalCaptions=await captions(t);row.finalValue=await slider.inputValue();row.press=press;row.startValue=geo.value;
 await t.page.getByRole('button',{name:'Style',exact:true}).click();
}
async function saveWorkload(t,rows,id,label){
 await reset(t);const payload=await paste(t,[id],'save-'+id);
 const name=payload[0].name.replace(/\.png$/,'-palette.png'),remote='/sdcard/Download/'+name;
 try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting native output '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
 await t.page.locator('.grid figure').first().locator('.caption-preview').click();await t.page.locator('dialog.image-viewer .art canvas').waitFor();await delay(400);
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});ownedRemote.push(remote);
 const row=await stage(t,rows,label,async()=>{const r=await t.page.evaluate(async()=>{globalThis.__anchorAt=undefined;const b=document.querySelector('dialog.image-viewer button[aria-label="Save image"]'),t0=performance.now();b.click();while(globalThis.__anchorAt==null)await new Promise(r=>setTimeout(r,1));return{clickToDownloadMs:__anchorAt-t0,anchorName:__anchorName}});return r});
 assert.equal(row.anchorName,name);
 const file=path.join(out,'native',name);let ok=false;for(let n=0;n<600&&!ok;n++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){await delay(250);adb('pull',remote,file);ok=true}}catch{}if(!ok)await delay(200)}assert(ok,'Native download timeout '+name);
 adb('shell','rm',remote);ownedRemote.splice(ownedRemote.indexOf(remote),1);row.output=path.relative(out,file).split(path.sep).join('/');
 await t.page.getByRole('button',{name:'Close preview',exact:true}).click();
}
async function trial(variant,triple,slot){
 const t=await openPage(variant),rows=[];t.slot=slot;
 try{
  await dragWorkload(t,rows);
  await saveWorkload(t,rows,'dungeon-knight','B4 TARGET tiny palette Save');
  await saveWorkload(t,rows,'threshold255','B4 ADVERSE below-threshold 255px palette Save');
  await saveWorkload(t,rows,'kenney-sheet-1024','B4 ADVERSE sheet1024 palette Save');
  await saveWorkload(t,rows,'kenney-sheet-2048','B4 ADVERSE sheet2048 palette Save');
 }finally{await closePage(t)}
 report.trials.push({variant,triple,slot,position:slot%3,tempC:temp(),rows});
 console.log(JSON.stringify({variant,triple,slot,temp:temp(),rows:rows.map(r=>[r.name.slice(0,22),r.cpuMs.toFixed(0),r.maxLongTaskMs.toFixed(0),(r.releaseToCaptionMs??r.clickToDownloadMs)?.toFixed(0)]),press:rows[0].press,final:rows[0].finalValue}));
}
try{
 report.browser=await bcdp.send('Browser.getVersion');report.conditions.push({at:'start',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});
 for(let i=0;i<ORDER.length;i++){while(temp()>38){report.conditions.push({at:'rest before slot '+i,tempC:temp()});await delay(60000)}await trial(ORDER[i],Math.floor(i/3),i);}
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach().catch(()=>{});
 report.conditions.push({at:'end',battery:battery(),rotation:adb('shell','wm','user-rotation').trim()});report.finished=new Date().toISOString();
 await writeFile(path.join(out,`${process.env.SMOKE?'smoke':'triples'}-${stamp}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
