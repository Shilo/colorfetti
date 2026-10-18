import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const here = import.meta.dirname;
const fixtures = path.resolve(here, '../../practical-workloads-2026-10-16');
const manifest = JSON.parse(await readFile(path.join(fixtures, 'manifest.json'), 'utf8'));
const url = process.env.AUDIT_URL || 'http://127.0.0.1:5371/';
const report = { date: new Date().toISOString(), baseline: '217cb64360784c066e944f8121858d7726f0e4f2', url, sandbox: true, errors: [], windows: [], cycles: [] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function observe() {
  if (globalThis.__life) return;
  const info = globalThis.__life = { puts: 0, raf: 0, timerScheduled: 0, workerStarted: 0, workerTerminated: 0, urlCreated: 0, urlRevoked: 0, urls: [], longtasks: [] };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function(...args) {
    const result = put.apply(this, args);
    if (this.canvas.closest('.grid,.image-viewer')) { info.puts++; this.canvas.__lifePaint = performance.now(); }
    return result;
  };
  const raf = requestAnimationFrame;
  globalThis.requestAnimationFrame = function(...args) { info.raf++; return raf.apply(this, args); };
  const timer = setTimeout;
  globalThis.setTimeout = function(...args) { info.timerScheduled++; return timer.apply(this, args); };
  const WorkerClass = globalThis.Worker;
  globalThis.Worker = class extends WorkerClass {
    constructor(...args) { super(...args); info.workerStarted++; this.__lifeTerminated = false; }
    terminate() { if (!this.__lifeTerminated) { this.__lifeTerminated = true; info.workerTerminated++; } return super.terminate(); }
  };
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = function(...args) { const value = create.apply(this, args); info.urlCreated++; info.urls.push(value); return value; };
  URL.revokeObjectURL = function(value) { info.urlRevoked++; const index = info.urls.indexOf(value); if (index >= 0) info.urls.splice(index, 1); return revoke.call(this, value); };
  // This observer and primitive counters never retain a canvas, source, Worker,
  // Blob or callback. There is deliberately no observer-generated rAF/timer loop.
  new PerformanceObserver(list => { for (const entry of list.getEntries()) info.longtasks.push({ start: entry.startTime, duration: entry.duration }); }).observe({ type: 'longtask' });
}

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.addInitScript(observe);
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64', alphaCut: 128, alphaMode: 'cut', metric: 'oklab', maxColors: 0, cleanup: false, dither: 'none', ditherStrength: 50, theme: 'dark' }));
    localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1');
  });
  await page.reload();
  await page.bringToFront();
  report.browser = browser.version();
  report.viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  async function capture() {
    return { counters: await page.evaluate(() => ({ ...__life, urls: [...__life.urls], longtasks: [...__life.longtasks], now: performance.now() })), metrics: Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])) };
  }
  async function idle(label, ms = 900) {
    await page.mouse.move(4, 4); await pause(350);
    const before = await capture(); await pause(ms); const after = await capture();
    const row = { label, observedMs: after.counters.now - before.counters.now, delta: Object.fromEntries(['puts', 'raf', 'timerScheduled', 'workerStarted', 'workerTerminated', 'urlCreated', 'urlRevoked'].map(key => [key, after.counters[key] - before.counters[key]])), cpuMs: Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(key => [key, 1000 * (after.metrics[key] - before.metrics[key])])), urls: after.counters.urls.length, longtasks: after.counters.longtasks.filter(e => e.start >= before.counters.now) };
    report.windows.push(row); return row;
  }
  async function imported(record, name) {
    const bytes = await readFile(path.join(fixtures, record.file));
    // Allocate transport before the application event. This is functional lifecycle
    // coverage, not a claim to measure picker/drop latency.
    await page.evaluate(({ name, base64, mime }) => { globalThis.__lifeFile = new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], name, { type: mime }); }, { name, base64: bytes.toString('base64'), mime: record.frames > 1 ? 'image/gif' : 'image/png' });
    await page.evaluate(() => { const dt = new DataTransfer(); dt.items.add(__lifeFile); const input = document.querySelector('input[type=file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); delete globalThis.__lifeFile; });
    await page.waitForFunction(expected => {
      const fs = [...document.querySelectorAll('.grid figure')];
      return fs.length === 1 && fs[0].querySelector('.name')?.textContent === expected && fs[0].querySelector('.art canvas')?.width > 0 && fs[0].querySelector('.caption-color-count')?.textContent && fs[0].querySelector('.caption-color-count')?.getAttribute('aria-busy') !== 'true';
    }, name, { timeout: 60000 });
  }
  async function empty() {
    await page.getByRole('button', { name: /^Remove cf-review-/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('.grid figure').length === 1 && !document.querySelector('.grid figure .name')?.textContent?.startsWith('cf-review-'));
  }
  const sprite = manifest.records.find(r => r.id === 'dungeon-wizard');
  const motion = manifest.records.find(r => r.id === 'kenney-motion-256');
  for (let cycle = 0; cycle < 6; cycle++) {
    const name = `cf-review-sprite-${cycle}.png`;
    await imported(sprite, name);
    const initial = await idle(`still wall ${cycle}`);
    assert.equal(initial.delta.puts, 0, 'settled still repainted');
    assert.equal(initial.delta.raf, 0, 'settled still scheduled animation frames');
    await page.locator('.caption-preview').click();
    await page.locator('dialog.image-viewer .art canvas').waitFor();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await pause(280);
    const viewer = await idle(`still Preview ${cycle}`);
    assert.equal(viewer.delta.puts, 0, 'settled still Preview repainted');
    assert.equal(viewer.delta.raf, 0, 'settled still Preview scheduled animation frames');
    await page.getByRole('button', { name: 'Close preview', exact: true }).click();
    await empty();
    await cdp.send('HeapProfiler.collectGarbage');
    report.cycles.push({ cycle, final: await capture() });
  }
  await imported(motion, 'cf-review-motion.gif');
  report.animation = await idle('visible converted animation', 1600);
  assert(report.animation.delta.puts > 1, 'visible motion did not progress');
  await page.locator('.caption-preview').click();
  await page.locator('dialog.image-viewer .art canvas').waitFor();
  await pause(450);
  report.animationPreview = await idle('animation Preview takeover', 1300);
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await empty();
  await pause(600); await cdp.send('HeapProfiler.collectGarbage');
  report.final = await capture();
  report.notes = ['Auxiliary sandboxed Edge only. No actual Codex Browser/Android or candidate A/B result.', 'Idle instrumentation schedules no rAF or polling timers; only app calls are counted. Primitive diagnostics avoid retaining source/DOM/worker objects.', 'Heap after explicit collection is one JS allocation observation; intentional live demo/caches remain and no whole-app memory bound or leak absence follows.', 'Worker counts include intentional lazy worker reuse and do not prove outstanding source jobs. Object URL counts include legitimate export/decoded-image resources; investigate identities before claiming a leak.'];
  assert.deepEqual(report.errors, []);
  await cdp.detach(); await context.close();
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { await writeFile(path.join(here, 'lifecycle-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
