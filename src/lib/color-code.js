// A single opaque RGB color. Bulk palette import keeps its own grammar.
export function parseColorCode(text) {
  if (typeof text !== 'string') return null;
  const hex = text.trim().replace(/^#/, '');
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  return '#' + (hex.length === 3 ? [...hex].map(c => c + c).join('') : hex).toLowerCase();
}
