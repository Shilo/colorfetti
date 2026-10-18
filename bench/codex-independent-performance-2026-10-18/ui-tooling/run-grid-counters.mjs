// Auxiliary sandboxed Edge attribution; requires lightweight server5401 already running.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true, chromiumSandbox: true });
const context = await browser.newContext({ viewport: { width: 927, height: 827 }, deviceScaleFactor: 1, colorScheme: 'light' });
await context.addInitScript(() => localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg32', theme: 'light' })));
const page = await context.newPage();
page.setDefaultTimeout(15000);
const receipts = [];
async function counted(label, callback) {
  await page.evaluate(label => window.__codexUiTelemetry.start(label), label);
  await callback();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  receipts.push(await page.evaluate(() => window.__codexUiTelemetry.finish()));
}
try {
  await page.goto('http://127.0.0.1:5401/?telemetry=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await counted('palette-panel-open', () => page.getByRole('button', { name: 'Palette', exact: true }).click());
  await counted('ten-palette-steps-empty-demo', async () => {
    for (const name of ['Resurrect 64', 'ENDESGA 32', 'Mulfok 32', 'PICO-8', 'DawnBringer 16', 'ENDESGA 8', 'Grayscale 8', 'Ice Cream GB', 'Game Boy Green', 'Black & White']) await page.getByRole('button', { name, exact: true }).click();
  });
  await counted('new-editor-open', () => page.getByRole('button', { name: 'Import palette', exact: true }).click());
  await page.getByRole('button', { name: 'Paste colors', exact: true }).click();
  await page.getByRole('textbox', { name: 'Colors or Lospec link', exact: true }).fill(Array.from({ length: 256 }, (_, index) => '#' + index.toString(16).padStart(2, '0').repeat(3)).join('\n'));
  await counted('editor256-review', async () => {
    await page.getByRole('button', { name: 'Review colors', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.palette-review-swatch').length === 64);
  });
  await counted('editor-next-previous', async () => {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
  });
  await counted('editor-close', () => page.getByRole('button', { name: 'Close palette editor', exact: true }).click());
  writeFileSync('bench/codex-independent-performance-2026-10-18/ui-tooling/grid-counter-receipts.json', JSON.stringify({ version: browser.version(), surface: 'auxiliary sandboxed headless Edge', instrumentationOnly: true, note: 'No speedup claim from counters or wrapped API CPU. Empty demo plus editor only; import/resize/first-art replacement are not measured here.', receipts }, null, 2));
  console.log(JSON.stringify(receipts));
} finally { await context.close(); await browser.close(); }
