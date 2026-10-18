import { checkCanceled, yieldTask } from './quantize.js';

const summaries = new WeakMap();
const MAX_COLORS = 4096;
const queue = [];
let running = false;

// Original and converted captions can request the same cold frame together.
// Serialize scans, then recheck the completed cache. Each subscriber owns its
// cancellation; an aborted owner never poisons a later independent request.
async function runQueue() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const entry = queue.shift();
      entry.signal?.removeEventListener('abort', entry.abort);
      try {
        checkCanceled(entry.signal);
        const summary = summaries.has(entry.original) ? summaries.get(entry.original) : await scanSummary(entry.original, { signal: entry.signal });
        checkCanceled(entry.signal);
        entry.resolve(summary);
      } catch (error) { entry.reject(error); }
    }
  } finally { running = false; }
}

// Original pixel buffers are immutable. Retain at most five bytes per distinct
// visible RGB, never a copy of the source. High-entropy sources bypass this cache
// after 4097 colors; their output still takes the exact ordinary conversion path.
export async function sourceColorSummary(original, { signal } = {}) {
  checkCanceled(signal);
  if (summaries.has(original)) return summaries.get(original);
  return new Promise((resolve, reject) => {
    const entry = { original, signal, resolve, reject };
    entry.abort = () => {
      const index = queue.indexOf(entry);
      if (index < 0) return;
      queue.splice(index, 1);
      signal.removeEventListener('abort', entry.abort);
      try { checkCanceled(signal); } catch (error) { reject(error); }
    };
    queue.push(entry);
    signal?.addEventListener('abort', entry.abort, { once: true });
    runQueue();
  });
}

async function scanSummary(original, { signal } = {}) {
  const width = original?.width ?? original?.w, height = original?.height ?? original?.h;
  const data = original?.data;
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !data || data.length !== width * height * 4) throw new Error('Invalid image dimensions or pixel data.');
  const colors = new Map();
  for (let start = 0; start < data.length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 2048 * 4, data.length);
      for (let p = start; p < end; p += 4) {
        const alpha = data[p + 3];
        if (!alpha) continue;
        const rgb = data[p] << 16 | data[p + 1] << 8 | data[p + 2];
        const previous = colors.get(rgb);
        if (previous === undefined) {
          if (colors.size === MAX_COLORS) { checkCanceled(signal); summaries.set(original, null); return null; }
          colors.set(rgb, alpha);
        } else if (alpha > previous) colors.set(rgb, alpha);
      }
      start = end;
    } while (start < data.length && performance.now() < deadline);
    if (start < data.length) await yieldTask();
  }
  checkCanceled(signal);
  const rgb = new Uint32Array(colors.size), alpha = new Uint8Array(colors.size);
  let i = 0;
  for (const [key, value] of colors) { rgb[i] = key; alpha[i++] = value; }
  const summary = Object.freeze({ rgb, alpha });
  summaries.set(original, summary);
  return summary;
}

// One representative with the highest source alpha is sufficient for exact
// nearest membership: every occurrence of one RGB chooses the same palette entry.
// Do not use this for position-dependent dithering or structural Cleanup.
export function summaryImage(summary, alphaCut = 1) {
  let count = 0;
  for (let i = 0; i < summary.rgb.length; i++) if (summary.alpha[i] >= alphaCut) count++;
  if (!count) return null;
  const data = new Uint8ClampedArray(count * 4);
  let offset = 0;
  for (let i = 0; i < summary.rgb.length; i++) {
    if (summary.alpha[i] < alphaCut) continue;
    const rgb = summary.rgb[i];
    data[offset++] = rgb >>> 16; data[offset++] = rgb >>> 8 & 255; data[offset++] = rgb & 255; data[offset++] = summary.alpha[i];
  }
  return { width: count, height: 1, data };
}
