export const IMAGE_INSET = 4;
export const IMAGE_GAP = 12;

// Preserve the existing single-line mouse and stacked touch caption footprints.
// Extreme source shapes keep their proportions inside a bounded presentation frame.
const MIN_ART_HEIGHT = 56;
const MIN_READABLE_HEIGHT = 140;
const MAX_ROW_GROWTH = 1.2;
const STRIP_RATIO = 12;

function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sourceRatio(image) {
  return positive(image?.w) / positive(image?.h);
}

function frameWidth(ratio, height, minimum, available) {
  return Math.min(available, Math.max(minimum, ratio * height));
}

// Each candidate is linear in image count. The suffix capacity makes balancing
// safe: a centered last row must never force an unexpectedly overflowing row.
function ordinaryRowsAt(ratios, width, target, minimum, extra) {
  const count = ratios.length;
  const widths = ratios.map(ratio => frameWidth(ratio, target, minimum, width));
  const prefix = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) prefix[i + 1] = prefix[i] + widths[i];
  const next = new Uint32Array(count);
  let end = 0, sum = 0;
  for (let start = 0; start < count; start++) {
    while (end < count && sum + widths[end] + (end - start) * IMAGE_GAP <= width + 1e-7) {
      sum += widths[end++];
    }
    next[start] = end;
    sum -= widths[start];
  }
  const suffixRows = new Uint32Array(count + 1);
  for (let i = count - 1; i >= 0; i--) suffixRows[i] = 1 + suffixRows[next[i]];
  const rows = [];
  let start = 0, remaining = suffixRows[0];
  while (start < count) {
    const ideal = (prefix[count] - prefix[start] + IMAGE_GAP * (count - start - remaining)) / remaining;
    const limit = Math.min(next[start], count - remaining + 1);
    let best = start + 1, distance = Infinity;
    for (let cut = start + 1; cut <= limit; cut++) {
      if (suffixRows[cut] > remaining - 1) continue;
      const used = prefix[cut] - prefix[start] + IMAGE_GAP * (cut - start - 1);
      const difference = Math.abs(used - ideal);
      if (difference <= distance) { best = cut; distance = difference; }
      if (used >= ideal) break;
    }
    rows.push({ start, end: best });
    start = best;
    remaining--;
  }

  let y = 0, area = 0, smallest = Infinity, readable = true;
  const tiles = [];
  for (const row of rows) {
    const length = row.end - row.start;
    const occupied = height => {
      let used = (length - 1) * IMAGE_GAP;
      for (let i = row.start; i < row.end; i++) used += frameWidth(ratios[i], height, minimum, width);
      return used;
    };
    // Every row grows by at most the same modest amount, including an orphan.
    // A width-limited lone banner must not retain the height of a portrait row.
    let high = target * MAX_ROW_GROWTH;
    if (length === 1) high = Math.min(high, Math.max(MIN_ART_HEIGHT, width / ratios[row.start]));
    let low = Math.min(MIN_ART_HEIGHT, high);
    if (occupied(high) > width) {
      for (let step = 0; step < 24; step++) {
        const middle = (low + high) / 2;
        if (occupied(middle) <= width) low = middle;
        else high = middle;
      }
      high = low;
    }
    const height = Math.max(MIN_ART_HEIGHT, Math.floor(high));
    const rowWidths = [];
    let used = (length - 1) * IMAGE_GAP;
    for (let i = row.start; i < row.end; i++) {
      const tileWidth = Math.max(1, Math.floor(frameWidth(ratios[i], height, minimum, width)));
      rowWidths.push(tileWidth);
      used += tileWidth;
      readable &&= height >= Math.max(MIN_ART_HEIGHT, Math.min(MIN_READABLE_HEIGHT, Math.floor(width / ratios[i])));
    }
    let x = Math.floor((width - used) / 2);
    for (let i = 0; i < length; i++) {
      tiles.push({ width: rowWidths[i], height, x, y });
      area += rowWidths[i] * height;
      x += rowWidths[i] + IMAGE_GAP;
    }
    smallest = Math.min(smallest, height);
    y += height + extra + IMAGE_GAP;
  }
  return { tiles, width, height: y - IMAGE_GAP, area, smallest, readable };
}

// Very wide sources are intentional strips, rather than landscape photographs.
// Keep them full-width and shallow, with normal ordered rows between them. Their
// fixed height must not lower the readability score of neighboring normal images.
function rowsAt(ratios, width, target, minimum, extra) {
  const tiles = [];
  let height = 0, area = 0, smallest = Infinity, readable = true;
  const append = fit => {
    if (tiles.length) height += IMAGE_GAP;
    for (const tile of fit.tiles) tiles.push({ ...tile, y: tile.y + height });
    height += fit.height;
    area += fit.area;
    smallest = Math.min(smallest, fit.smallest);
    readable &&= fit.readable;
  };
  for (let start = 0; start < ratios.length;) {
    if (ratios[start] >= STRIP_RATIO) {
      const artHeight = Math.max(MIN_ART_HEIGHT, Math.floor(width / ratios[start]));
      append({
        tiles: [{ width, height: artHeight, x: 0, y: 0 }],
        height: artHeight + extra,
        area: width * artHeight,
        smallest: Infinity,
        readable: true,
      });
      start++;
      continue;
    }
    let end = start + 1;
    while (end < ratios.length && ratios[end] < STRIP_RATIO) end++;
    const segment = ratios.slice(start, end).map(ratio => Math.max(.5, Math.min(4, ratio)));
    append(ordinaryRowsAt(segment, width, target, minimum, extra));
    start = end;
  }
  return { tiles, width, height, area, smallest, readable };
}

export function fitImageWall(images, availableWidth, availableHeight, noHover = false) {
  const width = Math.max(1, Math.floor(positive(availableWidth)));
  const height = Math.max(0, Math.floor(Number.isFinite(availableHeight) ? availableHeight : 0));
  const extra = noHover ? 62 : 35;
  const minimum = Math.min(width, noHover ? 164 : 180);
  const common = { stackCaptions: false, extra };
  if (!images.length) return { tiles: [], width, height: 0, scroll: false, ...common };
  if (images.length === 1) {
    const ratio = sourceRatio(images[0]);
    const artHeight = Math.max(MIN_ART_HEIGHT, Math.floor(Math.min(Math.max(MIN_ART_HEIGHT, height - extra), width / ratio)));
    const artWidth = Math.max(1, Math.floor(Math.min(width, Math.max(minimum, artHeight * ratio))));
    const contentHeight = artHeight + extra;
    return {
      tiles: [{ width: artWidth, height: artHeight, x: Math.floor((width - artWidth) / 2), y: 0 }],
      width, height: contentHeight, scroll: contentHeight > height, ...common,
    };
  }
  const ratios = images.map(sourceRatio);
  const maximum = Math.max(MIN_ART_HEIGHT, Math.min(height - extra, width * 2));
  const candidates = new Set([MIN_ART_HEIGHT, 140, 180, 200, 220, 240]);
  for (let i = 0; i <= 48; i++) candidates.add(MIN_ART_HEIGHT + (maximum - MIN_ART_HEIGHT) * i / 48);
  // Exact vertical-fit boundaries keep common square collections at the available
  // size without rounding-sized jumps between scan candidates.
  for (let rows = 1; rows <= 16; rows++) {
    const target = ((height - (rows - 1) * IMAGE_GAP) / rows - extra) / MAX_ROW_GROWTH;
    if (target >= MIN_ART_HEIGHT) candidates.add(target);
  }
  let best = null;
  for (const target of candidates) {
    if (target > maximum) continue;
    const fit = rowsAt(ratios, width, target, minimum, extra);
    if (fit.height > height || !fit.readable) continue;
    if (!best || fit.smallest > best.smallest || (fit.smallest === best.smallest && fit.area > best.area)) best = fit;
  }
  if (!best) {
    const target = Math.max(MIN_ART_HEIGHT, Math.min(noHover ? 180 : 220, height - extra));
    best = rowsAt(ratios, width, target, minimum, extra);
  }
  const { tiles, height: contentHeight } = best;
  return { tiles, width, height: contentHeight, scroll: contentHeight > height, ...common };
}
