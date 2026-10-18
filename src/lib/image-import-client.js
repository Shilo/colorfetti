import { decodeImageFile } from './image-decode.js';
import { checkCanceled } from './quantize.js';
import { analyzeImportFrames, validateImportSettings, validateImportPixels, validateImportFrame } from './image-import-core.js';
import { createArtworkAdmission, artworkCost, gifDecodeHold, attachArtworkData, attachArtworkOriginal } from './artwork-admission.js';
import { preflightArtworkGifAsync } from './artwork-gif-preflight.js';

const queue = [], owned = new WeakMap();
const admission = createArtworkAdmission();
// Tiny stills avoid worker round trips; posted-task-separated analysis keeps
// batches cooperative. GIFs and larger sources always use the worker when available.
const SMALL_STILL_PIXELS = 4096;
const isGif = file => file.type === 'image/gif' || /\.gif$/i.test(file.name || '');
let worker, running = false;
const abortError = () => new DOMException('The image import was canceled.', 'AbortError');
function makeWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try { return worker = new Worker(new URL('./image-import-worker.js', import.meta.url), { type: 'module' }); }
  catch { return null; }
}
function framesPayload(decoded) {
  return decoded.frames.map(frame => {
    validateImportPixels(frame.original);
    return { original: { width: frame.original.width, height: frame.original.height,
      data: frame.original.data }, delay: frame.delay };
  });
}
function runWorker(job, target) {
  return new Promise((resolve, reject) => {
    let meta, frames = [], settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true;
      target.onmessage = target.onerror = target.onmessageerror = null;
      job.controller.signal.removeEventListener('abort', cancel);
      if (error) frames.length = 0;
      error ? reject(error) : resolve(result);
    };
    const fail = error => { if (settled) return; target.terminate(); if (worker === target) worker = null; finish(error); };
    const cancel = () => fail(abortError());
    target.onerror = () => fail(new Error('Image import worker failed.'));
    target.onmessageerror = () => fail(job.controller.signal.aborted ? abortError() : new Error('Image import worker response could not be read.'));
    target.onmessage = ({ data }) => {
      if (settled) return;
      try {
        checkCanceled(job.controller.signal);
        if (data.type === 'error') {
          const problem = new Error(data.message || 'Image import worker failed.');
          if (['GIF_INVALID', 'ARTWORK_MEMORY_LIMIT'].includes(data.code)) problem.code = data.code;
          throw problem;
        }
        if (data.type === 'ready') {
          if (meta || !Number.isSafeInteger(data.count) || data.count < 1
            || data.count > (job.input?.frames.length ?? Math.max(1, job.file.size))
            || !Number.isSafeInteger(data.width) || data.width < 1 || !Number.isSafeInteger(data.height) || data.height < 1
            || !Number.isSafeInteger(data.width * data.height * 4)
            || data.loop !== undefined && data.loop !== null && (!Number.isInteger(data.loop) || data.loop < 0 || data.loop > 65535))
            throw new Error('Invalid imported image metadata.');
          if (job.expected && (data.count !== job.expected.count || data.width !== job.expected.width
            || data.height !== job.expected.height || Object.hasOwn(job.expected, 'loop') && data.loop !== job.expected.loop))
            throw new Error('Imported image metadata changed.');
          meta = data;
          target.postMessage({ type: 'next', index: 0 });
          return;
        }
        if (data.type === 'frame') {
          if (!meta || frames.length >= meta.count) throw new Error('Unexpected imported frame.');
          const frame = validateImportFrame(data, frames.length, meta.width, meta.height);
          if (frame.analysis.cut !== job.alphaCut) throw new Error('Imported analysis settings changed.');
          const original = new ImageData(frame.pixels, meta.width, meta.height);
          frames.push({ original, img: { ...frame.analysis, data: original.data }, delay: frame.delay });
          target.postMessage({ type: 'next', index: frames.length });
          return;
        }
        if (data.type !== 'done' || !meta || frames.length !== meta.count) throw new Error('Incomplete imported image.');
        finish(null, { frames, loop: meta.loop, analysisSource: job.source, analysisCut: job.alphaCut });
      } catch (error) { fail(error); }
    };
    job.controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      checkCanceled(job.controller.signal);
      const data = { type: 'start', source: job.source, alphaCut: job.alphaCut };
      if (!job.input) {
        const bytes = job.bytes; job.bytes = null;
        target.postMessage({ ...data, mode: 'gif', bytes, file: job.file }, [bytes.buffer]);
      }
      else {
        const frames = framesPayload(job.input);
        job.expected = { count: frames.length, width: frames[0].original.width,
          height: frames[0].original.height, loop: job.input.loop };
        const buffers = frames.map(frame => frame.original.data.buffer);
        if (new Set(buffers).size !== buffers.length) throw new Error('Imported source frames must own their pixels.');
        target.postMessage({ ...data, mode: 'frames', frames, loop: job.input.loop }, buffers);
        job.input = null; // Only unpublished import pixels are transferred. Retain the File for recovery.
      }
    } catch (error) { fail(error); }
  });
}
async function prepareGif(job) {
  checkCanceled(job.controller.signal);
  // The immutable File remains the recovery source. Account for its encoded
  // byte array before reading, then transfer that one array to the worker.
  const encoded = job.file.size;
  job.reservation.resize((job.retained ?? 4096) + encoded);
  const bytes = new Uint8Array(await job.file.arrayBuffer());
  checkCanceled(job.controller.signal);
  if (bytes.length !== encoded) throw new Error('The imported file size changed.');
  const metadata = await preflightArtworkGifAsync(bytes, job.controller.signal);
  job.retained = metadata.retained;
  job.reservation.resize(metadata.retained + gifDecodeHold(metadata.width * metadata.height, encoded));
  job.expected = { count: metadata.count, width: metadata.width, height: metadata.height };
  job.bytes = bytes;
}
async function browserDecode(job) {
  const { file, controller: { signal } } = job;
  if (isGif(file)) {
    // Native bitmap/canvas recovery can add RGB shades under Brave Shields.
    // Recover worker failures through the same exact decoder, or report failure.
    try {
      const { decodeGifAsync } = await import('./gif.js');
      checkCanceled(signal);
      if (!job.bytes?.byteLength) await prepareGif(job);
      // prepareGif already validated these exact immutable bytes and reserved
      // their expansion. Do not repeat the framing scan in this same realm.
      const gif = await decodeGifAsync(job.bytes, { signal });
      job.bytes = null;
      const animated = gif.frames.length > 1;
      return { frames: gif.frames.map(frame => ({ original: new ImageData(frame.data, gif.width, gif.height),
        ...(animated ? { delay: frame.delay } : {}) })), ...(animated ? { loop: gif.loop } : {}) };
    } catch (problem) { checkCanceled(signal); throw problem; }
  }
  return { frames: [{ original: await decodeImageFile(file, { signal, admit: (width, height) => {
    const retained = artworkCost(width, height);
    job.reservation.resize(retained); job.retained = retained;
  } }) }] };
}
async function fallback(job) {
  checkCanceled(job.controller.signal);
  const decoded = job.input?.frames.every(frame => frame.original.data.length === frame.original.width * frame.original.height * 4)
    ? job.input : await browserDecode(job);
  return analyzeImportFrames(decoded, job.source, job.alphaCut, { signal: job.controller.signal });
}
async function drain() {
  if (running) return; running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        checkCanceled(job.controller.signal);
        if (!job.input) {
          if (isGif(job.file)) await prepareGif(job);
          else job.input = await browserDecode(job);
        }
        checkCanceled(job.controller.signal);
        const smallStill = !isGif(job.file) && job.input?.frames.length === 1
          && validateImportPixels(job.input.frames[0].original) <= SMALL_STILL_PIXELS;
        const target = smallStill ? null : makeWorker();
        let result;
        if (target) {
          try {
            result = await runWorker(job, target);
          }
          catch (problem) {
            checkCanceled(job.controller.signal);
            if (['GIF_INVALID', 'ARTWORK_MEMORY_LIMIT'].includes(problem.code)) throw problem;
            if (job.input) job.input.frames.length = 0;
            job.input = null; // Recover from the immutable File, including invalid/aliased or partially transferred inputs.
            result = await fallback(job);
          }
        } else result = await fallback(job);
        checkCanceled(job.controller.signal);
        const record = { file: job.file, reservation: job.reservation, retained: job.retained };
        // An unpublished completed result still belongs to its batch. Abort
        // clears its sources before returning the reservation to the ledger.
        const discard = () => releaseImported(result);
        job.signal?.addEventListener('abort', discard, { once: true });
        record.removeAbort = () => job.signal?.removeEventListener('abort', discard);
        owned.set(result, record);
        job.resolve(result);
      } catch (error) { if (job.input) job.input.frames.length = 0; job.reservation.release(); job.reject(job.controller.signal.aborted ? abortError() : error); }
      finally { job.removeAbort?.(); job.file = job.input = job.expected = job.bytes = null; }
    }
  } finally { running = false; }
}
function enqueue(file, input, source, alphaCut, signal, record, budget = admission) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  const job = { file, input, source, alphaCut, signal, controller: new AbortController(),
    reservation: record?.reservation ?? budget.reserve(), retained: record?.retained };
  const result = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
  const cancel = () => {
    job.controller.abort();
    const index = queue.indexOf(job);
    if (index >= 0) {
      queue.splice(index, 1); if (job.input) job.input.frames.length = 0;
      job.file = job.input = job.bytes = null; job.reservation.release();
      job.removeAbort?.(); job.reject(abortError());
    }
  };
  signal?.addEventListener('abort', cancel, { once: true });
  job.removeAbort = () => signal?.removeEventListener('abort', cancel);
  queue.push(job); void drain();
  return result;
}

export async function decodeImportedFile(file, { source = 'luma', alphaCut = 128, signal, budget } = {}) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  return enqueue(file, null, source, alphaCut, signal, null, budget);
}

// Reanalysis is allowed only before publication. Never transfer live wall buffers.
export function reanalyzeImported(decoded, { source = 'luma', alphaCut = 128, signal } = {}) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  if (!owned.has(decoded)) throw new Error('Only unpublished imports can be prepared.');
  const record = owned.get(decoded); owned.delete(decoded); record.removeAbort();
  for (const frame of decoded.frames) delete frame.img; // Unpublished analysis is obsolete; keep only recoverable originals.
  return enqueue(record.file, decoded, source, alphaCut, signal, record);
}
export function takeImportedFrames(decoded) {
  if (!owned.has(decoded)) throw new Error('Only unpublished imports can be published.');
  const record = owned.get(decoded); owned.delete(decoded); record.removeAbort();
  record.reservation.resize(record.retained);
  for (const frame of decoded.frames) {
    attachArtworkData(frame.original.data, record.reservation);
    attachArtworkOriginal(frame.original, record.reservation);
  }
  return { ...decoded, admission: record.reservation };
}
export function releaseImported(decoded) {
  const record = owned.get(decoded);
  if (!record) return;
  owned.delete(decoded); record.removeAbort(); decoded.frames.length = 0; record.reservation.release();
}
