import * as real from '../../../../src/lib/recolor.js';
export * from '../../../../src/lib/recolor.js';
globalThis.__maskCalls = 0; globalThis.__maskMs = 0;
export function mask(...args) {
  const t = performance.now();
  try { return real.mask(...args); } finally { globalThis.__maskCalls++; globalThis.__maskMs += performance.now() - t; }
}
