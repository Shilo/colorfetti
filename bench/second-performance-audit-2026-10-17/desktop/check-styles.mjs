// Compares the 11 1-bit style tile canvases (exact readback posted by probe.js) with the
// production-core mask oracle for dungeon-wizard.png at default settings and inks.
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {decode, compare} from '../../claude-audit-2026-10-15/device/audit-lib.mjs';
import {analyze, mask, colorize} from '../../../src/lib/recolor.js';
import {DEFAULTS, defaults} from '../../../src/lib/settings.js';
import {STYLES} from '../../../src/lib/presets.js';
const got = JSON.parse(await readFile('.tmp/second-audit-2026-10-17/desktop-raw/onebit-styles-pixels.json', 'utf8'));
const src = await decode(await readFile('bench/practical-workloads-2026-10-16/fixtures/dungeon-wizard.png'));
const analysis = analyze({width: src.w, height: src.h, data: new Uint8ClampedArray(src.frames[0])});
const rows = [];
for (const [style, name] of STYLES) {
  const g = got[name], oracle = colorize(mask(analysis, style, defaults(style)), DEFAULTS.first, DEFAULTS.second);
  const eq = compare(new Uint8Array(Buffer.from(g.base64, 'base64')), oracle);
  rows.push({style, width: g.width, height: g.height, ...eq});
}
const pass = rows.every(r => r.width === src.w && r.rgbMismatch === 0 && r.alphaMismatch === 0);
await writeFile(path.join(import.meta.dirname, 'onebit-styles-check.json'), JSON.stringify({pass, fixture: 'dungeon-wizard.png 16x16', method: 'Claude browser tile canvas getImageData (canvas is source-sized for this sprite) vs src/lib/recolor.js mask+colorize at defaults', rows}, null, 2) + '\n');
console.log(pass ? 'PASS' : 'FAIL', rows.map(r => `${r.style}:${r.rgbMismatch}/${r.alphaMismatch}`).join(' '));
