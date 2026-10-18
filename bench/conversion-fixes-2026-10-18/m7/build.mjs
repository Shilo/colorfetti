import { build,mergeConfig } from 'vite';
import base from '../../../vite.config.js';
const phase=process.argv[2]??'before';
await build(mergeConfig(base,{configFile:false,define:{__M7_PHASE__:JSON.stringify(phase)},build:{outDir:`.tmp/conversion-fixes-m7-${phase}`,
  rollupOptions:{input:['index.html','bench/conversion-fixes-2026-10-18/m7/browser.html']}}}));
