import { prepareFullPaletteImage } from './palette-state.js';
import { checkCanceled, quantizeAsync, yieldTask } from './quantize.js';
import { sourceColorSummary, summaryImage } from './source-color-summary.js';
import { effectiveAlphaCut } from './palette-alpha.js';
import { holdArtworkItems } from './artwork-admission.js';
import { originalArtworkItem } from './artwork-source-projection.js';

// Exact full-source inspection. Keep at most 256 output colors, never a second
// converted clip. Share export preparation so subset/Cleanup/dither decisions match.
export async function collectPaletteUsage(item, snapshot, { signal } = {}) {
  checkCanceled(signal);
  item = originalArtworkItem(item);
  const release = holdArtworkItems([item]);
  try { return await inspectPaletteUsage(item, snapshot, signal); }
  finally { release(); }
}

async function inspectPaletteUsage(item, snapshot, signal) {
  if (snapshot.family !== 'full-palette') throw new Error('Choose Palette mode to inspect output colors.');
  const { about: image, palette, original, frames, alphaCut, convert } = await prepareFullPaletteImage(item, snapshot, { signal });
  const used = new Uint8Array(256);
  let count = 0;
  const add = frame => {
    for (let i = 0; i < image.colors.length; i++) if (frame.used[i] && !used[i]) { used[i] = 1; count++; }
  };
  // Invalid opacity input must still reach conversion's existing validation,
  // including for empty sources that otherwise need no representative pixels.
  const nearest = Number.isInteger(alphaCut) && alphaCut >= 1 && alphaCut <= 255 && !image.cleanup && (image.dither === 'none' || !image.ditherStrength || palette.size < 2);
  const sources = frames ?? [{ original }];
  for (let i = 0; i < sources.length; i++) {
    checkCanceled(signal);
    const source = sources[i].original;
    const summary = nearest ? await sourceColorSummary(source, { signal }) : null;
    if (summary) {
      const small = summaryImage(summary, effectiveAlphaCut(image.alphaMode, alphaCut));
      if (small) add(await quantizeAsync(small, palette, alphaCut, undefined, undefined, { metric: image.metric, alphaMode: image.alphaMode, signal }));
    } else add(await convert(source));
    // This is a proof of the complete union, not an estimated early count:
    // later frames cannot add a color outside the already-prepared palette.
    if (count === palette.size) break;
    if (i + 1 < sources.length) await yieldTask();
  }
  checkCanceled(signal);
  const colors = Object.freeze(image.colors.filter((_, i) => used[i]));
  return Object.freeze({ colors, count: colors.length, frames: sources.length });
}
