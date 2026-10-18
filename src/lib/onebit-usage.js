import { mask } from './recolor.js';
import { analysisMatches, reanalyzeItem } from './image-reanalysis.js';
import { checkCanceled, yieldTask } from './quantize.js';

// Retain only the two role-presence bits for the latest conversion of an
// immutable analyzed frame. Masks and converted RGBA are never retained here.
const frameUsage = new WeakMap();
export const ONEBIT_INSPECTION_PIXELS = 262144;
// These styles determine each sampled pixel from that same source coordinate.
// Pattern styles and diffusion redraw their pattern at the sample dimensions.
const POINTWISE_STYLES = new Set(['cutout', 'solid', 'lines', 'stencil', 'icon', 'silhouette']);
const jobs = [];
let running = false;
const keyFor = (style, set) => JSON.stringify([style, set ?? null]);
const inks = (first, second) => [first, second].map(color => color?.toLowerCase() ?? null);

function queued(run, signal) {
  checkCanceled(signal);
  return new Promise((resolve, reject) => {
    const entry = { run, resolve, reject, signal };
    entry.abort = () => {
      const at = jobs.indexOf(entry);
      if (at < 0) return;
      jobs.splice(at, 1);
      signal.removeEventListener('abort', entry.abort);
      try { checkCanceled(signal); } catch (error) { reject(error); }
    };
    signal?.addEventListener('abort', entry.abort, { once: true });
    jobs.push(entry);
    void drain();
  });
}
async function drain() {
  if (running) return;
  running = true;
  try {
    while (jobs.length) {
      const entry = jobs.shift();
      entry.signal?.removeEventListener('abort', entry.abort);
      try {
        checkCanceled(entry.signal);
        entry.resolve(await entry.run());
      } catch (error) { entry.reject(error); }
    }
  } finally { running = false; }
}

export function maskRoles(value) {
  let roles = 0;
  for (let p = 0; p < value.length; p++) {
    if (value[p] === 1) roles |= 1;
    else if (value[p] === 2) roles |= 2;
    if (roles === 3) break;
  }
  return roles;
}

export function oneBitColors(roles, first, second) {
  const [a, b] = inks(first, second);
  const colors = [];
  if (a && (roles & 1)) colors.push(a);
  if (b && (roles & 2) && !colors.includes(b)) colors.push(b);
  return colors;
}

// The caller must supply an exact full-source mask. Sampled pattern masks are
// drawn afresh and cannot establish the colors used by the full-size output.
export function rememberOneBitMask(img, style, set, value) {
  if (value.length !== img.w * img.h) return null;
  const roles = maskRoles(value);
  frameUsage.set(img, { key: keyFor(style, set), roles, exact: true });
  return roles;
}

export function rememberOneBitSample(img, style, set, value, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width > img.w || height > img.h || value.length !== width * height) return null;
  if (width === img.w && height === img.h) return rememberOneBitMask(img, style, set, value);
  if (!POINTWISE_STYLES.has(style)) return null;
  const key = keyFor(style, set), previous = frameUsage.get(img), roles = maskRoles(value);
  if (previous?.key === key && previous.exact) return previous.roles;
  // Presence is a lower bound, not an exact count: an unsampled role may exist.
  frameUsage.set(img, { key, roles: roles | (previous?.key === key ? previous.roles : 0), exact: false });
  return roles;
}

export async function collectOneBitUsage(item, asked, { signal } = {}) {
  const captured = { first: asked.first, second: asked.second, style: asked.style, set: { ...asked.set } };
  return queued(() => inspect(item, captured, signal), signal);
}
async function inspect(item, asked, signal) {
  // Capture mutable caller fields before yielding or preparing analyses.
  const first = asked.first, second = asked.second, style = asked.style;
  const set = { ...asked.set }, key = keyFor(style, set);
  // Silhouette's threshold is 255: a visible pixel can only be role 1.
  const possible = new Set(inks(first, style === 'silhouette' ? null : second).filter(Boolean));
  const frameCount = item.frames?.length ?? 1;
  checkCanceled(signal);
  if (!possible.size) return Object.freeze({ colors: Object.freeze([]), count: 0, frames: frameCount });
  const analysisSettings = { source: set.source, alphaCut: set.alpha };
  // Count metadata must not launch a large source analysis either. The App's
  // existing analysis job can publish matching immutable frames first.
  if (item.img.w * item.img.h > ONEBIT_INSPECTION_PIXELS && !analysisMatches(item, analysisSettings)) return null;
  const read = await reanalyzeItem(item, analysisSettings, { signal });
  const frames = read.frames ?? [read];
  const used = new Set();
  let unknown = false;
  for (const frame of frames) {
    checkCanceled(signal);
    let stored = frameUsage.get(frame.img);
    if (stored?.key === key) {
      for (const color of oneBitColors(stored.roles, first, second)) used.add(color);
      if (used.size === possible.size) break;
    }
    if (stored?.key !== key || !stored.exact) {
      // Give the visible Tile a turn to publish existing rendering metadata.
      await yieldTask();
      checkCanceled(signal);
      stored = frameUsage.get(frame.img);
      if (stored?.key === key) {
        for (const color of oneBitColors(stored.roles, first, second)) used.add(color);
        if (used.size === possible.size) break;
      }
      if (stored?.key !== key || !stored.exact) {
        if (frame.img.w * frame.img.h > ONEBIT_INSPECTION_PIXELS) {
          unknown = true;
          continue;
        }
        const value = mask(frame.img, style, set);
        stored = { key, roles: rememberOneBitMask(frame.img, style, set, value) };
      }
    }
    for (const color of oneBitColors(stored.roles, first, second)) used.add(color);
    if (used.size === possible.size) break;
  }
  checkCanceled(signal);
  if (unknown && used.size !== possible.size) return null;
  const colors = Object.freeze([...possible].filter(color => used.has(color)));
  return Object.freeze({ colors, count: colors.length, frames: frameCount });
}
