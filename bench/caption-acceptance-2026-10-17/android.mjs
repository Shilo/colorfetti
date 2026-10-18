import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { decode, usedColors, nearest } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const adb='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const command=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:10000});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9334');
// CDP attachment otherwise routes downloads to an unusable host path on Android.
const session=await browser.newBrowserCDPSession();await session.send('Browser.setDownloadBehavior',{behavior:'default'});
const tag='caption-qa-'+Date.now();
const page=await browser.contexts()[0].newPage(),base='http://127.0.0.1:5352/';
const report={base,checks:[],errors:[],downloads:[]};
page.on('pageerror',e=>report.errors.push(e.stack));
const fixture='bench/practical-workloads-2026-10-16/fixtures/';
let expected=1;
let expectedNames=[];
const ready=()=>page.waitForFunction(({expected,names})=>{const nodes=[...document.querySelectorAll('.grid .caption-color-count')],actual=[...document.querySelectorAll('.grid .name')].map(e=>e.textContent);return actual.length===expected&&names.every(name=>actual.includes(name))&&nodes.length===expected&&nodes.every(e=>e.getAttribute('aria-busy')==='false')},{expected,names:expectedNames});
async function start(settings,fileNames) {
 expected=fileNames.length;
 expectedNames=fileNames.map(name=>tag+'-'+name);
 await page.goto(base);
 await page.evaluate(settings=>{localStorage.setItem('colorfetti',JSON.stringify(settings));localStorage.setItem('colorfetti-help-seen','1');},settings);
 await page.reload();await page.bringToFront();
 await page.evaluate(()=>{window.captionLongTasks=[];new PerformanceObserver(list=>captionLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:false})});
 const inputs=await Promise.all(fileNames.map(async name=>({name:tag+'-'+name,mimeType:name.endsWith('.gif')?'image/gif':'image/png',buffer:await readFile(name==='two-colors.png'?'bench/count-stability-2026-10-16/two-colors.png':fixture+name)})));
 const time=performance.now();await page.locator('input[type=file]').first().setInputFiles(inputs);await ready();
 await page.waitForFunction(()=>document.querySelector('.grid figure .cap')?.getBoundingClientRect().width>0);
 return performance.now()-time;
}
const prefs={family:'full-palette',paletteId:'preset-res64',maxColors:0,metric:'oklab'};
try {
 const elapsed=await start(prefs,['dungeon-wizard.png','dungeon-archer.png','dungeon-knight.png','dungeon-potion.png','platformer-pilot.png','real-magic.gif','kenney-sheet-2048.png']);
 report.device=await page.evaluate(()=>({ua:navigator.userAgent,width:innerWidth,height:innerHeight,orientation:screen.orientation.type}));
 const labels=await page.locator('.grid .caption-color-count').allTextContents();
 report.checks.push({name:'seven-source practical wall including2048sheet andrealGIF',elapsed,labels,longTasks:await page.evaluate(()=>captionLongTasks)});
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 await page.getByRole('button',{name:/^Matching/}).click();
 await page.getByRole('button',{name:'RGB matching',exact:true}).click();await ready();
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 report.checks.push({name:'large wall current counts afterMatching withoutPreview',labels:await page.locator('.grid .caption-color-count').allTextContents()});
 const elapsedSingle=await start({...prefs,paletteId:'preset-mono'},['dungeon-wizard.png']);
 const count=async()=>Number((await page.locator('.grid .caption-color-count').first().textContent()).match(/\d+/)[0]);
 assert.equal(await count(),2);
 await page.getByRole('button',{name:'Black & White conversion',exact:true}).click();assert.equal(await count(),9);
 await page.getByRole('button',{name:'Black & White conversion',exact:true}).click();assert.equal(await count(),2);
 const geo=await page.locator('.grid figure').first().evaluate(e=>{const r=s=>{const x=e.querySelector(s).getBoundingClientRect();return{x:x.x,right:x.right}};return{resolution:r('.caption-resolution'),count:r('.caption-color-count'),cap:r('.cap')}});
 assert(geo.resolution.x<geo.count.x);assert(geo.count.right<=geo.cap.right+1);
 report.checks.push({name:'nativeCompareandportraitmetadata',elapsedSingle,geo});
 const output=tag+'-dungeon-wizard-palette.png',remote='/sdcard/Download/'+output;
 await page.getByRole('button',{name:'Save image',exact:true}).click();
 let exists=false;
 for(let i=0;i<40&&!exists;i++){await new Promise(r=>setTimeout(r,200));try{exists=Number(command('shell','stat','-c','%s',remote).trim())>0}catch{}}
 assert(exists,'Specifically named native PNG download was not observed');await new Promise(r=>setTimeout(r,500));
 const path=new URL('android-output.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1');
 command('pull',remote,path);report.downloads.push(output);
 const decoded=await decode(path);assert.equal(usedColors(decoded.frames).length,2);assert.equal(decoded.w,16);assert.equal(decoded.h,16);
 const source=await decode(fixture+'dungeon-wizard.png'),expectedPixels=nearest(source.frames[0],['#000000','#ffffff']).data;
 assert.deepEqual([...decoded.frames[0]],[...expectedPixels]);
 report.checks.push({name:'nativePNGSavecountmatches',colors:2,width:decoded.w,height:decoded.h});
 await start(prefs,['two-colors.png']);
 await page.evaluate(()=>{window.captionTransitions=[];new MutationObserver(()=>captionTransitions.push(document.querySelector('.grid .caption-metadata').textContent)).observe(document.querySelector('.grid .caption-metadata'),{subtree:true,childList:true,characterData:true});window.captionLongTasks=[]});
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 const number=page.getByRole('spinbutton',{name:'Max colors value',exact:true});
 for(const cap of [4,8,32,64,3,16]){await number.fill(String(cap));await number.press('Enter');await ready();assert.equal(await count(),2)}
 for(const [chip,button]of [['Matching','RGB matching'],['Matching','Oklab matching'],['Cleanup','Cleanup on'],['Cleanup','Cleanup off'],['Dithering','Dithering 4x4'],['Dithering','Dithering off']]){
  const selected=page.getByRole('button',{name:new RegExp('^'+chip+':')});await selected.click();await page.getByRole('button',{name:button,exact:true}).click();await ready();assert.equal(await count(),2);
 }
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 const transitions=await page.evaluate(()=>captionTransitions),blanks=transitions.filter(text=>!text.includes('2 colors'));assert.deepEqual(blanks,[]);
 report.checks.push({name:'nativecapMatchingCleanupDither stable2colorcaption',transitions:transitions.length,blanks,longTasks:await page.evaluate(()=>captionLongTasks)});
 await start({family:'two-color',style:'solid',none:1,first:'#000000',second:'#ffffff'},['real-magic.gif']);
 assert.equal(await count(),1);report.checks.push({name:'native1bitGIFtransparentinkwholeclip',count:await count()});
 await page.screenshot({path:new URL('android.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1')});
 assert.deepEqual(report.errors,[]);
} finally {
 await page.close();
 await session.send('Browser.setDownloadBehavior',{behavior:'default'}).catch(()=>{});
 await writeFile(new URL('android-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 // Detach the driver by process exit; never browser.close() the user's browser.
}
console.log(JSON.stringify(report));process.exit(0);
