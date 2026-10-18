import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { decode, nearest, usedColors } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';

const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:5352/';
const report = { url, errors: [], checks: [], oracle: {} };
for (const theme of ['light', 'dark']) {
  const image = await decode(`src/assets/logo${theme === 'dark' ? '-dark' : ''}.png`);
  const palette = FULL_PRESETS.find(p => p.id === 'preset-mono');
  report.oracle[theme] = {
    original: usedColors(image.frames).length,
    blackAndWhite: usedColors(image.frames.map(f => nearest(f, palette.colors).data)).length,
  };
}
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
async function open({ family = 'full-palette', paletteId = 'preset-mono', theme = 'light', style = 'cutout', none = 0, viewport = { width: 1280, height: 900 }, touch = false } = {}) {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch, colorScheme: 'light' });
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.addInitScript(settings => {
    localStorage.setItem('colorfetti', JSON.stringify(settings));
    localStorage.setItem('colorfetti-help-seen', '1');
  }, { family, paletteId, theme, style, none, first: '#000000', second: '#ffffff', metric: 'oklab', maxColors: 0 });
  await page.goto(url);
  await page.locator('.example-caption .caption-color-count[aria-busy="false"]').waitFor();
  return page;
}
const count = async page => {
  await page.locator('.example-caption .caption-color-count[aria-busy="false"]').waitFor();
  return Number((await page.locator('.example-caption .caption-color-count').innerText()).match(/^\d+/)?.[0]);
};
async function theme(page, next) {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: `${next === 'dark' ? 'Dark' : 'Light'} mode`, exact: true }).click();
  await page.waitForFunction(value => document.documentElement.dataset.theme === value, next);
}
async function original(page, expected) {
  await page.locator('body').click({ position: { x: 3, y: 3 } });
  await page.keyboard.down('Space');
  await page.waitForFunction(n => document.querySelector('.example-caption .caption-color-count')?.textContent === `${n} colors`, expected);
  assert.equal(await count(page), expected);
  await page.keyboard.up('Space');
}
try {
  for (const presentation of [
    { name: 'desktop', viewport: { width: 1280, height: 900 }, touch: false },
    { name: 'touch-portrait', viewport: { width: 390, height: 844 }, touch: true },
    { name: 'touch-landscape', viewport: { width: 844, height: 390 }, touch: true },
  ]) {
    const page = await open(presentation);
    assert.equal(await count(page), report.oracle.light.blackAndWhite);
    await theme(page, 'dark');
    await page.waitForFunction(() => document.querySelector('.example-caption .caption-color-count')?.textContent === '1 color');
    assert.equal(await count(page), report.oracle.dark.blackAndWhite);
    await original(page, report.oracle.dark.original);
    assert.equal(await count(page), report.oracle.dark.blackAndWhite);
    await theme(page, 'light');
    await page.waitForFunction(() => document.querySelector('.example-caption .caption-color-count')?.textContent === '2 colors');
    assert.equal(await count(page), report.oracle.light.blackAndWhite);
    const geometry = await page.locator('.example-caption').evaluate(el => {
      const rect = selector => { const r = el.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
      return { resolution: rect('.caption-resolution'), count: rect('.caption-color-count'), caption: rect('.example-add') };
    });
    assert(geometry.resolution.right < geometry.count.x, 'Example must keep resolution before count');
    assert(geometry.count.right <= geometry.caption.right, 'Example count must remain within caption');
    await page.screenshot({ path: new URL(`${presentation.name}.png`, import.meta.url).pathname.replace(/^\/(.:)/, '$1') });
    report.checks.push({ name: `${presentation.name}: theme, Original, left alignment and bounds`, geometry });
    await page.close();
  }
  for (const paletteId of ['generated-32', 'preset-res64', 'preset-edg32']) {
    const page = await open({ paletteId });
    assert.equal(await count(page), 6);
    await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
    for (const name of ['RGB matching', 'Oklab matching']) {
      await page.getByRole('button', { name, exact: true }).click();
      assert.equal(await count(page), 6);
    }
    await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
    // Import replaces the demo slot; removing the last item restores its source.
    await page.locator('input[type=file]').first().setInputFiles('bench/count-stability-2026-10-16/two-colors.png');
    await page.locator('.grid .caption-preview .caption-color-count[aria-busy="false"]').waitFor();
    assert.equal(await page.locator('.example-caption').count(), 0);
    await page.getByRole('button', { name: 'Remove two-colors.png', exact: true }).click({ force: true });
    await page.locator('.example-caption .caption-color-count[aria-busy="false"]').waitFor();
    assert.equal(await count(page), 6);
    report.checks.push({ name: `${paletteId}: automatic count, matching and demo/import transitions`, count: await count(page) });
    await page.close();
  }
  for (const own of [{ style: 'cutout', none: 0, expected: 2 }, { style: 'cutout', none: 1, expected: 1 }, { style: 'silhouette', none: 0, expected: 1 }, { style: 'silhouette', none: 2, expected: 1 }]) {
    const page = await open({ family: 'two-color', ...own });
    assert.equal(await count(page), own.expected);
    await original(page, report.oracle.light.original);
    assert.equal(await count(page), own.expected);
    report.checks.push({ name: `1-bit ${own.style}, None ${own.none}: actual used count and Original`, count: own.expected });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await browser.close();
  await writeFile(new URL('results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
