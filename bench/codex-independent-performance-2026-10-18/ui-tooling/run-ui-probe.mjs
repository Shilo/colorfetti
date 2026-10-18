// Auxiliary Edge only; never substitute for actual Codex Browser/Android evidence.
// Run only in a reserved quiet window, after all five diagnostic variants are built.
import http from 'node:http';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const variantRoot = path.resolve(process.argv[2] || '.tmp/codex-independent-performance-2026-10-18/ui-variants');
const output = path.resolve('bench/codex-independent-performance-2026-10-18/ui-tooling/editor-attribution.json');
const files = new Map(), names = ['base', 'tooltip-off', 'swatch-paint-off', 'tooltip-and-paint-off', 'raw-arrays'];
function collect(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const actual = path.join(dir, entry.name), url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(actual, url);
    else if (!url.endsWith('.mp4')) files.set(url, readFileSync(actual));
  }
}
for (const name of names) collect(path.join(variantRoot, name, 'dist'), `/${name}`);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((request, response) => {
  let key = new URL(request.url, 'http://localhost').pathname;
  if (key.endsWith('/')) key += 'index.html';
  const bytes = files.get(key);
  response.writeHead(bytes ? 200 : 404, { 'Content-Type': types[path.extname(key)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(bytes || 'Not found');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const rows = [];
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true, chromiumSandbox: true });
  const version = browser.version();
  const colors = Array.from({ length: 256 }, (_, index) => '#' + index.toString(16).padStart(2, '0').repeat(3)).join('\n');
  async function sample(variant, pair, order) {
    const context = await browser.newContext({ viewport: { width: 927, height: 827 }, deviceScaleFactor: 1, colorScheme: 'light' });
    await context.addInitScript(() => localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg32', theme: 'light' })));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${origin}/${variant}/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole('button', { name: 'Palette', exact: true }).click();
      await page.getByRole('button', { name: 'Import palette', exact: true }).click();
      await page.getByRole('button', { name: 'Paste colors', exact: true }).click();
      await page.getByRole('textbox', { name: 'Colors or Lospec link', exact: true }).fill(colors);
      await page.evaluate(() => {
        window.__uiReview = { tasks: [], clicked: 0 };
        const observer = new PerformanceObserver(list => window.__uiReview.tasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))));
        observer.observe({ type: 'longtask' });
        window.__uiReview.observer = observer;
        document.addEventListener('click', event => { if (event.target.closest('button')?.textContent.trim() === 'Review colors') window.__uiReview.clicked = performance.now(); }, { capture: true });
      });
      const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
      await page.getByRole('button', { name: 'Review colors', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.palette-review-swatch').length === 64);
      const ready = await page.evaluate(async () => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const value = window.__uiReview;
        const end = performance.now();
        value.tasks.push(...value.observer.takeRecords().map(entry => ({ start: entry.startTime, duration: entry.duration })));
        value.observer.disconnect();
        return { clickToTwoFramesMs: end - value.clicked, clicked: value.clicked, end,
          longTasks: value.tasks.filter(task => task.start < end && task.start + task.duration > value.clicked),
          swatches: document.querySelectorAll('.palette-review-swatch').length,
          heading: document.querySelector('.palette-review-heading')?.textContent.trim(),
          tooltips: document.querySelectorAll('.tooltip').length,
          dom: document.querySelectorAll('*').length, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          userAgent: navigator.userAgent, visibility: document.visibilityState };
      });
      const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
      const delta = {};
      for (const name of ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration']) delta[`${name}Ms`] = (after[name] - before[name]) * 1000;
      const row = { variant, pair, order, ...delta, ...ready, errors };
      if (ready.swatches !== 64 || !ready.heading.includes('256 colors') || errors.length) throw new Error(JSON.stringify(row));
      rows.push(row);
      writeFileSync(output, JSON.stringify({ version, browser: 'auxiliary sandboxed headless Edge', note: 'Each sample is a fresh context/page; shared browser process. Diagnostic off variants alter behavior and cannot ship.', rows }, null, 2));
      console.log(JSON.stringify({ variant, pair, taskMs: delta.TaskDurationMs, layoutMs: delta.LayoutDurationMs, scriptMs: delta.ScriptDurationMs, readyMs: ready.clickToTwoFramesMs }));
    } finally { await context.close(); }
  }
  for (const alternative of names.slice(1)) for (let pair = 0; pair < 3; pair++) {
    const order = pair % 2 ? [alternative, 'base'] : ['base', alternative];
    for (let index = 0; index < order.length; index++) await sample(order[index], `${alternative}-${pair + 1}`, index);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
