import { describe, it, expect } from 'vitest';
import { describeColor } from './color-description.js';

describe('plain color descriptions', () => {
  it('uses familiar neutral, primary and brown descriptions', () => {
    for (const [hex, expected] of [['#000000', 'Black'], ['#ffffff', 'White'], ['#808080', 'Gray'], ['#202020', 'Dark gray'], ['#dddddd', 'Light gray'], ['#ff0000', 'Red'], ['#00ff00', 'Green'], ['#0000ff', 'Blue'], ['#ff8000', 'Orange'], ['#ffff00', 'Yellow'], ['#00ffff', 'Cyan'], ['#800080', 'Dark purple'], ['#663300', 'Dark brown']]) {
      expect(describeColor(hex)).toBe(expected);
    }
  });
  it('describes muted/light shades without naming data or losing the exact code', () => {
    expect(describeColor('#7f708a')).toBe('Muted purple');
    expect(describeColor(' #ABC ')).toBe('Light muted blue');
    expect(describeColor('#fff0f4')).toBe('Pale pink');
    expect(describeColor('not a color')).toBe('');
  });
});
