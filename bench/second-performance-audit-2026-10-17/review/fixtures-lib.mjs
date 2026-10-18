// Raw fixture loader plus deterministic edge cases shared by the review benches.
import { readFileSync } from 'node:fs';
import path from 'node:path';
const raw = path.resolve(import.meta.dirname, '../../../.tmp/second-audit-2026-10-17/review/raw');
export const index = JSON.parse(readFileSync(path.join(raw, 'index.json'), 'utf8'));
export const load = file => {
  const { width, height } = index.find(e => e.file === file);
  return { width, height, data: new Uint8ClampedArray(readFileSync(path.join(raw, file + '.rgba'))) };
};
export function edgeCases() {
  let s = 7;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const make = (w, h, f) => { const data = new Uint8ClampedArray(w * h * 4); for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) data.set(f(x, y), i); return { width: w, height: h, data }; };
  const out = {
    transparent: make(9, 7, () => [10, 20, 30, 0]),
    px1: make(1, 1, () => [200, 30, 40, 255]),
    px1clear: make(1, 1, () => [200, 30, 40, 0]),
    single: make(13, 11, () => [90, 90, 200, 255]),
    singleSprite: make(17, 15, (x, y) => (Math.hypot(x - 8, y - 7) < 6 ? [90, 90, 200, 255] : [0, 0, 0, 0])),
    odd: make(37, 23, (x, y) => [(x * 37) & 255, (y * 91) & 255, (x * y) & 255, (x + y) % 5 ? 255 : 0]),
    row: make(41, 1, x => [x * 6, 0, 0, x % 4 ? 255 : 0]),
    col: make(1, 41, (x, y) => [0, y * 6, 0, y % 4 ? 255 : 0]),
    partial: make(31, 29, (x, y) => [x * 8, y * 8, 128, Math.min(255, Math.hypot(x - 15, y - 14) * 20) | 0]),
  };
  // Many random small sprites with outlines, cavities, seams and 64x64-boundary components.
  for (let n = 0; n < 60; n++) {
    const w = 4 + Math.floor(rnd() * 90), h = 4 + Math.floor(rnd() * 90), levels = [2, 3, 4, 8, 256][n % 5], k = n % 4;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * (0.3 + rnd() * 0.25);
    out['rand' + n] = make(w, h, (x, y) => {
      const d = Math.hypot(x - cx, y - cy), q = v => Math.floor(Math.floor(v * levels * 0.999) * (255 / (levels - 1 || 1)));
      const base = k === 0 ? rnd() : k === 1 ? ((x >> 2) + (y >> 2)) % 3 / 2 : k === 2 ? (d > r - 1.5 ? 0.02 : 0.7 + (((x * 3 + y) % 7) === 0 ? -0.6 : 0)) : (Math.sin(x / 3) * Math.cos(y / 4) + 1) / 2;
      const a = n % 3 === 0 ? (d < r ? 255 : 0) : n % 3 === 1 ? (rnd() < 0.15 ? 0 : 255) : (d < r ? 255 : rnd() * 160);
      return [q(base), q(rnd() < 0.2 ? rnd() : base), q(base * 0.8), a | 0];
    });
  }
  return out;
}
