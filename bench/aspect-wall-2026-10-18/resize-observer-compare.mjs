// Match existing responsive-workspace resize paths against untouched HEAD.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {preview} from 'vite';
import {generateFixtures} from './fixtures.mjs';
const require=createRequire(import.meta.url),{webkit}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixtures=Object.fromEntries((await generateFixtures()).map(f=>[f.id,f]));
await mkdir('.tmp/aspect-wall-browser',{recursive:true});process.env.TEMP=process.cwd()+'/.tmp/aspect-wall-browser';process.env.TMP=process.env.TEMP;
const server=await preview({preview:{port:0,host:'127.0.0.1'}}),current=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await webkit.launch({headless:true,executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/webkit-2336/Playwright.exe'}),report={browser:browser.version(),baselineRef:'765f76f0ad94a32a62318dcf9e2073cd21c02d12',runs:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{for(const[label,url]of[['baseline','http://127.0.0.1:5296'],['candidate',current]]){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,colorScheme:'dark'}),page=await context.newPage(),run={label,url,events:[]};let phase='startup';
  page.on('pageerror',e=>run.events.push({phase,name:e.name,message:e.message,stack:e.stack}));
  await context.addInitScript(()=>{localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-pico8',metric:'rgb',theme:'dark'}));});
  const step=async(name,fn)=>{phase=name;await fn();await pause(250);};
  const upload=async(ids)=>{await page.locator('input[type=file]').first().setInputFiles(ids.map(id=>fixtures[id].path));await page.waitForFunction(n=>document.querySelectorAll('.grid .tile').length===n,ids.length);};
  await step('wide/navigate',()=>page.goto(url));await step('wide/import',()=>upload(['aurora']));
  for(const name of['Palette settings','Palette']){await step(`wide/open ${name}`,()=>page.locator(`button[aria-label="${name}"]`).click());await step(`wide/close ${name}`,()=>page.locator(`button[aria-label="${name}"]`).click());}
  await step('wide/resize narrow',()=>page.setViewportSize({width:1393,height:967}));await step('wide/resize restore',()=>page.setViewportSize({width:1440,height:1000}));
  await step('focus/initial resize',()=>page.setViewportSize({width:1280,height:900}));await step('focus/navigate',()=>page.goto(url));await step('focus/import square',()=>upload(['square']));
  await step('focus/focus Save',()=>page.locator('.grid .acts button').first().focus());
  await step('focus/shrink',()=>page.setViewportSize({width:320,height:360}));await step('focus/expand',()=>page.setViewportSize({width:1280,height:900}));
  await step('remove/shrink',()=>page.setViewportSize({width:320,height:360}));await step('remove/navigate',()=>page.goto(url));await step('remove/import',()=>upload(['vertical','tower']));
  if(label==='candidate'){await step('remove/open sheet',()=>page.locator('.grid .tile-share').first().click());await step('remove/confirm sheet',()=>page.getByRole('dialog',{name:'Image actions'}).getByRole('button',{name:'Remove',exact:true}).click());}
  else await step('remove/old desktop action',()=>page.locator('.grid .acts button.danger').first().click());
  report.runs.push(run);console.log(JSON.stringify(run,null,2));await context.close();
}}finally{await writeFile(new URL('./results/webkit-resize-observer-compare.json',import.meta.url),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
