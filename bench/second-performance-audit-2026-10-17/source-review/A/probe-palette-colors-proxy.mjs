// Probe H-A6: cost of PaletteImport's deep-proxied `colors`/`baseline` arrays versus $state.raw
// for the derived reads the editor performs after an import (visible slice, edited compare,
// eligible, includes). Compiles a tiny rune module with the repo's Svelte compiler and runs it
// on Svelte's client runtime in Node (no DOM is touched by state/derived).
import { compileModule } from 'svelte/compiler';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const dir = resolve('../../../../.tmp/source-review-A'); mkdirSync(dir, { recursive: true });
const source = kind => `
export function make(initial) {
  let colors = $state${kind}([...initial]);
  let baseline = $state${kind}([...initial]);
  let page = $state(0);
  const visible = $derived(colors.slice(page * 64, (page + 1) * 64));
  const edited = $derived(colors.length !== baseline.length || colors.some((c, i) => c !== baseline[i]));
  const eligible = $derived(colors.length >= 1 && colors.length <= 256);
  return {
    apply(next) { colors = next; baseline = [...next]; page = 0; },
    read() { return [visible.length, edited, eligible, colors.includes('#123456')]; },
  };
}`;
const mods = {};
for (const [name, kind] of [['deep', ''], ['raw', '.raw']]) {
  const { js } = compileModule(source(kind), { generate: 'client', filename: name + '.svelte.js' });
  const file = resolve(dir, `probe-colors-${name}.mjs`);
  writeFileSync(file, js.code.replaceAll("'svelte/internal/client'", `'${pathToFileURL(resolve('../../../../node_modules/svelte/src/internal/client/index.js')).href}'`).replaceAll("'svelte/internal/disclose-version'", `'${pathToFileURL(resolve('../../../../node_modules/svelte/src/internal/disclose-version.js')).href}'`));
  mods[name] = await import(pathToFileURL(file).href);
}
const palette = n => Array.from({ length: n }, (_, i) => '#' + (i * 2654435761 >>> 8 & 0xffffff).toString(16).padStart(6, '0'));
const out = {};
for (const n of [256, 4096]) for (const name of ['deep', 'raw']) {
  const times = [];
  for (let trial = 0; trial < 40; trial++) {
    const m = mods[name].make([]);
    const next = palette(n);
    const t = performance.now();
    m.apply(next); m.read(); // one import then the first render's reads
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  out[`${name}-${n}`] = { medianMs: +times[20].toFixed(3), p90Ms: +times[36].toFixed(3) };
}
console.log(JSON.stringify(out));
