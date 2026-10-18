import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { build, preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Build just the fixture: no discovery of historical QA HTML pages or live source watching.
await build({ build: { outDir: '.tmp/caption-layout-2026-10-17', emptyOutDir: true, rollupOptions: { input: 'bench/caption-layout-2026-10-17/fixture.html' } } });
const server = await preview({ build: { outDir: '.tmp/caption-layout-2026-10-17' }, preview: { port: 0, host: '127.0.0.1' } });
const baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
console.log(`Fixture server ${baseURL}`);
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const results = { browser: browser.version(), chromiumSandbox: true, checks: [] };
console.log(`Sandboxed browser ${results.browser}`);
try {
  for (const touch of [false, true]) for (const width of [320, 390, 520, 800, 1280]) for (const height of [390, 900]) {
    console.log(`Checking ${width}×${height}, touch=${touch}`);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on('pageerror', error => console.error('Fixture error:', error.message));
    page.on('console', message => { if (message.type()==='error') console.error('Fixture console:', message.text()); });
    await page.goto(`${baseURL}/bench/caption-layout-2026-10-17/fixture.html`);
    console.log('Fixture navigated');
    await page.getByRole('button', { name: 'Two colors', exact: true }).waitFor();
    const measure = async () => page.evaluate(() => [...document.querySelectorAll('section[data-case]')].map(section => {
      const rect = selector => { const el = section.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x, right:r.right, y:r.y, width:r.width }; };
      return { type:section.dataset.case, touch:matchMedia('(hover:none)').matches, resolution:rect('.caption-resolution'), count:rect('.caption-color-count'), cap:rect('.cap'), text:section.querySelector('.caption-metadata').textContent };
    }));
    const two = await measure();
    await page.getByRole('button', { name: 'Toggle pending', exact: true }).click();
    assert.equal(await page.locator('.caption-color-count[aria-busy="true"]').count(), 3, 'retained counts expose pending state');
    const pending = await measure();
    for (let i=0;i<two.length;i++) assert.equal(pending[i].resolution.x, two[i].resolution.x, 'pending state shifts dimensions');
    await page.getByRole('button', { name: 'Toggle pending', exact: true }).click();
    await page.getByRole('button', { name: 'Many colors', exact: true }).click();
    const many = await measure();
    await page.getByRole('button', { name: 'No count', exact: true }).click();
    const none = await measure();
    for (let i=0;i<two.length;i++) {
      const a=two[i], b=many[i], c=none[i];
      assert.ok(Math.abs(a.resolution.x-b.resolution.x)<0.1, `changed count shifts resolution ${JSON.stringify({width,height,touch,a,b})}`);
      assert.ok(Math.abs(a.resolution.x-c.resolution.x)<0.1, `missing count shifts resolution ${JSON.stringify({width,height,touch,a,c})}`);
      const left = a.type==='example' || a.touch;
      assert.ok(left ? a.resolution.right<a.count.x : a.count.right<a.resolution.x, `wrong order ${JSON.stringify(a)}`);
      assert.ok(a.resolution.x>=a.cap.x && a.resolution.right<=a.cap.right, `resolution overflows ${JSON.stringify(a)}`);
      assert.ok(a.count.x>=a.cap.x && a.count.right<=a.cap.right, `count overflows ${JSON.stringify(a)}`);
    }
    assert.equal(await page.locator('.example-add button').count(), 0, 'example has nested buttons');
    results.checks.push({ width, height, touch, measurements:two, passed:true });
    if (width===390 && height===900 || width===1280 && height===900) {
      await page.getByRole('button', { name:'Two colors', exact:true }).click();
      await page.screenshot({ path:`bench/caption-layout-2026-10-17/${touch?'touch':'mouse'}-${width}.png` });
    }
    await context.close();
  }
  await writeFile('bench/caption-layout-2026-10-17/results.json', JSON.stringify(results,null,2)+'\n');
  console.log(`PASS ${results.checks.length} viewport/input configurations, three caption contexts and three count states each.`);
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
