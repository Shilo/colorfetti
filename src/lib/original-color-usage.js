import { checkCanceled, yieldTask } from './quantize.js';
import { sourceColorSummary } from './source-color-summary.js';
import { holdArtworkItems } from './artwork-admission.js';

const sources = new WeakMap();
const SMALL_UNION = 4096;
const RGB_COUNT = 1 << 24;
let queue = Promise.resolve();

// Analysis wrappers can change without changing the immutable original pixels.
// Weak frame keys retain neither removed originals nor their source buffers.
function captured(item) {
  const originals = item.frames?.length ? item.frames.map(frame => frame.original) : [item.original];
  let map = sources, node;
  for (const original of originals) {
    if (!original || typeof original !== 'object') throw new Error('Original image pixels are unavailable.');
    node = map.get(original);
    if (!node) { node = { next: new WeakMap() }; map.set(original, node); }
    map = node.next;
  }
  return { originals, node };
}

export function peekOriginalUsage(item) {
  return captured(item).node.result ?? null;
}

async function scan(originals, signal) {
  let small = new Set(), bits, count = 0;
  const add = rgb => {
    if (!bits) {
      small.add(rgb);
      if (small.size <= SMALL_UNION) { count = small.size; return; }
      // Exactly one bit per RGB bounds transient high-entropy counting at 2 MiB.
      bits = new Uint8Array(RGB_COUNT / 8);
      for (const value of small) bits[value >>> 3] |= 1 << (value & 7);
      count = small.size; small = null;
      return;
    }
    const at = rgb >>> 3, mask = 1 << (rgb & 7);
    if (!(bits[at] & mask)) { bits[at] |= mask; count++; }
  };
  for (const original of originals) {
    checkCanceled(signal);
    const summary = await sourceColorSummary(original, { signal });
    if (summary) {
      for (const rgb of summary.rgb) add(rgb);
    } else {
      const data = original.data;
      for (let start = 0; start < data.length;) {
        const deadline = performance.now() + 8;
        do {
          checkCanceled(signal);
          const end = Math.min(start + 8192 * 4, data.length);
          for (let p = start; p < end; p += 4) if (data[p + 3]) add(data[p] << 16 | data[p + 1] << 8 | data[p + 2]);
          start = end;
        } while (start < data.length && performance.now() < deadline);
        if (start < data.length) await yieldTask();
      }
    }
    if (count === RGB_COUNT) break;
    await yieldTask();
  }
  checkCanceled(signal);
  return Object.freeze({ count, frames: originals.length });
}

// One serial, shared job per immutable clip. A disappearing comparison may cancel
// its subscription without canceling another surface that still needs the count.
export function collectOriginalUsage(item, { signal } = {}) {
  try { checkCanceled(signal); } catch (error) { return Promise.reject(error); }
  let originals, node;
  try { ({ originals, node } = captured(item)); } catch (error) { return Promise.reject(error); }
  if (node.result) return Promise.resolve(node.result);
  let job = node.pending;
  if (!job || job.controller.signal.aborted) {
    try { job = { controller: new AbortController(), subscribers: 0, releaseSources: holdArtworkItems([item]) }; }
    catch (error) { return Promise.reject(error); }
    node.pending = job;
    const run = queue.then(async () => {
      await yieldTask();
      checkCanceled(job.controller.signal);
      const result = await scan(originals, job.controller.signal);
      if (node.pending === job) node.result = result;
      return result;
    });
    job.promise = run.finally(() => { if (node.pending === job) node.pending = null; job.releaseSources(); });
    queue = job.promise.catch(() => {});
  }
  job.subscribers++;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true; signal?.removeEventListener('abort', abort);
      if (--job.subscribers === 0) job.controller.abort();
      fn(value);
    };
    const abort = () => {
      try { checkCanceled(signal); } catch (error) { finish(reject, error); }
    };
    signal?.addEventListener('abort', abort, { once: true });
    job.promise.then(value => finish(resolve, value), error => finish(reject, error));
    if (signal?.aborted) abort();
  });
}
