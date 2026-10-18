// Probe H-A1: how many full-resolution 1-bit count masks does onebit-usage compute during a
// simulated Style-slider drag, when every move restarts each tile's collection (Tile.svelte
// oneBit effect), versus collecting once after the drag rests?
// Run: node --import ./register-probe-onebit-drag.mjs probe-onebit-drag.mjs [tiles] [moves] [style] [side]
import { analyze } from '../../../../src/lib/recolor.js';
import { analysisKey } from '../../../../src/lib/image-reanalysis.js';
import { collectOneBitUsage } from '../../../../src/lib/onebit-usage.js';
import { defaults } from '../../../../src/lib/settings.js';
const [tiles = 4, moves = 60, style = 'checker', side = 512] = process.argv.slice(2).map((v, i) => i === 2 ? v : +v);
function item(seed) {
  const w = side, h = side, data = new Uint8ClampedArray(w * h * 4);
  let s = seed * 2654435761 >>> 0;
  for (let p = 0; p < w * h; p++) { s = s * 1664525 + 1013904223 >>> 0; const v = (p % w + (p / w | 0)) * 255 / (w + h) + (s & 31) | 0; data.set([v, v, v, 255], p * 4); }
  const original = { width: w, height: h, data };
  const img = analyze(original, 'luma', 128);
  return { id: seed, original, img, by: analysisKey(img.soft, { source: 'luma', alphaCut: 128 }) };
}
let items;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function drag(deferred) {
  items = Array.from({ length: tiles }, (_, i) => item(i + 1 + (deferred ? 100 : 0))); // fresh analyses: no shared role cache
  globalThis.__maskCalls = 0; globalThis.__maskMs = 0;
  let controllers = [], pending = [];
  const start = performance.now();
  for (let m = 0; m < moves; m++) {
    const set = { ...defaults(style), threshold: 60 + m };
    controllers.forEach(c => c.abort());
    controllers = items.map(() => new AbortController());
    if (!deferred) pending = items.map((it, i) => collectOneBitUsage(it, { first: '#000000', second: '#ffffff', style, set }, { signal: controllers[i].signal }).catch(() => null));
    await sleep(16); // next pointermove
  }
  if (deferred) {
    const set = { ...defaults(style), threshold: 60 + moves - 1 };
    pending = items.map((it, i) => collectOneBitUsage(it, { first: '#000000', second: '#ffffff', style, set }, { signal: controllers[i].signal }).catch(() => null));
  }
  const results = await Promise.all(pending);
  return { masks: globalThis.__maskCalls, maskMs: +globalThis.__maskMs.toFixed(1), wallMs: +(performance.now() - start).toFixed(1), counts: results.map(r => r?.count ?? null) };
}
const live = await drag(false), rest = await drag(true);
console.log(JSON.stringify({ tiles, moves, style, side, perMoveRestart: live, collectAfterRest: rest }, null, 1));
