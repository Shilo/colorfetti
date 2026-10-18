import { build, mergeConfig } from 'vite';
import base from '../../../vite.config.js';
const phase = process.argv[2] ?? 'before';
await build(mergeConfig(base, { configFile: false, build: { outDir: `.tmp/conversion-fixes-m4-${phase}`, rollupOptions: {
  input: ['index.html', 'bench/conversion-fixes-2026-10-18/m4/browser.html'],
} } }));
