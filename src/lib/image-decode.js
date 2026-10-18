import { checkCanceled, yieldTask } from './quantize.js';

class PixelLimitError extends Error {}

const nativeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp' };
const nativeMimes = new Set(Object.values(nativeTypes));
function nativeCandidates(file) {
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const mime = nativeMimes.has(file.type) ? file.type : null;
  const named = Object.hasOwn(nativeTypes, extension) ? nativeTypes[extension] : null;
  return [...new Set([mime, named].filter(Boolean))];
}

function nativeSrgb(frame) {
  const space = frame.colorSpace;
  return (frame.format === 'RGBA' || frame.format === 'BGRA') && space?.fullRange === true &&
    space.matrix === 'rgb' && space.primaries === 'bt709' && space.transfer === 'iec61966-2-1';
}

// Firefox reports an all-null color space for premultiplied BGRA frames, and
// neither copy path unpremultiplies them. A verified straight-bitmap copy below
// avoids that lossy decode before the legacy canvas fallback is considered.
const unknownSpace = frame => ['primaries', 'transfer', 'matrix', 'fullRange'].every(key => frame.colorSpace?.[key] == null);

async function swapRedBlue(pixels, signal) {
  for (let start = 0; start < pixels.length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 131072, pixels.length);
      for (let p = start; p < end; p += 4) {
        const red = pixels[p]; pixels[p] = pixels[p + 2]; pixels[p + 2] = red;
      }
      start = end;
    } while (start < pixels.length && performance.now() < deadline);
    if (start < pixels.length) await yieldTask();
  }
  checkCanceled(signal);
}

// VideoFrame.copyTo exposes the visible physical pixels. Presentation rotates
// clockwise first, then mirrors horizontally; neither operation changes RGB.
async function orientPixels(pixels, width, height, rotation, flip, signal) {
  const turned = rotation === 90 || rotation === 270;
  const outputWidth = turned ? height : width, result = new Uint8ClampedArray(pixels.length);
  let deadline = performance.now() + 8;
  for (let start = 0; start < width * height; start += 32768) {
    checkCanceled(signal);
    for (let p = start, end = Math.min(start + 32768, width * height); p < end; p++) {
      const x = p % width, y = Math.floor(p / width);
      let ox = x, oy = y;
      if (rotation === 90) { ox = height - y - 1; oy = x; }
      else if (rotation === 180) { ox = width - x - 1; oy = height - y - 1; }
      else if (rotation === 270) { ox = y; oy = width - x - 1; }
      if (flip) ox = outputWidth - ox - 1;
      const input = p * 4, output = (oy * outputWidth + ox) * 4;
      result[output] = pixels[input]; result[output + 1] = pixels[input + 1];
      result[output + 2] = pixels[input + 2]; result[output + 3] = pixels[input + 3];
    }
    if (start + 32768 < width * height && performance.now() >= deadline) {
      await yieldTask(); checkCanceled(signal); deadline = performance.now() + 8;
    }
  }
  checkCanceled(signal);
  return result;
}

// Supported still pixels copy directly from the browser decoder without canvas
// readback noise or a premultiply/unpremultiply round trip. GIF uses its exact
// indexed decoder separately in the caller, including single-frame GIFs.
export async function decodeImageFile(file, { signal, maxPixels = Infinity,
  limitMessage = 'This image is too large.', admit } = {}) {
  const dimensions = (width, height) => {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
      throw new Error('Your browser could not read this image.');
    if (width * height > maxPixels) throw new PixelLimitError(limitMessage);
    admit?.(width, height);
  };
  checkCanceled(signal);
  for (const type of typeof ImageDecoder === 'undefined' ? [] : nativeCandidates(file)) {
    checkCanceled(signal);
    let decoder, frame, closed = false;
    const close = () => { if (decoder && !closed) { closed = true; decoder.close(); } };
    try {
      const supported = await ImageDecoder.isTypeSupported(type);
      checkCanceled(signal);
      if (supported) {
        const data = typeof file.stream === 'function' ? file.stream() : await file.arrayBuffer();
        checkCanceled(signal);
        decoder = new ImageDecoder({ data, type, preferAnimation: false, colorSpaceConversion: 'default' });
        signal?.addEventListener('abort', close, { once: true });
        frame = (await decoder.decode({ frameIndex: 0, completeFramesOnly: true })).image;
        checkCanceled(signal);
        const width = frame.displayWidth, height = frame.displayHeight;
        dimensions(width, height);
        const rotation = frame.rotation ?? 0, flip = frame.flip ?? false;
        const turned = rotation === 90 || rotation === 270;
        const physicalWidth = frame.visibleRect.width, physicalHeight = frame.visibleRect.height;
        // Pure orientation is exact. Display scaling and unproven color-space
        // metadata retain the existing bitmap path rather than guessing pixels.
        if (!unknownSpace(frame) && [0, 90, 180, 270].includes(rotation) && typeof flip === 'boolean' &&
          physicalWidth === (turned ? height : width) && physicalHeight === (turned ? width : height)) {
          const pixels = new Uint8ClampedArray(physicalWidth * physicalHeight * 4);
          const layout = [{ offset: 0, stride: physicalWidth * 4 }];
          if (nativeSrgb(frame)) {
            // Already-managed packed sRGB needs only channel ordering. Asking for
            // RGBA/sRGB again can round low-alpha RGB on some native decoders.
            const planes = await frame.copyTo(pixels, { layout });
            checkCanceled(signal);
            if (planes?.length !== 1 || planes[0].offset !== 0 || planes[0].stride !== physicalWidth * 4)
              throw new Error('Unsupported native image layout.');
            if (frame.format === 'BGRA') await swapRedBlue(pixels, signal);
          } else {
            await frame.copyTo(pixels, { format: 'RGBA', colorSpace: 'srgb', layout });
          }
          checkCanceled(signal);
          const presented = rotation || flip ? await orientPixels(pixels, physicalWidth, physicalHeight, rotation, flip, signal) : pixels;
          return new ImageData(presented, width, height);
        }
      }
    } catch (problem) {
      checkCanceled(signal);
      if (problem instanceof PixelLimitError || problem.code === 'ARTWORK_MEMORY_LIMIT') throw problem;
      // Unsupported native decoding/copy formats keep the existing browser path.
    } finally {
      signal?.removeEventListener('abort', close);
      frame?.close();
      close();
    }
  }
  checkCanceled(signal);
  if (nativeCandidates(file).length && typeof VideoFrame === 'function') {
    try {
      const { decodeStraightBitmap } = await import('./image-bitmap-decode.js');
      checkCanceled(signal);
      const image = await decodeStraightBitmap(file, { signal, checkDimensions: dimensions });
      if (image) return image;
    } catch (problem) {
      checkCanceled(signal);
      if (problem instanceof PixelLimitError || problem.code === 'ARTWORK_MEMORY_LIMIT') throw problem;
      // Unsupported straight-bitmap capabilities retain the existing fallback.
    }
  }
  checkCanceled(signal);
  const bitmap = await createImageBitmap(file);
  let canvas;
  try {
    checkCanceled(signal);
    dimensions(bitmap.width, bitmap.height);
    canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    if (!context) throw new Error('Your browser could not read this image.');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    checkCanceled(signal);
    return image;
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
