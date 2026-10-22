import { parseColorCode } from './color-code.js';

// Plain, approximate descriptions for editor UI only. Never used for matching,
// storage, deduplication or output. HSL bands intentionally favor familiar words.
export function describeColor(code) {
  const hex = parseColorCode(code);
  if (!hex) return '';
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >>> 16) / 255, g = (rgb >>> 8 & 255) / 255, b = (rgb & 255) / 255;
  const high = Math.max(r, g, b), low = Math.min(r, g, b);
  const delta = high - low, light = (high + low) / 2;
  if (high <= .06) return 'Black';
  if (low >= .94 && delta <= .04) return 'White';
  if (delta <= .04) return light < .35 ? 'Dark gray' : light > .7 ? 'Light gray' : 'Gray';
  const saturation = delta / (1 - Math.abs(2 * light - 1));
  let hue = high === r ? (g - b) / delta : high === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  let name = hue < 15 || hue >= 345 ? 'red' : hue < 45 ? 'orange' : hue < 70 ? 'yellow'
    : hue < 165 ? 'green' : hue < 190 ? 'cyan' : hue < 255 ? 'blue' : hue < 315 ? 'purple' : 'pink';
  if (hue >= 15 && hue < 50 && light < .45) name = 'brown';
  const tone = light < .3 ? 'dark ' : light > .75 ? 'pale ' : light > .6 ? 'light ' : '';
  const muted = saturation < .4 ? 'muted ' : '';
  const result = tone + muted + name;
  return result[0].toUpperCase() + result.slice(1);
}
