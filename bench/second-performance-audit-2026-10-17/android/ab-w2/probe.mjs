// Probe: owned tab on A, 1-bit Checker wall, locate Threshold slider; no timing.
import {createRequire} from 'node:module';import {readFile} from 'node:fs/promises';import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fx=path.resolve(import.meta.dirname,'../../../practical-workloads-2026-10-16'),m=JSON.parse(await readFile(path.join(fx,'manifest.json'),'utf8'));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9361'),context=browser.contexts()[0],page=await context.newPage();
try{
 await page.goto('http://localhost:5401/?audit=secondaudit-w2probe');const saved=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 await page.evaluate(()=>{localStorage.setItem('colorfetti',JSON.stringify({family:'two-color',style:'checker',theme:'dark'}));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')});await page.reload();await page.locator('.grid canvas').first().waitFor();
 const ids=['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion','kenney-sheet-1024'];
 const ps=await Promise.all(ids.map(async id=>{const r=m.records.find(r=>r.id===id);return{name:'secondaudit-w2probe-'+path.basename(r.file),b:(await readFile(path.join(fx,r.file))).toString('base64')}}));
 await page.evaluate(ps=>{const dt=new DataTransfer();for(const p of ps)dt.items.add(new File([Uint8Array.from(atob(p.b),c=>c.charCodeAt(0))],p.name,{type:'image/png'}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},ps);
 await page.waitForFunction(()=>document.querySelectorAll('.grid figure').length===5);await page.waitForTimeout(3000);
 console.log(await page.locator('.grid figure .dim').allTextContents(),await page.locator('.grid figure .caption-color-count').evaluateAll(cs=>cs.map(c=>c.getAttribute('aria-busy'))));
 await page.getByRole('button',{name:'Style',exact:true}).click();await page.waitForTimeout(500);
 const s=page.getByRole('slider',{name:'Threshold',exact:true});console.log('sliders',await s.count());
 console.log(await s.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,value:e.value,min:e.min,max:e.max,visible:!!e.offsetParent}}));
 console.log(await page.evaluate(()=>[...document.querySelectorAll('.dock button')].map(b=>b.getAttribute('aria-label')).filter(Boolean).join(' | ')));
 await page.screenshot({path:path.join(import.meta.dirname,'probe.png')});
 await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},saved);
}finally{await page.close()}
process.exit(0);
