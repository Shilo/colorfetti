// Loader hook: redirect onebit-usage.js's './recolor.js' import to a counting wrapper.
import { pathToFileURL } from 'node:url';
const wrapper = new URL('./probe-onebit-drag-recolor-wrapper.mjs', import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === './recolor.js' && context.parentURL?.endsWith('/src/lib/onebit-usage.js')) return { url: wrapper, shortCircuit: true };
  return next(specifier, context);
}
