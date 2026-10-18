import { checkCanceled } from './quantize.js';

// A tagged 4x2 sRGB PNG, with distinct rows, midtones and alpha 0/1/2/64/127/
// 128/254/255. A real Blob decode verifies both alpha handling and default color
// management; untagged/ImageData controls would miss some display-profile paths.
const probePng = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAAXNSR0IArs4c6QAAACtJREFUeJxjYGBgYJDVDmZ8nm3JZD/9tgPDDv/+esvT+Q0X+1X/RTuv/Q8ApAgM8OpaeQIAAAAASUVORK5CYII=';
const probeRgba = Uint8Array.of(0, 0, 0, 0, 29, 43, 83, 1, 231, 107, 57, 2, 63, 151, 219, 64,
  184, 79, 143, 127, 57, 203, 111, 128, 209, 143, 37, 254, 91, 67, 173, 255);
const bitmapOptions = { premultiplyAlpha: 'none', colorSpaceConversion: 'default' };

async function copyBitmap(source, signal, checkDimensions) {
  let bitmap, frame, closed = false;
  const closeFrame = () => { if (frame && !closed) { closed = true; frame.close(); } };
  try {
    checkCanceled(signal);
    bitmap = await createImageBitmap(source, bitmapOptions);
    checkCanceled(signal);
    const { width, height } = bitmap;
    checkDimensions(width, height);
    frame = new VideoFrame(bitmap, { timestamp: 0 });
    signal?.addEventListener('abort', closeFrame, { once: true });
    if (frame.displayWidth !== width || frame.displayHeight !== height ||
      frame.visibleRect?.width !== width || frame.visibleRect?.height !== height ||
      (frame.rotation ?? 0) !== 0 || (frame.flip ?? false)) throw new Error('Unsupported bitmap frame presentation.');
    const pixels = new Uint8ClampedArray(width * height * 4);
    const planes = await frame.copyTo(pixels, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: width * 4 }] });
    checkCanceled(signal);
    if (planes?.length !== 1 || planes[0].offset !== 0 || planes[0].stride !== width * 4)
      throw new Error('Unsupported bitmap frame layout.');
    return { pixels, width, height };
  } finally {
    signal?.removeEventListener('abort', closeFrame);
    closeFrame();
    bitmap?.close();
  }
}

// Only used when the primary native still decoder cannot supply suitable pixels.
// Firefox's Blob ImageBitmap can avoid premultiplication that its ImageDecoder
// currently performs. Copy through VideoFrame without painting/readback. Verify
// this behavior per request: no UA assumption, shared probe cache or cached pixels.
export async function decodeStraightBitmap(file, { signal, checkDimensions }) {
  checkCanceled(signal);
  if (typeof VideoFrame !== 'function' || typeof createImageBitmap !== 'function') return null;
  const encoded = Uint8Array.from(atob(probePng), byte => byte.charCodeAt(0));
  const probe = await copyBitmap(new Blob([encoded], { type: 'image/png' }), signal, (width, height) => {
    if (width !== 4 || height !== 2) throw new Error('Unsupported bitmap probe dimensions.');
  });
  for (let p = 0; p < probeRgba.length; p += 4) {
    if (probe.pixels[p + 3] !== probeRgba[p + 3]) return null;
    if (probeRgba[p + 3] && (probe.pixels[p] !== probeRgba[p] ||
      probe.pixels[p + 1] !== probeRgba[p + 1] || probe.pixels[p + 2] !== probeRgba[p + 2])) return null;
  }
  checkCanceled(signal);
  const { pixels, width, height } = await copyBitmap(file, signal, checkDimensions);
  return new ImageData(pixels, width, height);
}
