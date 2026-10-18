import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Predeclared gate: reject new repeated >50ms tasks or >16ms input→paint p95
// regression. Investigate a repeated >1ms median task/script increment in BOTH
// matched pairs; a single noisy page is not sufficient to dismiss or condemn it.
const mode = process.argv[2] ?? 'desktop', native = mode === 'android';
const runTag = process.argv[3] ?? '';
assert.match(runTag, /^[a-z0-9-]*$/);
const browser = native ? await chromium.connectOverCDP('http://127.0.0.1:9334') : await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const context = native ? browser.contexts()[0] : await browser.newContext({ viewport: { width: 1280, height: 900 } });
const ownedPages = new Set();
const report = { mode, baseline: '34a95d9', candidate: 'Rejected histogram proof; requires retained isolated candidate build, not current production source', urls: { baseline: 'http://127.0.0.1:5354/', candidate: 'http://127.0.0.1:5355/' }, gate: 'Repeated new long tasks, >16ms p95 input-paint regression, or repeatable >1ms median metadata CPU increment requires rejection/investigation', pages: [], errors: [] };
const file = 'bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png';
const median = a => [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const p95 = a => [...a].sort((a,b)=>a-b)[Math.min(a.length-1, Math.floor(a.length*.95))];
try {
  for (let pair = 0; pair < 2; pair++) for (const style of ['checker', 'noise']) for (const variant of pair % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
    const page = await context.newPage(); ownedPages.add(page);
    page.on('pageerror', error => report.errors.push(error.stack));
    await page.addInitScript(({ style }) => {
      localStorage.setItem('colorfetti', JSON.stringify({ family: 'two-color', style, first: '#000000', second: '#ffffff', none: 0, settings: { [style]: { threshold: 100 } } }));
      localStorage.setItem('colorfetti-help-seen', '1');
      window.warmProbe = { draws: 0, active: false, last: 0, gaps: [], tasks: [], inputAt: 0, paintAt: 0 };
      const actual = CanvasRenderingContext2D.prototype.putImageData;
      CanvasRenderingContext2D.prototype.putImageData = function(...args) {
        const result = actual.apply(this, args);
        if (this.canvas.matches('.grid .art canvas')) { warmProbe.draws++; if (warmProbe.active) warmProbe.paintAt = performance.now(); }
        return result;
      };
      document.addEventListener('input', e => { if (warmProbe.active && e.target.getAttribute('aria-label') === 'Threshold value') warmProbe.inputAt = performance.now(); }, true);
      function frame(now) { if (warmProbe.active) { if (warmProbe.last) warmProbe.gaps.push(now - warmProbe.last); warmProbe.last = now; } requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
      window.warmObserver = new PerformanceObserver(list => { if (warmProbe.active) warmProbe.tasks.push(...list.getEntries().map(e => ({ duration: e.duration, start: e.startTime }))); });
      warmObserver.observe({ type: 'longtask' });
    }, { style });
    await page.goto(report.urls[variant]);
    if (native) await page.bringToFront();
    // Stage host→device transport outside the measured settings windows.
    const bytes = await readFile(file);
    await page.evaluate(base64 => { const decoded = atob(base64), bytes = new Uint8Array(decoded.length); for (let p=0;p<decoded.length;p++) bytes[p]=decoded.charCodeAt(p); const dt = new DataTransfer(); dt.items.add(new File([bytes], 'kenney-sheet-2048.png', { type: 'image/png' })); const field = document.querySelector('input[type=file]'); field.files = dt.files; field.dispatchEvent(new Event('change',{bubbles:true})); }, bytes.toString('base64'));
    await page.waitForFunction(() => document.querySelector('.grid .name')?.textContent === 'kenney-sheet-2048.png' && warmProbe.draws > 0);
    await page.getByRole('button', { name: 'Style', exact: true }).click();
    const field = page.getByRole('spinbutton', { name: 'Threshold value', exact: true });
    await field.waitFor({ state: 'visible' });
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const rows = [];
    for (let step = 0; step < 25; step++) {
      const value = step % 2 ? 100 : 150;
      const before = await metrics();
      const draw = await page.evaluate(() => { warmObserver.takeRecords(); warmProbe.active = true; warmProbe.tasks = []; warmProbe.gaps = []; warmProbe.last = 0; warmProbe.inputAt = warmProbe.paintAt = 0; warmProbe.startAt = performance.now(); warmProbe.startDraws = warmProbe.draws; return warmProbe.draws; });
      await field.fill(String(value));
      await page.waitForFunction(draw => warmProbe.draws > draw && warmProbe.paintAt > warmProbe.inputAt && warmProbe.inputAt > 0, draw);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => { warmProbe.tasks.push(...warmObserver.takeRecords().map(e=>({duration:e.duration,start:e.startTime}))); warmProbe.active = false; return { inputPaintMs: warmProbe.paintAt - warmProbe.inputAt, windowMs: performance.now() - warmProbe.startAt, draws: warmProbe.draws - warmProbe.startDraws, maxFrameGap: Math.max(0, ...warmProbe.gaps), tasks: warmProbe.tasks, count: document.querySelector('.grid .caption-color-count')?.textContent ?? null, busy: document.querySelector('.grid .caption-color-count')?.getAttribute('aria-busy') ?? null }; });
      const after = await metrics();
      if (variant === 'candidate') { assert.equal(state.count, '2 colors'); assert.equal(state.busy, 'false'); } else assert.equal(state.count, null);
      if (step >= 5) {
        assert.equal(state.draws, 1, 'one warmed committed setting change must paint once');
        rows.push({ step, value, taskMs: (after.TaskDuration-before.TaskDuration)*1000, scriptMs: (after.ScriptDuration-before.ScriptDuration)*1000, layoutMs: (after.LayoutDuration-before.LayoutDuration)*1000, styleMs: (after.RecalcStyleDuration-before.RecalcStyleDuration)*1000, layouts: after.LayoutCount-before.LayoutCount, styles: after.RecalcStyleCount-before.RecalcStyleCount, ...state });
      }
    }
    report.pages.push({ pair, style, variant, rows, summary: { taskMs: median(rows.map(r=>r.taskMs)), scriptMs: median(rows.map(r=>r.scriptMs)), layoutMs: median(rows.map(r=>r.layoutMs)), styleMs: median(rows.map(r=>r.styleMs)), layouts: median(rows.map(r=>r.layouts)), styles: median(rows.map(r=>r.styles)), windowMs: median(rows.map(r=>r.windowMs)), inputPaintP95: p95(rows.map(r=>r.inputPaintMs)), maxFrameGap: Math.max(...rows.map(r=>r.maxFrameGap)), longTasks: rows.flatMap(r=>r.tasks) } });
    await cdp.detach(); await page.close(); ownedPages.delete(page);
  }
  assert.deepEqual(report.errors, []);
} finally {
  for (const page of ownedPages) await page.close().catch(()=>{});
  await writeFile(new URL(`./warm-ui-${mode}${runTag ? '-'+runTag : ''}-results.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
  if (!native) await browser.close();
}
console.log(JSON.stringify(report.pages.map(({ pair, style, variant, summary })=>({pair,style,variant,...summary}))));
if (native) process.exit(0);
