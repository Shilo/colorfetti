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

// Original pixel buffers are immutable. Retain at most nine bytes per distinct
// visible RGB (max alpha and pixel count), never a copy of the source. High-entropy
// sources bypass this cache after 4097 colors; their output still takes the exact
// ordinary conversion path.
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
  const colors = new Map(), alpha = new Uint8Array(MAX_COLORS), counts = new Uint32Array(MAX_COLORS);
  let partial = false, last = -1, i = 0;
  for (let start = 0; start < data.length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 2048 * 4, data.length);
      for (let p = start; p < end; p += 4) {
        const a = data[p + 3];
        if (!a) continue;
        if (a !== 255) partial = true;
        const rgb = data[p] << 16 | data[p + 1] << 8 | data[p + 2];
        if (rgb !== last) {
          i = colors.get(rgb);
          if (i === undefined) {
            if (colors.size === MAX_COLORS) { checkCanceled(signal); summaries.set(original, null); return null; }
            i = colors.size; colors.set(rgb, i);
          }
          last = rgb;
        }
        counts[i]++;
        if (a > alpha[i]) alpha[i] = a;
      }
      start = end;
    } while (start < data.length && performance.now() < deadline);
    if (start < data.length) await yieldTask();
  }
  checkCanceled(signal);
  const summary = Object.freeze({ rgb: Uint32Array.from(colors.keys()), alpha: alpha.slice(0, colors.size), counts: counts.slice(0, colors.size), partial });
  summaries.set(original, summary);
  return summary;
}

// Exact weighted RGB histogram of one clip ({ original, weight } frames) for the
// limiter and Auto, built only from already completed summaries; never waits for
// the summary queue. Without partial alpha every visible pixel passes any Opacity
// cut, and integer counts make the totals order-independent. Returns null, and the
// caller streams pixels, unless the union fits 4096 colors with exact totals.
// ponytail: synchronous and capped at 65536 summary entries (about a millisecond);
// longer high-color clips stream. Merge cooperatively if they matter.
export function summaryHistogram(frames) {
  const index = new Map(), weights = new Float64Array(MAX_COLORS);
  let total = 0, entries = 0;
  for (const { original, weight } of frames) {
    const summary = summaries.get(original);
    if (!summary || summary.partial || !Number.isSafeInteger(weight) || weight < 1 || (entries += summary.rgb.length) > 65536) return null;
    for (let i = 0; i < summary.rgb.length; i++) {
      const rgb = summary.rgb[i], value = summary.counts[i] * weight;
      let at = index.get(rgb);
      if (at === undefined) { if (index.size === MAX_COLORS) return null; at = index.size; index.set(rgb, at); }
      weights[at] += value; total += value;
    }
  }
  if (!Number.isSafeInteger(total)) return null;
  // Same element kind as decoded sources keeps the workers' pixel loops monomorphic.
  const data = new Uint8ClampedArray(index.size * 4);
  for (const [rgb, at] of index) { data[at * 4] = rgb >>> 16; data[at * 4 + 1] = rgb >>> 8 & 255; data[at * 4 + 2] = rgb & 255; data[at * 4 + 3] = 255; }
  return { data, weights: weights.slice(0, index.size), weight: 1 };
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
