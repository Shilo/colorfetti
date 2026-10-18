import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { decode, usedColors } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import { analyze as baselineAnalyze, mask as baselineMask, colorize as baselineColorize } from '../large-pattern-counts-2026-10-17/recolor-baseline.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const mode=process.argv[2]??'desktop',native=mode==='android';
const browser=native?await chromium.connectOverCDP('http://127.0.0.1:9334'):await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const context=native?browser.contexts()[0]:await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
const report={mode,errors:[],trials:[],checks:[]},pages=new Set(),tag='pattern-qa-'+Date.now();
let browserCDP;
if(native){browserCDP=await browser.newBrowserCDPSession();await browserCDP.send('Browser.setDownloadBehavior',{behavior:'default'})}
const sheet='bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png';
const adb='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
async function checkNativeSave(current,file,style,set={}){
 const output=current.name.replace(/\.[^.]+$/,'')+'-1bit.png',remote='/sdcard/Download/'+output;
 await current.page.getByRole('button',{name:'Save image',exact:true}).click();
 const command=(...args)=>execFileSync(adb,['-s','37211FDJG00267',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000});
 let exists=false;
 for(let i=0;i<50&&!exists;i++){await new Promise(r=>setTimeout(r,200));try{exists=Number(command('shell','stat','-c','%s',remote).trim())>0}catch{}}
 assert(exists,'Exact uniquely named native output missing');await new Promise(r=>setTimeout(r,300));
 const path=new URL('android-'+(set.threshold?'ambiguous':'bayer')+'-output.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1');
 command('pull',remote,path);const saved=await decode(path),source=await decode(file);
 const expected=baselineColorize(baselineMask(baselineAnalyze({width:source.w,height:source.h,data:source.frames[0]}),style,set),'#000000','#ffffff');
 assert.equal(saved.w,source.w);assert.equal(saved.h,source.h);assert(Buffer.from(saved.frames[0]).equals(Buffer.from(expected)));
 report.checks.push({name:'native Android PNG equals frozen baseline pixels',output,width:saved.w,height:saved.h,count:usedColors(saved.frames).length});
}
async function open(base,style,file=sheet,extra={}){
 const page=await context.newPage();pages.add(page);page.on('pageerror',e=>report.errors.push(e.stack));
 const settings={family:'two-color',style,first:'#000000',second:'#ffffff',none:0,...extra};
 await page.addInitScript(settings=>{localStorage.setItem('colorfetti',JSON.stringify(settings));localStorage.setItem('colorfetti-help-seen','1')},settings);
 await page.goto(base);if(native)await page.bringToFront();
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const bytes=await readFile(file),name=tag+'-'+style+'-'+file.split('/').at(-1);
 // Stage transport before measuring application import and conversion.
 await page.evaluate(({name,base64,type})=>{const s=atob(base64),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);window.patternTestFile=new File([a],name,{type})},{name,base64:bytes.toString('base64'),type:file.endsWith('.gif')?'image/gif':'image/png'});
 await page.evaluate(()=>{window.patternTasks=[];window.patternObserver=new PerformanceObserver(list=>patternTasks.push(...list.getEntries().map(e=>({duration:e.duration,start:e.startTime}))));patternObserver.observe({type:'longtask'})});
 const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const start=await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(patternTestFile);const input=document.querySelector('input[type=file]');input.files=dt.files;delete window.patternTestFile;const start=performance.now();input.dispatchEvent(new Event('change',{bubbles:true}));return start});
 await page.waitForFunction(name=>document.querySelector('.grid .name')?.textContent===name&&document.querySelector('.grid .art canvas')?.width>0,name);
 const paintMs=await page.evaluate(start=>performance.now()-start,start);
 await page.waitForTimeout(180);
 const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const state=await page.evaluate(()=>({count:document.querySelector('.grid .caption-color-count')?.textContent??null,busy:document.querySelector('.grid .caption-color-count')?.getAttribute('aria-busy')??null,tasks:patternTasks,viewport:[innerWidth,innerHeight],orientation:screen.orientation.type}));
 await page.evaluate(()=>patternObserver.disconnect());
 const metrics={paintMs,taskMs:(after.TaskDuration-before.TaskDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,...state};
 await cdp.detach();return{page,name,metrics};
}
async function close(page){await page.close();pages.delete(page)}
try{
 for(let pair=0;pair<(process.argv.includes('--outputs-only')?0:3);pair++)for(const style of ['checker','bayer','hatch','noise','atkinson'])for(const variant of pair%2?['candidate','baseline']:['baseline','candidate']){
  const {page,metrics}=await open(variant==='baseline'?'http://127.0.0.1:5354/':'http://127.0.0.1:5355/',style);
  if(variant==='candidate'&&style!=='atkinson')assert.equal(metrics.count?.trim(),'2 colors');
  if(variant==='baseline')assert.equal(metrics.count,null);
  report.trials.push({pair,style,variant,...metrics});await close(page);
 }
 // Independently generated phase-correlated alpha must not become a false count.
 const fixture='bench/large-pattern-challenge-2026-10-17/ambiguous-alpha-grid.png';
 const {page,name,metrics}=await open('http://127.0.0.1:5355/','bayer',fixture,{settings:{bayer:{threshold:254,matrix:4,scale:1,shading:100}}});
 assert(metrics.count===null||metrics.count.trim()==='1 color');report.checks.push({name:'ambiguous phase is not guessed; exact existing rendering may establish one',...metrics});
 if(!native){
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const image=await decode(await readFile(await(await event).path()));
  assert.equal(usedColors(image.frames).length,1);report.checks.push({name:'ambiguous output independently decoded',count:1,width:image.w,height:image.h});
 }
 if(native)await checkNativeSave({page,name},fixture,'bayer',{threshold:254,matrix:4,scale:1,shading:100});
 await close(page);
 for(const style of ['checker','bayer','hatch','noise']){
  const current=await open('http://127.0.0.1:5355/',style);
  if(!native){const event=current.page.waitForEvent('download');await current.page.getByRole('button',{name:'Save image',exact:true}).click();const image=await decode(await readFile(await(await event).path()));assert.equal(usedColors(image.frames).length,2);report.checks.push({name:'native desktop PNG '+style,count:2,width:image.w,height:image.h})}
  if(style==='bayer')await current.page.screenshot({path:new URL(mode+'.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1')});
  if(native&&style==='bayer')await checkNativeSave(current,sheet,style);
  await close(current.page);
 }
 assert.deepEqual(report.errors,[]);
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 report.summary=['checker','bayer','hatch','noise','atkinson'].map(style=>({style,...Object.fromEntries(['baseline','candidate'].map(variant=>[variant,Object.fromEntries(['paintMs','taskMs','scriptMs'].map(metric=>[metric,median(report.trials.filter(t=>t.style===style&&t.variant===variant).map(t=>t[metric]))]))]))}));
}finally{
 for(const page of pages)await page.close().catch(()=>{});
 await writeFile(new URL(mode+(process.argv.includes('--outputs-only')?'-outputs':'')+'-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 if(native)await browserCDP.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});else await browser.close();
}
console.log(JSON.stringify({mode,summary:report.summary,checks:report.checks.length,errors:report.errors}));if(native)process.exit(0);
