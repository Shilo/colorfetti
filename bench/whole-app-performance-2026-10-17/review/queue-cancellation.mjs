import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const here = import.meta.dirname, url = process.env.AUDIT_URL || 'http://127.0.0.1:5371/';
const report = { url, baseline: '217cb64360784c066e944f8121858d7726f0e4f2', browserSurface: 'auxiliary isolated sandboxed Edge', checks: [], errors: [] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
try {
  for (const action of ['settings', 'remove']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.stack));
    await page.addInitScript(() => { localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64', metric: 'oklab', alphaMode: 'cut', alphaCut: 128, maxColors: 0, cleanup: false, dither: 'none' })); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1'); });
    let release, requests = 0;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/palette-usage-*.js', async route => { requests++; await held; await route.continue(); });
    try {
      await page.goto(url);
      const files = await Promise.all(['dungeon-wizard', 'dungeon-potion'].map(async (id, i) => ({ name: `cf-review-queue-${i ? 'b' : 'a'}.png`, bytes: (await readFile(path.resolve(here, '../../practical-workloads-2026-10-16/fixtures', id + '.png'))).toString('base64') })));
      await page.evaluate(files => { const dt = new DataTransfer(); for (const file of files) dt.items.add(new File([Uint8Array.from(atob(file.bytes), c => c.charCodeAt(0))], file.name, { type: 'image/png' })); const input = document.querySelector('input[type=file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); }, files);
      await page.waitForFunction(() => { const fs = [...document.querySelectorAll('.grid figure')]; return fs.length === 2 && ['cf-review-queue-a.png', 'cf-review-queue-b.png'].every(name => fs.some(f => f.querySelector('.name')?.textContent === name && f.querySelector('.art canvas')?.width > 0)); });
      assert(requests > 0, 'usage module was not held; cannot establish pending-count test');
      await page.getByRole('button', { name: 'Reuse colors from cf-review-queue-a.png', exact: true }).click();
      assert.equal(await page.locator('dialog.palette-import-modal').count(), 0, 'pending Reuse opened a draft before its current exact result');
      if (action === 'settings') {
        await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
        await page.getByRole('button', { name: 'RGB matching', exact: true }).click();
        await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
      } else await page.getByRole('button', { name: 'Remove cf-review-queue-a.png', exact: true }).click();
      release();
      const expected = action === 'settings' ? files.map(f => f.name) : [files[1].name];
      await page.waitForFunction(names => { const fs = [...document.querySelectorAll('.grid figure')]; return fs.length === names.length && names.every(name => fs.some(f => f.querySelector('.name')?.textContent === name && f.querySelector('.caption-color-count[aria-busy=false]'))); }, expected);
      // Once current queues have completed, the abandoned explicit request must
      // not reveal its stale editor. This checks UI behavior, not job CPU counts.
      assert.equal(await page.locator('dialog.palette-import-modal').count(), 0, 'canceled Reuse revealed a stale draft');
      const current = expected[0];
      const tile = page.locator('.grid figure').filter({ has: page.locator('.name', { hasText: current }) });
      const count = parseInt(await tile.locator('.caption-color-count').textContent(), 10);
      await page.getByRole('button', { name: `Reuse colors from ${current}`, exact: true }).click();
      await page.locator('dialog.palette-import-modal').waitFor();
      const labels = await page.locator('.palette-review-grid button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
      assert.equal(labels.length, count);
      assert.equal(await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), current.replace(/\.[^.]+$/, '') + ' colors');
      assert.match(await page.locator('dialog.palette-import-modal').textContent(), new RegExp(`${count} colors? used in the converted image`));
      await page.screenshot({ path: path.join(here, `queue-cancellation-${action}.png`) });
      report.checks.push({ action, heldModuleRequests: requests, survivingNames: expected, currentCount: count, currentDraftColors: labels });
      await page.getByRole('button', { name: 'Close palette editor', exact: true }).click();
    } finally { release(); await context.close(); }
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally { report.notes = ['Artificially held lazy usage module establishes a deterministic pending automatic queue and explicit Reuse join. All app interactions use real input controls.', 'Changing settings or removing the captured source cancels stale draft publication; a subsequent fresh Reuse opens only the current source/count.', 'This is fresh built-app functional cancellation coverage, not real-network performance, a CPU duplication count, or native Android/Codex coverage.']; await writeFile(path.join(here, 'queue-cancellation-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
