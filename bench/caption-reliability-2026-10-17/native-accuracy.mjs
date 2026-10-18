import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { decode, usedColors } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const { chromium }=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.argv[2]??'http://127.0.0.1:5358/';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={url,errors:[],cases:[]};
const files=['dungeon-wizard.png','dungeon-archer.png','dungeon-knight.png','dungeon-potion.png','town-water-bucket.png','platformer-pilot.png','platformer-heart.png','platformer-rocket.png','kenney-sheet-2048.png'];
try {
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.on('pageerror',e=>report.errors.push(e.stack));
 await page.addInitScript(()=>{localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-res64',maxColors:0}));localStorage.setItem('colorfetti-help-seen','1');});
 await page.goto(url);await page.locator('input[type=file]').first().setInputFiles(files.map(name=>'bench/practical-workloads-2026-10-16/fixtures/'+name));
 const ready=()=>page.waitForFunction(()=>document.querySelectorAll('.grid figure .dim [aria-busy="false"]').length===9);
 await ready();
 async function check(name) {
  const counts=await page.locator('.grid figure').evaluateAll(tiles=>tiles.map(tile=>({name:tile.querySelector('.name').textContent,count:Number(tile.querySelector('.dim [aria-busy]').textContent.match(/\d+/)[0])})));
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save all images',exact:true}).click();
  const zip=unzipSync(await readFile(await(await pending).path()));assert.equal(Object.keys(zip).length,9);
  const outputs=[];
  for(const [file,bytes]of Object.entries(zip)){
   const decoded=await decode(bytes),count=usedColors(decoded.frames).length;
   const source=counts.find(c=>file.startsWith(c.name.replace(/\.png$/,'')));
   assert(source,'Unknown native filename '+file);assert.equal(source.count,count,file);
   outputs.push({name:source.name,captionCount:source.count,nativeCount:count});
  }
  report.cases.push({name,outputs});
 }
 await check('nine-asset batch including sampled 2048 sheet, nearest All');
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 const number=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await number.fill('8');await number.press('Enter');
 // Supersede pending requests without waiting: only the final snapshot may publish.
 await page.getByRole('button',{name:'RGB matching',exact:true}).click();
 await page.getByRole('button',{name:'Cleanup on',exact:true}).click();
 await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.waitForTimeout(100);await ready();
 await check('rapid cap/Matching/Cleanup/dither replacement, exact native exports');
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await writeFile(new URL('native-accuracy.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
