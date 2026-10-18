import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha,decode,compare} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const{chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267',adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const out=path.join(import.meta.dirname,'d1-pairs'),desktop=path.resolve(import.meta.dirname,'../desktop'),practical=path.resolve(import.meta.dirname,'../../practical-workloads-2026-10-16/fixtures');
await mkdir(out,{recursive:true});const diag=JSON.parse(await readFile(path.join(desktop,'diagnostic-manifest.json'),'utf8'));
const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
const cases=[{id:'sheet1024',file:path.join(practical,'kenney-sheet-1024.png')},{id:'sheet2048',file:path.join(practical,'kenney-sheet-2048.png')},{id:'tiny',file:path.join(practical,'dungeon-wizard.png')},{id:'animation256',file:path.join(practical,'kenney-motion-256.gif')},{id:'glow-keep',file:path.join(desktop,'fixtures/glow64.png'),settings:{alphaMode:'keep'}},{id:'entropy256-256-rgb',file:path.join(desktop,'fixtures/entropy256.png'),settings:{paletteId:'user-audit-256',metric:'rgb'}},{id:'sheet1024-rgb',file:path.join(practical,'kenney-sheet-1024.png'),settings:{metric:'rgb'}},{id:'cap-cleanup',file:path.join(practical,'kenney-sheet-1024.png'),settings:{maxColors:8,cleanup:true}}];
const prefix='wholeapp-d1-'+Date.now(),report={date:new Date().toISOString(),prefix,baseline:'217cb64360784c066e944f8121858d7726f0e4f2',rows:[],errors:[],conditions:{battery:adb('shell','dumpsys','battery').split('\n').filter(s=>/powered:|status:|temperature:/.test(s)),rotation:adb('shell','wm','user-rotation').trim()},notes:['Actual USB Pixel8Pro native Brave; existing shared browser remains open.','Fresh owned page per pair/variant; ordinary origin storage seeded and restored. First Save after completed import/count observed separately; second Save warm. Source and quantizer already warmed before first Save. AB/BA alternates by pair. Same browser process, not process-cold.','Source bytes/File construction before timing. Save starts from settled named wall/current caption. Timing ends at native download event dispatch, before manager wait/pull/independent decode.','No rAF loop; LongTasks observer only. Main-thread TaskDuration excludes workerCPU. Exact native file bytes and every decoded visibleRGB/alpha/frame/delay/loop compared across all trials; filenames unique to this audit.']};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9351'),context=browser.contexts()[0],bcdp=await browser.newBrowserCDPSession();await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});
const hashes=new Map(),decodedExpected=new Map(),ownedRemote=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
let page,cdp,storage;const ports={baseline:5371,candidate:5372};
try{
 report.browser=await bcdp.send('Browser.getVersion');
 for(const c of cases){if(process.env.CASE&&process.env.CASE!==c.id)continue;
  const source=await readFile(c.file);for(let pair=0;pair<5;pair++)for(const variant of pair%2?['candidate','baseline']:['baseline','candidate']){
   page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>report.errors.push(e.stack));cdp=await context.newCDPSession(page);const url=`http://localhost:${ports[variant]}/?audit=${prefix}-${c.id}-${pair}-${variant}`;
   await page.goto(url);storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
   await page.addInitScript(({settings,colors})=>{localStorage.setItem('colorfetti',JSON.stringify(settings));localStorage.setItem('colorfetti-palettes-v1',JSON.stringify({version:1,palettes:[{id:'user-audit-256',name:'Audit256',colors,revision:1,source:{kind:'custom'}}]}));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1');globalThis.__d1Tasks=[];new PerformanceObserver(l=>__d1Tasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'})},{settings:{...seed,...c.settings},colors:diag.palette256});
   await page.reload();await page.bringToFront();report.viewport??=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,orientation:screen.orientation.type,angle:screen.orientation.angle}));
   const sourceName=`${prefix}-${c.id}-${pair}-${variant}${path.extname(c.file)}`;
   await page.evaluate(({base64,name,type})=>{globalThis.__d1File=new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],name,{type})},{base64:source.toString('base64'),name:sourceName,type:c.file.endsWith('.gif')?'image/gif':'image/png'});
   await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(__d1File);const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));delete globalThis.__d1File});
   await page.waitForFunction(name=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length===1&&fs[0].querySelector('.name')?.textContent===name&&fs[0].querySelector('.art canvas')?.width>0&&fs[0].querySelector('.caption-color-count[aria-busy=false]')},sourceName);
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti')));for(const[k,v]of Object.entries({...seed,...c.settings}))if(k!=='theme')assert.deepEqual(state[k],v,c.id+' setting '+k);
   await cdp.send('Performance.enable');const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
   for(let warmup=1;warmup>=0;warmup--){
    const outputName=sourceName.replace(/\.[^.]+$/,'-palette'+(c.file.endsWith('.gif')?'.gif':'.png')),remote='/sdcard/Download/'+outputName;
    try{adb('shell','stat','-c','%s',remote);throw Error('Refusing preexisting '+remote)}catch(e){if(!String(e.stderr||e.message).includes('No such file'))throw e}
    await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});const a=await metrics(),start=await page.evaluate(()=>performance.now()),d=page.waitForEvent('download',{timeout:120000});ownedRemote.push(remote);await page.locator('.export-action').click();const download=await d;assert.equal(download.suggestedFilename(),outputName);const end=await page.evaluate(()=>performance.now()),b=await metrics(),longtasks=await page.evaluate(s=>__d1Tasks.filter(l=>l.start>=s),start);
    let bytes;const local=path.join(out,outputName);for(let n=0;n<600;n++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){await delay(100);adb('pull',remote,local);bytes=await readFile(local);break}}catch{}await delay(100)}assert(bytes,'native download missing');adb('shell','rm',remote);ownedRemote.splice(ownedRemote.indexOf(remote),1);
    const hash=sha(bytes);if(hashes.has(c.id))assert.equal(hash,hashes.get(c.id),c.id+' native output bytes');else hashes.set(c.id,hash);
    const actual=await decode(bytes);if(decodedExpected.has(c.id)){const expected=decodedExpected.get(c.id);assert.equal(actual.w,expected.w);assert.equal(actual.h,expected.h);assert.equal(actual.frames.length,expected.frames.length);assert.deepEqual(actual.delay,expected.delay);assert.equal(actual.loop,expected.loop);for(let i=0;i<actual.frames.length;i++)assert.deepEqual(compare(actual.frames[i],expected.frames[i]),{alphaMismatch:0,rgbMismatch:0,first:null})}else decodedExpected.set(c.id,actual);
    report.rows.push({id:c.id,pair,variant,warmup:Boolean(warmup),elapsedMs:end-start,cpuMs:(b.TaskDuration-a.TaskDuration)*1000,scriptMs:(b.ScriptDuration-a.ScriptDuration)*1000,maxTaskMs:Math.max(0,...longtasks.map(l=>l.duration)),longtasks,outputHash:hash,outputBytes:bytes.length,outputName,width:actual.w,height:actual.h,frames:actual.frames.length,delay:actual.delay,loop:actual.loop});console.log(c.id,pair,variant,warmup?'cold':'warm',report.rows.at(-1).cpuMs.toFixed(2));if(pair===0&&!warmup)await page.screenshot({path:path.join(out,c.id+'-'+variant+'.png')});
   }
   await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage);storage=null;await cdp.detach();cdp=null;await page.close();page=null;
  }
 }
}catch(e){report.errors.push(e.stack);console.error(e.stack)}finally{
 if(storage&&page)await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage).catch(()=>{});
 for(const f of ownedRemote)try{adb('shell','rm','-f',f)}catch{}
 await cdp?.detach().catch(()=>{});await page?.close().catch(()=>{});await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});await bcdp.detach();report.restored={downloadBehavior:'native default',rotation:adb('shell','wm','user-rotation').trim(),ownedPagesClosed:true};report.finished=new Date().toISOString();await writeFile(path.join(out,`results-${process.env.CASE||'all'}-${prefix}.json`),JSON.stringify(report,null,2)+'\n');
}
process.exit(report.errors.length?1:0);
