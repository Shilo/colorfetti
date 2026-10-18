import {IMAGE_HOLD_MS} from '../../../src/lib/image-gesture.js';
import {analyze,mask,colorize} from '../../../src/lib/recolor.js';
import {inks} from '../../../src/lib/presets.js';
import {unzipSync} from 'fflate';
// Exclusive USB native runner. Never close a shared browser or enumerate its tabs/downloads.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decode,nearest,compare,usedColors,sha} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../../src/lib/palette-library.js';
import {STYLES} from '../../../src/lib/presets.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const delay=ms=>new Promise(r=>setTimeout(r,ms)),out=import.meta.dirname;
const baseURL=process.env.QA_URL||'http://localhost:5391/',label=process.env.QA_LABEL||'baseline';
const prefix=`codexio-${label}-${Date.now()}`,fx=path.resolve(out,'../../practical-workloads-2026-10-16');
const manifest=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
try{const synthetic=JSON.parse(await readFile(path.resolve('bench/whole-app-performance-2026-10-17/android/fixtures/manifest.json'),'utf8'));manifest.records.push(...synthetic.records.map(r=>({...r,localFile:path.resolve('bench/whole-app-performance-2026-10-17/android',r.file)})))}catch{}
const palette=FULL_PRESETS.find(x=>x.id==='preset-res64').colors;
const report={harnessProvenance:'Independent inspection/adaptation of previous native runner; all results newly collected. Historical receipts not imported.',label,prefix,baseURL,started:new Date().toISOString(),baseline:'5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce',rows:[],outputs:[],errors:[],conditions:{battery:adb('shell','dumpsys','battery').split('\n').filter(s=>/powered:|status:|temperature:/.test(s)),rotation:adb('shell','wm','user-rotation').trim()},notes:['Physical USB Android native Brave; no viewport or rotation override.','File bytes/File allocation staged outside timing; synthetic browser input change/drop/paste handoff exercises actual app handlers and native decode. Picker UI latency is not measured.','Renderer metrics exclude worker CPU. Instrumentation records bounded rAF/Long Tasks/canvas writes; it cannot prove zero idle callbacks.','Native output decoding compares all visible RGB and every alpha byte; hidden alpha-zero RGB ignored.']};
await mkdir(path.join(out,label),{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9345'),context=browser.contexts()[0],page=await context.newPage(),cdp=await context.newCDPSession(page),bcdp=await browser.newBrowserCDPSession();
page.setDefaultTimeout(120000);let storage,ownedRemote=[],observerErrors=[],expectedFault=false;
page.on('pageerror',e=>{if(expectedFault)(report.expectedWorkerErrors??=[]).push(e.message);else observerErrors.push(e.stack)});
const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
function instrumentation(){
 if(globalThis.__wholeAudit)return;
 let rafId;const a=globalThis.__wholeAudit={longtasks:[],raf:[],writes:0,active:false,start(){this.longtasks=[];this.raf=[];this.active=true;const loop=t=>{if(!this.active)return;this.raf.push(t);rafId=requestAnimationFrame(loop)};rafId=requestAnimationFrame(loop)},stop(){this.active=false;cancelAnimationFrame(rafId)}};
 new PerformanceObserver(l=>{if(a.active)for(const e of l.getEntries())a.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask'});
 const old=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(...args){const v=old.apply(this,args);if(this.canvas.closest('.grid,.image-viewer')){this.canvas.__wholePaintAt=performance.now();this.canvas.__wholePaintCount=(this.canvas.__wholePaintCount||0)+1;a.writes++}return v};
}
await page.addInitScript(instrumentation);
await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});
const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
async function stage(name,fn,{observe=0,profile=false}={}){
 const a=await metrics(),start=await page.evaluate(()=>{__wholeAudit.start();return performance.now()});
 if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start')}
 await fn(start);if(observe)await delay(observe);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await metrics();
 const health=await page.evaluate(start=>{const a=__wholeAudit,g=a.raf.slice(1).map((t,i)=>t-a.raf[i]).sort((a,b)=>a-b);a.stop();return{elapsedMs:performance.now()-start,longtasks:a.longtasks,rafMaxMs:g.at(-1)||0,rafP95Ms:g[Math.floor(g.length*.95)]||0}},start);
 const row={name,...health,cpuMs:Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(b[k]-a[k])*1000])),heapUsed:b.JSHeapUsedSize};
 if(profile){const{profile:p}=await cdp.send('Profiler.stop');const nodes=new Map(p.nodes.map(n=>[n.id,n])),sums=new Map();for(let i=0;i<(p.samples||[]).length;i++){const f=nodes.get(p.samples[i]).callFrame,k=`${f.functionName} ${f.url.split('/').at(-1)}:${f.lineNumber}`;sums.set(k,(sums.get(k)||0)+(p.timeDeltas?.[i]||0))}const f=path.join(out,label,'profiles',`${prefix}-${report.rows.length}.cpuprofile`);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,JSON.stringify(p));row.profileFile=path.relative(out,f).split(path.sep).join('/');row.top=[...sums].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([frame,us])=>({frame,ms:us/1000}));}
 report.rows.push(row);console.log(JSON.stringify({stage:name,cpu:row.cpuMs.TaskDuration,elapsed:row.elapsedMs,maxTask:Math.max(0,...row.longtasks.map(t=>t.duration))}));return row;
}
async function reset(settings={}){await page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},{...seed,...settings});await page.reload();await page.bringToFront();await page.locator('.grid canvas').first().waitFor();}
async function importRecords(ids,{route='input',caseName=ids.join('-')}={}){
 const records=ids.map(id=>manifest.records.find(r=>r.id===id));assert(records.every(Boolean));
 const payload=await Promise.all(records.map(async(r,i)=>({name:`${prefix}-${caseName}-${i}-${path.basename(r.file)}`,type:r.file.endsWith('.gif')?'image/gif':'image/png',base64:(await readFile(r.localFile||path.join(fx,r.file))).toString('base64')})));
 await page.evaluate(ps=>{globalThis.__wholeFiles=ps.map(p=>new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.type}))},payload);
 await stage(`${caseName}: ${route} import to current named wall paint`,async start=>{
  await page.evaluate(route=>{const dt=new DataTransfer();for(const f of __wholeFiles)dt.items.add(f);if(route==='input'){const n=document.querySelector('input[type=file]');n.files=dt.files;n.dispatchEvent(new Event('change',{bubbles:true}))}else if(route==='drop')document.body.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));else document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));delete globalThis.__wholeFiles},route);
  await page.waitForFunction(({names,start})=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length===names.length&&fs.every((f,i)=>f.querySelector('.caption-preview')?.textContent.includes(names[i].replace(/\.[^.]+$/,''))&&f.querySelector('.art canvas')?.__wholePaintAt>=start)},{names:payload.map(p=>p.name),start});
 },{profile:records.some(r=>r.width>=1024)});
 if(await page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti')).family==='full-palette')) await stage(caseName+': exact full-clip captions ready',async()=>{await page.waitForFunction(()=>[...document.querySelectorAll('.grid figure')].every(f=>{const c=f.querySelector('.caption-color-count');return c&&c.getAttribute('aria-busy')!=='true'}))});
 report.lastWall=await page.locator('.grid figure').evaluateAll(fs=>fs.map(f=>({name:f.querySelector('.caption-preview')?.textContent,caption:f.querySelector('.dim')?.textContent,width:f.querySelector('.art canvas')?.width,height:f.querySelector('.art canvas')?.height})));
 return{records,payload};
}
async function control(key){if(!await page.locator('.palette-settings-panel').count())await page.getByRole('button',{name:'Palette settings',exact:true}).click();const chip=page.locator('.palette-setting-chip').filter({hasText:key});if(await chip.count())await chip.first().click()}
async function closeSettings(){if(await page.locator('.palette-settings-panel').count())await page.getByRole('button',{name:'Palette settings',exact:true}).click()}
async function nativeSave(spec,labelName,options={}){
 const r=spec.records[0],name=spec.payload[0].name.replace(/\.(png|gif)$/,'-palette.$1'),remote='/sdcard/Download/'+name;
 try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting native output '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
 let bytes;await stage(labelName+': native Save including download manager',async()=>{
  await page.locator('.grid figure').first().locator('.caption-preview').click();await page.locator('dialog.image-viewer .art canvas').waitFor();
  await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});ownedRemote.push(remote);await page.locator('dialog.image-viewer').getByRole('button',{name:'Save image',exact:true}).click();
  const file=path.join(out,label,name);for(let n=0;n<600;n++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){await delay(250);adb('pull',remote,file);bytes=await readFile(file);break}}catch{}await delay(200)}assert(bytes,'Native download timeout');
  await page.getByRole('button',{name:'Close preview',exact:true}).click();
 });
 const decoded=await decode(bytes),source=await decode(await readFile(r.localFile||path.join(fx,r.file)));assert.equal(decoded.w,source.w);assert.equal(decoded.h,source.h);assert.equal(decoded.frames.length,source.frames.length);if(source.frames.length>1){assert.deepEqual(decoded.delay,source.delay);assert.equal(decoded.loop,source.loop)}
 for(let i=0;i<source.frames.length;i++)assert.deepEqual(compare(decoded.frames[i],nearest(source.frames[i],palette,options).data),{alphaMismatch:0,rgbMismatch:0,first:null});
 report.outputs.push({name,sha256:sha(bytes),width:decoded.w,height:decoded.h,frames:decoded.frames.length,delay:decoded.delay,loop:decoded.loop,colors:usedColors(decoded.frames).length,oracle:'independent scalar Oklab nearest; Sharp native decode',visibleRgbMismatch:0,alphaMismatch:0});adb('shell','rm',remote);ownedRemote=ownedRemote.filter(x=>x!==remote);
}

try{
 await page.goto(baseURL+'?native='+encodeURIComponent(prefix));storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));await cdp.send('Performance.enable');report.browser=await bcdp.send('Browser.getVersion');report.viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,orientation:screen.orientation.type,angle:screen.orientation.angle}));
 report.transportNotes=['All native filenames exact unique prefixes. ZIP filename altered by test-only anchor hook before real native download; content and app encoding unmodified.','1-bit reference uses frozen baseline app algorithm outside browser plus independent Sharp decode/alpha/membership; not an independent style algorithm oracle.','Real clipboard write is delegated unchanged and UI completion checked; no clipboard read/private contents captured.'];
 async function nativeFile(filename,click){
  const remote='/sdcard/Download/'+filename,local=path.join(out,label,filename);try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
  await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});let bytes;await stage('native '+filename,async()=>{const download=page.waitForEvent('download');download.catch(()=>{});ownedRemote.push(remote);await click();assert.equal((await download).suggestedFilename(),filename)});
  for(let n=0;n<200;n++){try{if(+adb('shell','stat','-c','%s',remote)>0){await delay(100);adb('pull',remote,local);bytes=await readFile(local);break}}catch{}await delay(100)}assert(bytes,'Native download did not complete');adb('shell','rm',remote);ownedRemote=ownedRemote.filter(x=>x!==remote);return bytes;
 }
 if(process.argv.includes('outputs')){
  if(process.argv.includes('styles')){for(const [style]of STYLES){await reset({family:'two-color',style});const spec=await importRecords(['dungeon-wizard'],{caseName:'style-'+style}),name=spec.payload[0].name.replace(/\.png$/,'-1bit.png');const bytes=await nativeFile(name,()=>page.locator('.export-action').click()),source=await decode(await readFile(path.join(fx,spec.records[0].file))),actual=await decode(bytes),settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti'))),set=settings.settings[style],analysis=analyze({width:source.w,height:source.h,data:source.frames[0]},set.source,set.alpha),pair=inks(settings.first,settings.second,settings.none,style),expected=colorize(mask(analysis,style,set),...pair);assert.deepEqual(compare(actual.frames[0],expected),{alphaMismatch:0,rgbMismatch:0,first:null});report.outputs.push({name,style,sha256:sha(bytes),visibleRgbMismatch:0,alphaMismatch:0,width:actual.w,height:actual.h});}
  for(const settings of[{none:1},{none:2},{first:'#123456',second:'#123456'}]){await reset({family:'two-color',style:'solid',...settings});const spec=await importRecords(['dungeon-wizard'],{caseName:'ink-'+report.outputs.length}),name=spec.payload[0].name.replace(/\.png$/,'-1bit.png'),bytes=await nativeFile(name,()=>page.locator('.export-action').click()),decoded=await decode(bytes);assert(usedColors(decoded.frames).length<=1);report.outputs.push({name,settings,sha256:sha(bytes),colors:usedColors(decoded.frames)});}
  }
  await reset();const spec=await importRecords(['dungeon-wizard','real-magic'],{caseName:'zip'}),zipName=prefix+'-native-batch.zip';await page.evaluate(name=>{const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download==='colorfetti.zip')this.download=name;return old.call(this)}},zipName);const zip=await nativeFile(zipName,()=>page.getByRole('button',{name:'Save all images',exact:true}).click()),entries=unzipSync(zip);assert.equal(Object.keys(entries).length,2);for(let i=0;i<spec.records.length;i++){const r=spec.records[i],name=spec.payload[i].name.replace(/\.(png|gif)$/,'-palette.$1'),actual=await decode(entries[name]),source=await decode(await readFile(path.join(fx,r.file)));assert.equal(actual.frames.length,source.frames.length);assert.deepEqual(actual.delay,source.delay);assert.equal(actual.loop,source.loop);for(let j=0;j<actual.frames.length;j++)assert.deepEqual(compare(actual.frames[j],nearest(source.frames[j],palette).data),{alphaMismatch:0,rgbMismatch:0,first:null});}report.zip={name:zipName,sha256:sha(zip),entries:Object.keys(entries),independentDecode:true};
  await reset();await importRecords(['dungeon-wizard'],{caseName:'clipboard'});report.clipboardCapability=await page.evaluate(()=>({write:typeof navigator.clipboard?.write,item:typeof ClipboardItem}));await page.locator('.tile-share').click();await stage('native app Copy completed',async()=>{await page.locator('dialog.sheet').getByRole('button',{name:'Copy',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.glass-toast')?.textContent.includes(' copied'))});report.clipboard={nativeWriteCompleted:true,readback:false};
 }
 if(process.argv.includes('lifecycle')){
  await reset();await importRecords(['dungeon-wizard'],{caseName:'cancel-seed'});const bytes=await readFile(path.join(fx,'fixtures/kenney-sheet-2048.png'));await page.evaluate(({base64,prefix})=>{globalThis.__cancelFiles=Array.from({length:8},(_,i)=>new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],prefix+'cancel-'+i+'.png',{type:'image/png'}))},{base64:bytes.toString('base64'),prefix});await stage('cancel live eight-sheet batch by Remove all and no stale publication',async()=>{await page.evaluate(()=>{const dt=new DataTransfer();for(const f of __cancelFiles)dt.items.add(f);const n=document.querySelector('input[type=file]');n.files=dt.files;n.dispatchEvent(new Event('change',{bubbles:true}));delete globalThis.__cancelFiles});await page.getByRole('button',{name:'Remove all images',exact:true}).click();await page.getByRole('dialog',{name:'Remove all images?',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.example-add'));await delay(800);assert.equal(await page.locator('.grid figure').count(),1);assert(await page.locator('.example-add').count())});
  await reset();await importRecords(['dungeon-wizard'],{caseName:'hold'});const art=page.locator('.grid figure .art canvas'),box=await art.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await delay(IMAGE_HOLD_MS+75);report.nativeHold={classHeld:await page.locator('.grid .held').count(),qualification:'Actual Android touch held longer than current exported450ms gesture threshold.'};assert.equal(report.nativeHold.classHeld,1);report.nativeHold.compared=true;await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>!document.querySelector('.grid .held'));report.nativeHold.released=true;
  await reset();await importRecords(['kenney-motion-128'],{caseName:'visibility'});const c=page.locator('.grid figure .art canvas');await c.scrollIntoViewIfNeeded();await delay(700);await page.locator('.caption-preview').click();await page.locator('dialog.image-viewer .art canvas').waitFor();const before=await c.evaluate(c=>c.__wholePaintCount||0);await delay(800);assert.equal(await c.evaluate(c=>c.__wholePaintCount||0),before);await page.getByRole('button',{name:'Close preview',exact:true}).click();await delay(800);assert((await c.evaluate(c=>c.__wholePaintCount||0))>before);report.hiddenWall={paused:true,resumed:true};
  await reset();await importRecords(['dungeon-wizard'],{caseName:'reuse'});const count=await page.locator('.caption-color-count').textContent();await page.locator('.tile-share').click();await page.locator('dialog.sheet').getByRole('button',{name:'Reuse colors',exact:true}).click();await page.getByRole('button',{name:'Close palette editor',exact:true}).waitFor();report.reuse={caption:count,dialogText:await page.locator('dialog[open]').textContent()};await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
 }
 if(process.argv.includes('landscape')){
  await reset();await importRecords(['dungeon-wizard','real-magic'],{caseName:'landscape'});report.rotationChanged=true;adb('shell','wm','user-rotation','lock','1');await page.waitForFunction(()=>innerWidth>innerHeight);report.landscape={actualAndroidDisplayRotation:true,handsetManuallyRotated:false,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,orientation:screen.orientation.type,angle:screen.orientation.angle}))};await page.screenshot({path:path.join(out,label,'actual-android-landscape.png')});await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.locator('.caption-preview').first().click();await page.getByRole('button',{name:'Close preview',exact:true}).click();adb('shell','wm','user-rotation','free');await page.waitForFunction(()=>innerHeight>innerWidth);report.landscape.restored=true;
 }
}catch(e){report.errors.push(e.stack);console.error(e.stack);await page.screenshot({path:path.join(out,label,`failure-${prefix}.png`)}).catch(()=>{});report.failureState=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,visualHeight:visualViewport?.height},focus:document.activeElement?.getAttribute('aria-label'),dialog:document.querySelector('dialog[open]')?.getAttribute('aria-label')})).catch(()=>null)}finally{
 if(report.rotationChanged)adb('shell','wm','user-rotation','free');
 report.errors.push(...observerErrors);if(storage)await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage).catch(e=>report.errors.push('storage restore '+e.message));
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch(e){report.errors.push('owned output cleanup '+e.message)}
 await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await cdp.detach();await bcdp.detach();await page.close();
 report.restored={rotation:adb('shell','wm','user-rotation').trim(),downloadBehavior:'native default',ownedPageClosed:true};report.finished=new Date().toISOString();if(report.targetId)await writeFile(path.join(out,'active-owned-target.json'),JSON.stringify({targetId:report.targetId,prefix,closed:true},null,2)+'\n');await writeFile(path.join(out,`${label}-${process.argv.slice(2).join('-')||'all'}-${prefix}.json`),JSON.stringify(report,null,2)+'\n');
}
// Detach by process exit only: browser.close() would terminate the user's Brave.
process.exit(report.errors.length?1:0);
