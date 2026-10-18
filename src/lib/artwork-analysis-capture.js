import { createArtworkAdmission, ARTWORK_FRAME_PIXELS, ARTWORK_FRAMES } from './artwork-admission.js';

// Older immutable analyses can remain captured while the live wall replaces its
// current/replacement pair. Bound those borrowers separately from source storage.
export const CAPTURED_ANALYSIS_BYTES = 128 * 1024 * 1024;
export const capturedAnalysisAdmission = createArtworkAdmission(CAPTURED_ANALYSIS_BYTES);

export function capturedAnalysisCost(frames, extraGenerations = 0) {
  if (!Array.isArray(frames) || !frames.length || frames.length > ARTWORK_FRAMES
    || !Number.isSafeInteger(extraGenerations) || extraGenerations < 0)
    throw new Error('Invalid captured artwork analyses.');
  let bytes = 0;
  const seen = new Set();
  for (const frame of frames) {
    const width = frame.original?.width, height = frame.original?.height;
    if (![width, height].every(value => Number.isSafeInteger(value) && value > 0)
      || !Number.isSafeInteger(width * height) || width * height > ARTWORK_FRAME_PIXELS)
      throw new Error('Invalid captured artwork dimensions.');
    // Repeated frame wrappers may share the same immutable analysis. Only that
    // exact identity can be deduplicated, never merely equal dimensions/content.
    const cost = width * height * 3 + 2048;
    if (!frame.img || !seen.has(frame.img)) bytes += cost;
    if (frame.img) seen.add(frame.img);
    // Replacements are independently allocated for every frame, even when two
    // input wrappers happened to share an existing analysis.
    bytes += cost * extraGenerations;
  }
  if (!Number.isSafeInteger(bytes)) throw new Error('Invalid captured artwork cost.');
  return bytes;
}

export function holdArtworkAnalyses(frames, { extraGenerations = 0, budget = capturedAnalysisAdmission } = {}) {
  const reservation = budget.reserve(capturedAnalysisCost(frames, extraGenerations));
  let active = true;
  return () => { if (active) { active = false; reservation.release(); } };
}
