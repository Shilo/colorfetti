import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { analyze, mask, colorize } from '../../../src/lib/recolor.js';
import { defaults } from '../../../src/lib/settings.js';
import { inks } from '../../../src/lib/presets.js';
import { decode, compare, sha, usedColors } from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
const root = new URL('./supplement/', import.meta.url), source = await decode(new URL('../../practical-workloads-2026-10-16/fixtures/dungeon-wizard.png', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const rows = [];
for (const filename of (await readdir(root)).filter(f => f.endsWith('.png') && f.includes('-1bit.png'))) {
  const style = filename.match(/-style-([a-z]+)-/)?.[1] || 'solid';
  const overrides = filename.includes('-ink-11-') ? { none: 1 } : filename.includes('-ink-12-') ? { none: 2 } : filename.includes('-ink-13-') ? { first: '#123456', second: '#123456' } : {};
  const settings = { first: '#222323', second: '#f0f6f0', none: 0, ...overrides }, set = defaults(style), analysis = analyze({ width: source.w, height: source.h, data: source.frames[0] }, set.source, set.alpha), expected = colorize(mask(analysis, style, set), ...inks(settings.first, settings.second, settings.none, style));
  const bytes = await readFile(new URL(filename, root)), decoded = await decode(bytes);
  assert.equal(decoded.w, source.w); assert.equal(decoded.h, source.h);
  assert.deepEqual(compare(decoded.frames[0], expected), { alphaMismatch: 0, rgbMismatch: 0, first: null });
  rows.push({ filename, style, settings, width: decoded.w, height: decoded.h, colors: usedColors(decoded.frames), sha256: sha(bytes), alphaMismatch: 0, visibleRgbMismatch: 0 });
}
assert.equal(rows.length, 14);
await writeFile(new URL('./retained-styles-verification.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), rows, qualification: 'Native downloads retained from supplement before its ZIP locator failure; independently decoded now. Expected styles use frozen baseline algorithm outside browser; independent alpha/palette/dimensions also checked. No discarded output error.' }, null, 2) + '\n');
console.log(`Verified ${rows.length} retained native style/None/equal PNGs.`);
