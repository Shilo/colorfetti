import { mask, colorize } from './recolor.js';
import { quantizeAsync, colorize as palettePixels, checkCanceled, yieldTask } from './quantize.js';
import { nativeInspectionAllowed } from './viewer-inspection-policy.js';

// One active and one latest pending job, rather than an unbounded chain of frame
// requests. Cancellation cannot interrupt a synchronous legacy mask, but it
// prevents its publication and the next allocation waits for that call to finish.
export function nativeInspectionQueue() {
  let active = false, pending;
  const canceled = () => new DOMException('The inspection was canceled.', 'AbortError');
  function start() {
    if (active || !pending) return;
    const job = pending; pending = null; active = true;
    Promise.resolve().then(yieldTask).then(() => { checkCanceled(job.signal); return job.run(); })
      .then(value => { checkCanceled(job.signal); job.resolve(value); }, job.reject)
      .catch(job.reject).finally(() => { job.detach(); active = false; start(); });
  }
  return {
    run(run, { signal } = {}) {
      if (signal?.aborted) return Promise.reject(canceled());
      if (pending) { pending.detach(); pending.reject(canceled()); pending = null; }
      return new Promise((resolve, reject) => {
        const job = { run, signal, resolve, reject };
        const cancel = () => { if (pending === job) { pending = null; job.detach(); reject(canceled()); } };
        job.detach = () => signal?.removeEventListener('abort', cancel);
        signal?.addEventListener('abort', cancel, { once: true });
        pending = job; start();
      });
    },
  };
}

// Closing a dialog cannot make its still-settling work disappear. All viewer
// instances share the same barrier and the same logical inspection headroom.
export const sharedNativeInspectionQueue = nativeInspectionQueue();

// The caller supplies the already selected whole-item palette/subset and frozen
// whole-clip Cleanup. No preparation ever runs on a cropped or one-frame item.
export async function renderNativeFrame(frame, { family, palette, alphaCut, alphaMode, metric, dither, ditherStrength, cleanup, first, second, style, set }, { signal } = {}) {
  const { width, height } = frame.original;
  if (!nativeInspectionAllowed(width, height)) throw new Error('Native inspection supports frames up to 4 megapixels and 16384 pixels per side.');
  checkCanceled(signal);
  if (family === 'full-palette') {
    const result = await quantizeAsync(frame.original, palette, alphaCut, width, height, { signal, alphaMode, metric, dither, ditherStrength });
    if (cleanup) cleanup.apply(result, cleanup.result);
    checkCanceled(signal);
    return palettePixels(result, palette);
  }
  // Keep the original full analysis, histogram and unified thresholds, but do not
  // populate source-owned structural caches on every frame visited by inspection.
  const analysis = { ...frame.img, icons: { ...frame.img.icons } };
  const result = mask(analysis, style, set, width, height);
  checkCanceled(signal);
  return { data: colorize(result, first, second), width, height };
}
