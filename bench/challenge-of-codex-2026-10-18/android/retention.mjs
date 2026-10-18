// Retention challenge on the USB phone. Method reused from Codex's io-android/retention-probe.mjs
// (labelled "Codex retention method"): motion 256x256x48 GIF via file input, scenario, Remove all,
// 11 s wait, two HeapProfiler.collectGarbage, then Runtime.getHeapUsage backingStorageSize.
// Additions: native CDP touch taps for tile/sheet controls, a never-opened control in every trial,
// focus descriptors after each close. Fresh owned tab per trial; never closes the shared browser.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const adb=(...a)=>execFileSync('C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',['-s','37211FDJG00267',...a],{encoding:'utf8'});
const delay=ms=>new Promise(r=>setTimeout(r,ms)),root=import.meta.dirname,stamp=Date.now();
const fx=path.resolve(root,'../../practical-workloads-2026-10-16/fixtures');
const URLS={P:'http://localhost:5431/',H:'http://localhost:5432/',F:'http://localhost:5433/'};
const PLAN=[['preview',['P','H']],['share',['H','F']],['reuse',['H','F']],['sharepreview',['H','F']]];
const TRIALS=+process.env.TRIALS||3,ONLY=process.env.ONLY;
const report={method:'Codex retention method (io-android/retention-probe.mjs): Remove all + 11 s + two explicit GCs, CDP Runtime.getHeapUsage backingStorageSize; touch via CDP Input.dispatchTouchEvent',stamp,urls:URLS,started:new Date().toISOString(),trials:[],errors:[],conditions:[]};
const battery=()=>adb('shell','dumpsys','battery').split('\n').filter(s=>/status:|temperature:/.test(s)).map(s=>s.trim()).join(', ');
const locked=()=>/isKeyguardShowing=true/.test(adb('shell','dumpsys','window'))||!/mWakefulness=Awake/.test(adb('shell','dumpsys','power'));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9361'),context=browser.contexts()[0];
const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
const storage={};
async function trial(variant,scenario,n){
 const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 const tap=async loc=>{await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
 const focus=()=>page.evaluate(()=>{const e=document.activeElement,f=e?.closest('.grid figure');return{tag:e?.tagName,label:e?.getAttribute('aria-label'),cls:e?.className?.toString().slice(0,60),text:e?.textContent?.trim().slice(0,24),figure:f?[...document.querySelectorAll('.grid figure')].indexOf(f):null,connected:e?.isConnected}});
 const reset=async()=>{await page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},seed);await page.reload();await page.locator('.grid canvas').first().waitFor();await delay(200)};
 const source=async()=>{const name=`codexchallenge-${variant}-${stamp}-${scenario}-${n}-kenney-motion-256.gif`;await page.evaluate(({b,name})=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],name,{type:'image/gif'}));const i=document.querySelector('input[type=file]');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))},{b:(await readFile(path.join(fx,'kenney-motion-256.gif'))).toString('base64'),name});
  await page.waitForFunction(n=>document.querySelector('.grid figure .caption-preview')?.textContent.includes(n.replace(/\.gif$/,'')),name);await page.waitForFunction(()=>document.querySelector('.caption-color-count')?.getAttribute('aria-busy')==='false');await delay(300)};
 const remove=async()=>{await page.getByRole('button',{name:'Remove all images',exact:true}).click();await page.getByRole('dialog',{name:'Remove all images?',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.example-add'));await delay(11000)};
 const snap=async()=>{await cdp.send('HeapProfiler.collectGarbage');await delay(100);await cdp.send('HeapProfiler.collectGarbage');const h=await cdp.send('Runtime.getHeapUsage');return{backingStorageSize:h.backingStorageSize,usedSize:h.usedSize,embedderHeapUsedSize:h.embedderHeapUsedSize,dom:await cdp.send('Memory.getDOMCounters'),openDialogs:await page.locator('dialog[open]').count()}};
 const sheetOpen=()=>page.locator('dialog.sheet[open]').waitFor(),sheetClosed=()=>page.waitForFunction(()=>!document.querySelector('dialog.sheet[open]'));
 const closeViewer=async()=>{await tap(page.getByRole('button',{name:'Close preview',exact:true}));await page.locator('dialog.image-viewer').waitFor({state:'detached'});await delay(200)};
 const rec={variant,scenario,trial:n,focus:{}};
 try{
  await page.goto(URLS[variant]+'?audit=codexchallenge-'+stamp);storage[variant]??=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await reset();rec.baseline=await snap();await source();await remove();rec.control=await snap();
  await reset();await source();
  if(scenario==='preview'){await tap(page.locator('.grid figure .caption-preview').first());await page.locator('dialog.image-viewer .art canvas').waitFor();await closeViewer();rec.focus.afterPreviewClose=await focus();}
  if(scenario==='share'){await tap(page.locator('.tile-share').first());await sheetOpen();await delay(200);await page.keyboard.press('Escape');await sheetClosed();await delay(200);rec.focus.afterSheetEscape=await focus();
   // Second close path: tap outside the sheet (backdrop), focus recorded separately.
   await tap(page.locator('.tile-share').first());await sheetOpen();await delay(200);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:20,y:20,id:4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sheetClosed();await delay(200);rec.focus.afterSheetBackdrop=await focus();}
  if(scenario==='reuse'){await tap(page.locator('.tile-share').first());await sheetOpen();await delay(200);await tap(page.locator('dialog.sheet').getByRole('button',{name:'Reuse colors'}));
   const editor=page.getByRole('button',{name:'Close palette editor',exact:true});await editor.waitFor();await delay(500);rec.sheetOpenWithEditor=await page.locator('dialog.sheet[open]').count();
   await tap(editor);await editor.waitFor({state:'detached'});await delay(300);rec.focus.afterEditorClose=await focus();rec.openDialogsAfterEditor=await page.locator('dialog[open]').count();}
  if(scenario==='sharepreview'){await tap(page.locator('.tile-share').first());await sheetOpen();await delay(200);await tap(page.locator('dialog.sheet').getByRole('button',{name:'Preview',exact:true}));await page.locator('dialog.image-viewer .art canvas').waitFor();await delay(200);await closeViewer();rec.focus.afterSharePreviewClose=await focus();}
  await remove();rec.scenarioRemoved=await snap();
 }catch(e){rec.error=e.stack;report.errors.push(`${variant} ${scenario} ${n}: ${e.message}`)}finally{
  await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage[variant]).catch(()=>{});await cdp.detach().catch(()=>{});await page.close();
  rec.pageErrors=errors;if(errors.length)report.errors.push(...errors);report.trials.push(rec);
  console.log(JSON.stringify({variant,scenario,n,control:rec.control?.backingStorageSize,removed:rec.scenarioRemoved?.backingStorageSize,focus:rec.focus,err:rec.error?.split('\n')[0]}));
 }
}
try{
 report.conditions.push({at:'start',battery:battery()});
 outer:for(let n=0;n<TRIALS;n++)for(const[scenario,variants]of PLAN){if(ONLY&&ONLY!==scenario)continue;for(const v of(n%2?[...variants].reverse():variants)){if(locked()){report.errors.push('Device locked/asleep; stopped');break outer}await trial(v,scenario,n)}}
}finally{report.conditions.push({at:'end',battery:battery()});report.finished=new Date().toISOString();await mkdir(root,{recursive:true});await writeFile(path.join(root,`retention-${process.env.SMOKE?'smoke-':''}${stamp}.json`),JSON.stringify(report,null,2)+'\n');}
process.exit(report.errors.length?1:0);
