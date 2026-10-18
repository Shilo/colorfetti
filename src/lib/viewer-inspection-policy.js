// Reserved separately from tracked source/analysis admission. This is logical
// typed/raster storage headroom, not a process-heap, garbage-collection or GPU cap.
export const NATIVE_VIEWER_PIXELS = 4 * 1024 * 1024;
export const NATIVE_VIEWER_MAX_AXIS = 16384;
export const NATIVE_VIEWER_HEADROOM_BYTES = 84 * 1024 * 1024;

export function nativeInspectionAllowed(width, height) {
  return [width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= NATIVE_VIEWER_MAX_AXIS)
    && width * height <= NATIVE_VIEWER_PIXELS;
}
