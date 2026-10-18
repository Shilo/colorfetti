import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:5351/';
const out = process.argv[3] ?? 'baseline';
const candidate = out !== 'baseline';
const report = { url, revision: candidate ? '5794b26 plus uncommitted candidate' : '5794b26', cases: [], errors: [] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
async function open(file, viewport = { width:1280, height:900 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.addInitScript(() => { localStorage.setItem('colorfetti', JSON.stringify({ family:'full-palette', paletteId:'preset-res64', metric:'oklab',maxColors:0 })); localStorage.setItem('colorfetti-help-seen','1'); });
  await page.goto(url);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await page.locator('.grid figure .art canvas').waitFor();
  return page;
}
const caption = page => page.locator('.grid figure .dim').first();
const settled = page => page.waitForFunction(() => { const count=document.querySelector('.grid .dim [aria-busy]'); return count && count.getAttribute('aria-busy')==='false'; });
async function settings(page) { await page.getByRole('button', {name:'Palette settings',exact:true}).click(); }
async function edit(page,n) { const input=page.getByRole('spinbutton',{name:'Max colors value',exact:true}); await input.fill(String(n));await input.press('Enter');await page.waitForTimeout(120); }
try {
  // Exact tiny sprite: every mutation is recorded, including temporary blanks.
  {
    const page=await open('bench/count-stability-2026-10-16/two-colors.png');await settled(page);
    await page.evaluate(() => { window.__captions=[];new MutationObserver(() => __captions.push(document.querySelector('.grid .dim').textContent)).observe(document.querySelector('.grid .dim'),{subtree:true,childList:true,characterData:true}); });
    await settings(page);
    for(const n of [4,8,16,32,3,64,9,5]) { await edit(page,n);await settled(page);assert.match(await caption(page).textContent(),/2 colors/); }
    for(const label of ['RGB matching','Oklab matching','Cleanup on','Cleanup off','Dithering 4x4','Dithering off']) {
      const button=page.getByRole('button',{name:label,exact:true});assert.equal(await button.count(),1);await button.click();await page.waitForTimeout(120);await settled(page);
    }
    await settings(page);
    for(const viewport of [{width:360,height:720},{width:900,height:430},{width:1280,height:900}]) { await page.setViewportSize(viewport);await settled(page); }
    await page.keyboard.down('Space');await page.waitForTimeout(80);await page.keyboard.up('Space');await settled(page);
    for(let i=0;i<4;i++){await page.locator('.grid .caption-preview').first().click();await page.getByRole('button',{name:'Close preview',exact:true}).click();await settled(page);}
    const transitions=await page.evaluate(()=>__captions), blanks=transitions.filter(v=>!v.includes('colors'));
    assert.deepEqual(blanks,[]);report.cases.push({name:'exact sprite cap/settings/resize/Original/Preview',transitions:transitions.length,blanks,final:await caption(page).textContent()});await page.close();
  }
  {
    const page=await open('bench/count-stability-2026-10-16/two-colors.png');await settled(page);
    await page.getByRole('button',{name:'Palette',exact:true}).click();
    const paletteCounts=[];
    for(const name of ['PICO-8','Black & White','Auto','Resurrect 64','ENDESGA 32','Auto','Resurrect 64']) {
      await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(140);await settled(page);
      paletteCounts.push({palette:name,caption:await caption(page).textContent()});
    }
    // Source replacement via additional import must allocate an independent slot.
    await page.locator('input[type=file]').first().setInputFiles('bench/practical-workloads-2026-10-16/fixtures/dungeon-wizard.png');
    await page.waitForFunction(()=>document.querySelectorAll('.grid figure .dim [aria-busy="false"]').length===2);
    report.cases.push({name:'palette/Auto roundtrips and second source',paletteCounts,captions:await page.locator('.grid figure .dim').allTextContents()});await page.close();
  }
  // Full-source inspection can establish a count, then a settings change
  // legitimately clears it because the sampled wall cannot prove a replacement.
  {
    const page=await open('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
    await page.waitForTimeout(450);if(candidate)await settled(page);const initial=await caption(page).textContent();
    if(candidate)assert.match(initial,/26 colors/);else assert.doesNotMatch(initial,/colors/);
    await page.locator('.grid .caption-preview').click();await settled(page);const inspected=await caption(page).textContent();
    await page.getByRole('button',{name:'Close preview',exact:true}).click();await settings(page);
    await page.getByRole('button',{name:'RGB matching',exact:true}).click();await page.waitForTimeout(600);
    if(candidate)await settled(page);const changed=await caption(page).textContent();
    if(candidate)assert.match(changed,/25 colors/);else assert.doesNotMatch(changed,/colors/);
    await settings(page);await page.locator('.grid .caption-preview').click();await settled(page);const restored=await caption(page).textContent();
    await page.getByRole('button',{name:'Close preview',exact:true}).click();
    // Simultaneous current inspection remains authoritative against sampled completion.
    await settings(page);await page.evaluate(()=>{document.querySelector('[aria-label="Oklab matching"]').click();document.querySelector('.acts [aria-label^="Reuse colors"]').click();});
    await page.locator('dialog.palette-import-modal[open]').waitFor();await settled(page);
    const joined=await caption(page).textContent();await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
    assert.match(joined,/colors/);report.cases.push({name:'sampled wall disappearance and inspection join',initial,inspected,changed,restored,joined});await page.close();
  }
  {
    const page=await open('bench/practical-workloads-2026-10-16/fixtures/real-magic.gif');await settled(page);
    await settings(page);for(const n of [2,4,8]){await edit(page,n);await settled(page);}
    const final=await caption(page).textContent();assert.match(final,/colors/);report.cases.push({name:'six-frame animation settings union',final});await page.close();
  }
  if(!candidate) {
    const page=await open('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
    let requested;const started=new Promise(resolve=>requested=resolve);
    await page.route('**/palette-usage-*.js',async route=>{requested();await new Promise(resolve=>setTimeout(resolve,350));await route.continue();});
    await page.locator('.grid .caption-preview').click();await started;
    await page.getByRole('button',{name:'Close preview',exact:true}).click();await page.waitForTimeout(650);
    const canceled=await caption(page).textContent();assert.doesNotMatch(canceled,/colors/);
    await page.locator('.grid .caption-preview').click();await settled(page);const reopened=await caption(page).textContent();
    assert.match(reopened,/26 colors/);await page.getByRole('button',{name:'Close preview',exact:true}).click();
    report.cases.push({name:'close while inspection module loads then reopen',canceled,reopened});await page.close();
  }
  assert.deepEqual(report.errors,[]);
} finally { await browser.close();await writeFile(new URL(`${out}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n'); }
console.log(JSON.stringify(report));
