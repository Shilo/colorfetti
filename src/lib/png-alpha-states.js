// Inputs must already have passed palette-index and complete alpha validation.
// Visible keys use index*256+alpha; the empty sentinel has its own extra slot.
// Retain at most256 states, without allocating another per-pixel index buffer.
// Even one RGB/alpha entry costs 104 bytes before any DEFLATE payload.
export const MINIMUM_ALPHA_PNG_BYTES = 104;
export function createAlphaStates(rgb) {
  return { rgb, map: new Uint16Array(65537), table: new Uint32Array(256),
    alpha: new Uint8Array(256), count: 0, overflow: false };
}
export function addAlphaStates(indices, alpha, states, start, end) {
  if (states.overflow) return;
  for (let p = start; p < end; p++) {
    const index = indices[p], key = index === 256 ? 65536 : index * 256 + alpha[p];
    if (states.map[key]) continue;
    if (states.count === 256) { states.overflow = true; return; }
    const slot = states.count++;
    states.map[key] = slot + 1; // zero means absent; slot255 therefore stores256
    states.table[slot] = index === 256 ? 0 : states.rgb[index];
    states.alpha[slot] = index === 256 ? 0 : alpha[p];
  }
}
export function alphaTableLength(states) {
  let count = states.count;
  while (count && states.alpha[count - 1] === 255) count--;
  return count;
}
// Includes all fixed PNG chunks and just the six-byte zlib header/checksum.
// Real DEFLATE data adds bytes, so this deliberately underestimates cost.
export const minimumAlphaPngBytes = states => 100 + states.count * 3 + alphaTableLength(states);
