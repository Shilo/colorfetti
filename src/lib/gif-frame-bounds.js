// GIF disposal 2 clears only the preceding frame's rectangle. Each supplied
// frame is already a complete composited output, so omitting its transparent
// margins is safe; comparing against earlier frames would need different rules.
// Inspect row edges only: dense interiors need not be revisited. The worst case
// is O(w*h), with one cropped buffer no larger than input.
export function gifFrameBounds(indices, w, h, transparent, maxArea = w * h) {
  if (!(indices instanceof Uint8Array) || !Number.isInteger(w) || w < 1 || w > 65535
    || !Number.isInteger(h) || h < 1 || h > 65535 || indices.length !== w * h
    || transparent !== null && (!Number.isInteger(transparent) || transparent < 0 || transparent > 255)
    || !Number.isInteger(maxArea) || maxArea < 1 || maxArea > w * h)
    throw new Error('Invalid GIF frame bounds.');
  const full = { x: 0, y: 0, w, h, indices };
  if (transparent === null) return full;
  let left = w, right = -1, top = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let x = 0;
    while (x < w && indices[row + x] === transparent) x++;
    if (x === w) continue;
    if (top < 0) top = y;
    bottom = y;
    if (x < left) left = x;
    x = w - 1;
    while (indices[row + x] === transparent) x--;
    if (x > right) right = x;
  }
  if (top < 0) return w * h === 1 ? full : { x: 0, y: 0, w: 1, h: 1, indices: Uint8Array.of(transparent) };
  const width = right - left + 1, height = bottom - top + 1;
  if (width === w && height === h || width * height > maxArea) return full;
  const cropped = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const start = (top + y) * w + left;
    cropped.set(indices.subarray(start, start + width), y * width);
  }
  return { x: left, y: top, w: width, h: height, indices: cropped };
}
