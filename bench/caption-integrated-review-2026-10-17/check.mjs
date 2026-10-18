import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:5352/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const report = { url, chromiumSandbox: true, checks: [], errors: [] };
try {
  for (const [name, width, height, touch] of [['desktop', 1280, 900, false], ['touch-portrait', 390, 844, true], ['touch-landscape', 844, 390, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    page.on('pageerror', e => report.errors.push(e.stack));
    await page.addInitScript(() => { localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64', metric: 'oklab', maxColors: 0 })); localStorage.setItem('colorfetti-help-seen', '1'); });
    await page.goto(url);
    await page.locator('input[type=file]').first().setInputFiles('bench/count-stability-2026-10-16/two-colors.png');
    const count = page.locator('.grid .caption-color-count');
    await count.locator('visible=true').waitFor();
    await page.waitForFunction(() => document.querySelector('.grid .caption-color-count')?.textContent === '2 colors' && document.querySelector('.grid .caption-color-count')?.getAttribute('aria-busy') === 'false');
    const before = await page.locator('.grid .caption-resolution').boundingBox();
    const counted = await count.boundingBox();
    assert(touch ? before.x < counted.x : counted.x < before.x, `${name}: wrong metadata order`);
    if (!touch) {
      await page.evaluate(() => { window.reviewCounts = []; new MutationObserver(() => window.reviewCounts.push(document.querySelector('.grid .caption-metadata')?.textContent ?? '')).observe(document.querySelector('.grid .caption-metadata'), { subtree: true, characterData: true, childList: true }); });
      await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
      const limit = page.getByRole('spinbutton', { name: 'Max colors value', exact: true });
      for (const n of [4, 32, 8, 64, 3, 16, 5, 64]) { await limit.fill(String(n)); await limit.press('Enter'); }
      for (const name of ['RGB matching', 'Oklab matching', 'Cleanup on', 'Cleanup off', 'Dithering 4x4', 'Dithering off']) await page.getByRole('button', { name, exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.grid .caption-color-count')?.getAttribute('aria-busy') === 'false');
      assert.equal(await count.textContent(), '2 colors');
      const updates = await page.evaluate(() => window.reviewCounts);
      assert(updates.every(text => text.includes('2 colors')), 'Stable two-color metadata disappeared during settings changes');
      await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
      report.checks.push({ name: 'rapid cap/settings cancellation', updates: updates.length, blanks: 0 });
    }
    await page.locator('body').click({ position: { x: 3, y: 3 } });
    for (let i = 0; i < 4; i++) { await page.keyboard.down('Space'); assert.equal(await count.textContent(), '2 colors'); await page.keyboard.up('Space'); }
    await page.locator('.grid .caption-preview').click();
    await page.getByRole('button', { name: 'Close preview', exact: true }).click();
    assert.equal(await count.textContent(), '2 colors');
    const after = await page.locator('.grid .caption-resolution').boundingBox();
    assert(Math.abs(before.x - after.x) < .1, 'Resolution shifted after count/comparison updates');
    report.checks.push({ name, caption: await page.locator('.grid .caption-metadata').textContent(), resolutionX: after.x });
    await page.locator('button[aria-label="Palette"]').click();
    await page.getByRole('button', { name: 'Black & White', exact: true }).click();
    await page.locator('button[aria-label="Palette"]').click();
    await page.locator('input[type=file]').first().setInputFiles('src/assets/logo.png');
    await page.waitForFunction(() => [...document.querySelectorAll('.grid .caption-color-count')].at(-1)?.textContent === '2 colors');
    await page.locator('body').click({ position: { x: 3, y: 3 } });
    await page.keyboard.down('Space');
    await page.waitForFunction(() => [...document.querySelectorAll('.grid .caption-color-count')].at(-1)?.textContent === '6 colors');
    await page.keyboard.up('Space');
    await page.waitForFunction(() => [...document.querySelectorAll('.grid .caption-color-count')].at(-1)?.textContent === '2 colors');
    report.checks.push({ name: `${name}: actual Original 2→6→2 and multiple sources` });
    await page.close();
  }
  for (const style of ['cutout', 'bayer']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', e => report.errors.push(e.stack));
    await page.addInitScript(style => { localStorage.setItem('colorfetti', JSON.stringify({ family: 'two-color', style, first: '#000000', second: '#ffffff' })); localStorage.setItem('colorfetti-help-seen', '1'); }, style);
    await page.goto(url);
    await page.locator('input[type=file]').first().setInputFiles('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
    await page.waitForFunction(() => document.querySelector('.grid .caption-resolution')?.textContent === '2048×2048');
    if (style === 'cutout') {
      await page.waitForFunction(() => document.querySelector('.grid .caption-color-count')?.textContent === '2 colors');
      report.checks.push({ name: 'large structural sample certifies exact saturation' });
    } else {
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.grid .caption-color-count').count(), 0, 'A sampled pattern must not pretend to establish full-source usage');
      await page.locator('.grid .caption-preview').click();
      for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.image-viewer .caption-color-count')?.textContent === '2 colors');
      await page.getByRole('button', { name: 'Close preview', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.grid .caption-color-count')?.textContent === '2 colors');
      report.checks.push({ name: 'large pattern unknown → exact zoom metadata → wall after Preview close' });
    }
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; throw error; }
finally { await browser.close(); await writeFile(new URL('results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
