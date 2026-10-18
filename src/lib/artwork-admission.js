// A logical source-storage budget, not a JavaScript/native/GPU heap ceiling.
export const ARTWORK_BYTES = 256 * 1024 * 1024;
export const ARTWORK_FRAME_PIXELS = 16 * 1024 * 1024;
export const ARTWORK_FRAMES = 4096;
export const ARTWORK_FRAME_BYTES = 4096;
const sourceOwners = new WeakMap();
const originalOwners = new WeakMap();

export function artworkLimit() {
  const error = new Error('This image exceeds the available artwork import limit.');
  error.code = 'ARTWORK_MEMORY_LIMIT';
  return error;
}
export function artworkCost(width, height, count = 1) {
  if (![width, height, count].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('Invalid artwork dimensions.');
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || pixels > ARTWORK_FRAME_PIXELS || count > ARTWORK_FRAMES) throw artworkLimit();
  // RGBA4 + current analysis3 + one serialized reanalysis3, plus two 2KiB
  // histogram generations. The frame cap separately bounds JS metadata count;
  // JS object sizes are not an exact part of this typed-buffer accounting.
  return pixels * count * 10 + count * ARTWORK_FRAME_BYTES;
}
export const gifDecodeHold = (pixels, encodedBytes) => pixels * 8 + 20480 + encodedBytes;

export function createArtworkAdmission(limit = ARTWORK_BYTES) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid artwork budget.');
  let used = 0, peak = 0, count = 0;
  const budget = {
    get used() { return used; }, get peak() { return peak; }, get count() { return count; }, limit,
    reserve(bytes = ARTWORK_FRAME_BYTES) {
      let amount = 0, owner = true, borrowers = 0, freed = false;
      const resize = bytes => {
        if (freed || !Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid artwork reservation.');
        const delta = bytes - amount;
        if (delta > limit - used) throw artworkLimit();
        used += delta; amount = bytes; peak = Math.max(peak, used);
      };
      const free = () => {
        if (!owner && !borrowers && !freed) { used -= amount; amount = 0; count--; freed = true; }
      };
      resize(bytes); count++;
      return {
        get bytes() { return amount; }, resize,
        release() { owner = false; free(); },
        hold() {
          if (freed) throw new Error('This artwork reservation was released.');
          borrowers++;
          let active = true;
          return () => { if (active) { active = false; borrowers--; free(); } };
        },
        scratch(bytes) { const temporary = budget.reserve(bytes); return () => temporary.release(); },
      };
    },
  };
  return budget;
}

export function attachArtworkData(data, admission) { sourceOwners.set(data, admission); }
export function holdArtworkData(data) { return sourceOwners.get(data)?.hold() ?? (() => {}); }
export function attachArtworkOriginal(original, admission) { originalOwners.set(original, admission); }
export function holdArtworkOriginal(original) { return originalOwners.get(original)?.hold() ?? (() => {}); }
export function holdArtworkItems(items) {
  const admissions = new Set(items.map(item => item.admission).filter(Boolean));
  const releases = [];
  try { for (const admission of admissions) releases.push(admission.hold()); }
  catch (error) { for (const release of releases) release(); throw error; }
  return () => { for (const release of releases) release(); };
}

// Immutable reanalysis replaces item objects while preserving IDs/ownership.
// A stale action may remove that current owner, never release an absent owner.
export function removeArtworkItem(items, id) {
  const live = items.find(item => item.id === id);
  if (!live) return items;
  live.admission?.release();
  return items.filter(item => item !== live);
}
