// Diagnostic source variants only. Does not edit the live checkout or build/time.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const revision = '5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce';
const target = path.resolve('.tmp/codex-independent-performance-2026-10-18/ui-variants');
if (!target.startsWith(root + path.sep) || existsSync(target)) throw new Error('Refusing unsafe or existing variant destination.');
const names = execFileSync('git', ['ls-tree', '-r', '--name-only', revision], { encoding: 'utf8' }).trim().split('\n')
  .filter(n => (n.startsWith('src/') && !n.includes('.test.') && !n.startsWith('src/lib/fixtures/'))
    || n === 'index.html' || n === 'package.json' || n === 'package-lock.json' || n === 'vite.config.js'
    || n === 'build/hover-capability.js'
    || (n.startsWith('public/') && !n.endsWith('.mp4')));
const noopTooltip = `export function tooltip() { return { update() {}, destroy() {} }; }\n`;
const variants = ['base', 'tooltip-off', 'swatch-paint-off', 'tooltip-and-paint-off', 'raw-arrays'];
const baseline = new Map(names.map(name => [name, execFileSync('git', ['show', `${revision}:${name}`])]));
const manifest = { revision, target, diagnosticOnly: true, generated: new Date().toISOString(), variants: [] };
for (const variant of variants) {
  const changes = [];
  for (const name of names) {
    let data = baseline.get(name);
    const oldHash = createHash('sha256').update(data).digest('hex');
    if ((variant === 'tooltip-off' || variant === 'tooltip-and-paint-off') && name === 'src/lib/tooltip.js') data = Buffer.from(noopTooltip);
    if ((variant === 'swatch-paint-off' || variant === 'tooltip-and-paint-off') && name === 'src/lib/palette-preview.js') {
      const source = data.toString();
      const from = 'return paintAction(canvas, color, drawSwatch);';
      if (!source.includes(from)) throw new Error('Swatch diagnostic transform no longer matches.');
      // Retain identical canvas markup and CSS; disable only swatch action painting.
      data = Buffer.from(source.replace(from, 'return { update() {} };'));
    }
    if (variant === 'raw-arrays' && name === 'src/PaletteImport.svelte') {
      let source = data.toString();
      for (const variable of ['colors', 'baseline', 'selected']) {
        const from = `let ${variable} = $state(`;
        if (!source.includes(from)) throw new Error(`Raw-array transform no longer matches ${variable}.`);
        source = source.replace(from, `let ${variable} = $state.raw(`);
      }
      data = Buffer.from(source);
    }
    const destination = path.join(target, variant, name);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, data);
    const newHash = createHash('sha256').update(data).digest('hex');
    if (oldHash !== newHash) changes.push({ name, oldHash, newHash });
  }
  manifest.variants.push({ name: variant, files: names.length, changes });
}
writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
