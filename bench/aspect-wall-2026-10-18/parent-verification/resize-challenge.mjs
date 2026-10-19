import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFixtures } from '../fixtures.mjs';

const require = createRequire(import.meta.url);
const { webkit } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const folder = fileURLToPath(new URL('../../../.tmp/parent-resize/', import.meta.url));
await mkdir(folder, { recursive: true }); process.env.TEMP = process.env.TMP = folder;
const fixtures = await generateFixtures();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function serve(root) {
  root = resolve(root);
  const server = createServer(async (request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(root + sep)) return response.writeHead(404).end();
    try {
      const data = await readFile(path);
      response.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(path)] ?? 'application/octet-stream' }).end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
const browser = await webkit.launch({ headless: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/webkit-2336/Playwright.exe' });
const report = { browser: browser.version(), runs: [] };
try {
  for (const [label, root, clipped] of [['baseline', '.tmp/aspect-baseline/dist', false], ['candidate', 'dist', false], ['candidate-clipped', 'dist', true]]) {
    const { server, url } = await serve(root);
    try {
      const context = await browser.newContext({ hasTouch: true, isMobile: true, deviceScaleFactor: 3, viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(() => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-pico8', metric: 'rgb', theme: 'dark' })); });
      const page = await context.newPage();
      const result = { label, clipped, trials: [], errors: [] };
      page.on('pageerror', error => result.errors.push(error.message));
      await page.goto(url);
      await page.locator('input[type=file]').first().setInputFiles(fixtures.map(item => item.path));
      await page.waitForFunction(() => document.querySelectorAll('.tiles .tile').length === 16);
      if (clipped) await page.addStyleTag({ content: '.grid { overflow-x: hidden !important; }' });
      for (let trial = 0; trial < 3; trial++) {
        await page.setViewportSize({ width: 1440, height: 1000 }); await pause(600);
        await page.locator('.grid').evaluate(element => { element.scrollTop = 0; });
        await page.setViewportSize({ width: 240, height: 320 });
        const start = Date.now(), samples = [];
        for (const target of [0, 16, 33, 70, 100, 200, 300, 500]) {
          await pause(Math.max(0, target - (Date.now() - start)));
          const sample = await page.evaluate(() => {
            const grid = document.querySelector('.grid'), tiles = [...document.querySelectorAll('.tiles .tile')];
            const name = tiles[0].querySelector('.name');
            return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, wallWidth: grid.clientWidth, wallScrollWidth: grid.scrollWidth,
              outOfBounds: tiles.filter(tile => { const r = tile.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).length,
              firstNameHeight: name.getBoundingClientRect().height };
          });
          samples.push({ elapsed: Date.now() - start, ...sample });
        }
        result.trials.push(samples);
      }
      report.runs.push(result); await context.close();
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
} finally {
  await browser.close();
  const tag = process.env.REPORT_TAG || '';
  if (!/^[a-z0-9-]*$/.test(tag)) throw Error('Invalid report tag');
  await writeFile(new URL(`./resize-challenge${tag ? '-' + tag : ''}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report.runs.map(run => ({ label: run.label, trials: run.trials.map(samples => samples.map(({ elapsed, wallScrollWidth, outOfBounds }) => ({ elapsed, wallScrollWidth, outOfBounds }))) })), null, 2));
