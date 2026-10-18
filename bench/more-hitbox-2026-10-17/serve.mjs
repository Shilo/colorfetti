import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';
import { build, preview } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const foundation = await readFile(path.join(root, 'src/foundation.css'), 'utf8');
const paths = [...foundation.matchAll(/@import '\.\/(.+?)';/g)].map(match => `src/${match[1]}`);
paths.push('src/caption-metadata.css');

// Test-only branch activation: preserve production declarations/order and nested
// container/width conditions. This is mouse testing of touch CSS, not touch emulation.
let activated = '/* GENERATED FROM CURRENT PRODUCTION HOVER:NONE BRANCHES. */\n';
for (const name of paths) {
  const parsed = postcss.parse(await readFile(path.join(root, name), 'utf8'), { from: name });
  parsed.walkAtRules('media', media => {
    if (!/\(hover:\s*none\)/.test(media.params)) return;
    const clone = media.clone();
    clone.params = clone.params.replace(/\(hover:\s*none\)/g, 'all');
    clone.walkRules(rule => {
      rule.selectors = rule.selectors.map(selector => selector.includes(':root')
        ? selector.replaceAll(':root', ':root .touch-layout')
        : `:root .touch-layout ${selector}`);
    });
    activated += `/* ${name} */\n${clone.toString()}\n`;
  });
}
const config = {
  configFile: false, root, base: '/', cacheDir: path.join(here, '.vite'),
  plugins: [svelte(), {
    name: 'more-hitbox-fixture-touch-css',
    resolveId(id) { if (id === 'virtual:more-touch-branches.css') return '\0more-touch-branches.css'; },
    load(id) { if (id === '\0more-touch-branches.css') return activated; }
  }],
  build: {
    outDir: path.join(here, '.dist'), emptyOutDir: true,
    rollupOptions: { input: [path.join(here, 'fixture.html'), path.join(here, 'actual.html')] }
  },
  preview: { host: '127.0.0.1', port: 5358, strictPort: true }
};
await build(config);
await preview(config);
console.log('http://127.0.0.1:5358/bench/more-hitbox-2026-10-17/fixture.html');
