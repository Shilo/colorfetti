import{build,mergeConfig}from'vite';import base from'../../../vite.config.js';const phase=process.argv[2]??'before',label=process.argv[3]??phase;
await build(mergeConfig(base,{configFile:false,define:{__M8_PHASE__:JSON.stringify(label)},build:{outDir:`.tmp/conversion-fixes-m8-${phase}`,
  rollupOptions:{input:['index.html','bench/conversion-fixes-2026-10-18/m8/browser.html']}}}));
