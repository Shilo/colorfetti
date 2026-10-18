import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { decode, usedColors, sharp } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.argv[2]??'http://127.0.0.1:5352/';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={base,errors:[],checks:[]};
const fixture='bench/practical-workloads-2026-10-16/fixtures/';
const emptyPath=new URL('empty.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1');
await sharp({create:{width:16,height:16,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(emptyPath);
const ready=page=>page.locator('.grid .caption-color-count[aria-busy="false"]').first().waitFor();
const count=async page=>Number((await page.locator('.grid .caption-color-count').first().textContent()).match(/\d+/)[0]);
async function open(file,settings={},touch=false,viewport={width:1280,height:900}) {
 const page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch,acceptDownloads:true});
 page.on('pageerror',e=>report.errors.push(e.stack));
 await page.addInitScript(settings=>{localStorage.setItem('colorfetti',JSON.stringify(settings));localStorage.setItem('colorfetti-help-seen','1');},{family:'full-palette',paletteId:'preset-mono',maxColors:0,...settings});
 await page.goto(base);await page.locator('input[type=file]').first().setInputFiles(file==='empty.png'?emptyPath:fixture+file);
 await page.waitForFunction(name=>document.querySelector('.grid .name')?.textContent===name,file);
 await ready(page);return page;
}
async function native(page) {
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();
 const bytes=await readFile(await(await event).path()),image=await decode(bytes);
 const actual=usedColors(image.frames).length;assert.equal(await count(page),actual);
 return {count:actual,width:image.w,height:image.h,frames:image.frames.length};
}
try {
 for(const style of ['cutout','solid','lines','stencil','icon','silhouette','bayer','atkinson','noise','hatch','checker']) {
  const page=await open('dungeon-wizard.png',{family:'two-color',style,first:'#000000',second:'#ffffff'});
  const output=await native(page);report.checks.push({name:'actual 1-bit native output',style,...output});await page.close();
 }
 for(const none of [1,2]) {
  const page=await open('real-magic.gif',{family:'two-color',style:'solid',none,first:'#000000',second:'#ffffff'});
  report.checks.push({name:'GIF complete union with transparent ink',none,...await native(page)});await page.close();
 }
 {
  const page=await open('dungeon-wizard.png',{family:'two-color',style:'silhouette',none:1,first:'#000000',second:'#ffffff'});
  assert.equal(await count(page),1);report.checks.push({name:'Shape preserves existing None fallback to remaining ink',...await native(page)});await page.close();
 }
 {
  const page=await open('empty.png',{family:'two-color',style:'solid',first:'#000000',second:'#ffffff'});
  assert.equal(await count(page),0);report.checks.push({name:'transparent source is valid zero colors',...await native(page)});await page.close();
 }
 {
  const page=await open('dungeon-wizard.png');assert.equal(await count(page),2);
  const original=usedColors((await decode(fixture+'dungeon-wizard.png')).frames).length;
  await page.getByRole('button',{name:'Black & White conversion',exact:true}).click();assert.equal(await count(page),original);
  await page.getByRole('button',{name:'Black & White conversion',exact:true}).click();assert.equal(await count(page),2);
  await page.keyboard.down('Space');assert.equal(await count(page),original);await page.keyboard.up('Space');assert.equal(await count(page),2);
  const rect=await page.locator('.grid .art').boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  await page.waitForTimeout(600);assert.equal(await count(page),original);await page.mouse.up();assert.equal(await count(page),2);
  report.checks.push({name:'Compare, Space and local hold choose original RGB count',original,converted:2});
  await page.screenshot({path:new URL('desktop.png',import.meta.url).pathname.replace(/^\/(.:)/,'$1')});await page.close();
 }
 for(const viewport of [{width:390,height:844},{width:844,height:390}]) {
  const page=await open('dungeon-wizard.png',{},true,viewport);
  await page.waitForFunction(()=>document.querySelector('.grid figure .cap')?.getBoundingClientRect().width>0);
  const g=await page.locator('.grid figure').first().evaluate(tile=>{const r=s=>{const b=tile.querySelector(s).getBoundingClientRect();return{x:b.x,right:b.right}};return{resolution:r('.caption-resolution'),count:r('.caption-color-count'),cap:r('.cap')}});
  console.log(JSON.stringify({viewport,g,media:await page.evaluate(()=>({hover:matchMedia("(hover:none)").matches,style:[...document.querySelectorAll(".caption-metadata>*")].map(e=>({c:e.className,order:getComputedStyle(e).order,display:getComputedStyle(e).display}))}))}));assert(g.resolution.x<g.count.x);assert(g.count.right<=g.cap.right+1);
  report.checks.push({name:'touch resolution first and bounded',viewport,geometry:g});
  await page.screenshot({path:new URL(`touch-${viewport.width}.png`,import.meta.url).pathname.replace(/^\/(.:)/,'$1')});await page.close();
 }
 assert.deepEqual(report.errors,[]);
} finally {await browser.close();await writeFile(new URL('results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
