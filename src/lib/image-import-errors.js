// Keep only a few safe labels, never decoder exception text or signed URLs.
const EXAMPLES = 3, NAME_LENGTH = 48;
const limits = new Set(['IMAGE_PIXEL_LIMIT', 'IMAGE_SIZE_LIMIT', 'GIF_PIXEL_LIMIT']);

export const importFailureDuration = text => Math.max(9000, Math.min(30000, text.length * 75));

function label(source) {
  let name = typeof source === 'string' ? source : source?.name;
  if (typeof name !== 'string' || !name) return 'Unnamed image';
  if (/^https?:\/\//i.test(name)) {
    try { name = new URL(name).pathname.split('/').pop(); }
    catch { return 'Dropped image'; }
    try { name = decodeURIComponent(name); } catch { /* Keep the path segment, never the query. */ }
  }
  name = (name || '').split(/[\\/]/).pop()
    .replace(/[\u0000-\u001f\u007f-\u009f\p{Bidi_Control}]/gu, '')
    .replace(/[“”]/g, '"').trim();
  let short = '', count = 0;
  for (const point of name) {
    if (count++ === NAME_LENGTH) return short + '…';
    short += point;
  }
  return short || 'Unnamed image';
}

function reason(error, download) {
  if (download) return error?.name === 'TimeoutError'
    ? 'download timed out; save the image and add the file'
    : 'download failed; save the image and add the file';
  if (error?.code === 'ARTWORK_MEMORY_LIMIT') return 'not enough artwork memory; remove images or try a smaller image or shorter animation';
  if (limits.has(error?.code)) return 'image exceeds the import limit; try a smaller image or shorter animation';
  if (error?.code === 'GIF_INVALID') return 'invalid GIF data; open and re-export the file';
  if (error?.code === 'IMAGE_UNSUPPORTED' || error?.name === 'NotSupportedError')
    return 'unsupported image format; export as PNG or GIF';
  return 'could not decode; open and re-export the file';
}

export function importFailures() {
  let count = 0;
  const examples = [];
  return {
    add(source, error, { download = false } = {}) {
      if (error?.name === 'AbortError') return;
      count++;
      if (examples.length < EXAMPLES) examples.push(`“${label(source)}”: ${reason(error, download)}.`);
    },
    message() {
      if (!count) return '';
      const remaining = count - examples.length;
      return `${count} file${count === 1 ? '' : 's'} skipped. ${examples.join(' ')}${remaining ? ` ${remaining} more failed.` : ''}`;
    },
  };
}
