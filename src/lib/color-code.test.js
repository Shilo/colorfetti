import { describe, it, expect } from 'vitest';
import { parseColorCode } from './color-code.js';

describe('single color entry', () => {
  it('accepts pasted or typed short/full RGB codes with optional hash and surrounding spaces', () => {
    for (const [input, expected] of [[' #AbC\n', '#aabbcc'], ['ABC', '#aabbcc'], ['aB12Ef', '#ab12ef'], ['#000000', '#000000']]) {
      expect(parseColorCode(input)).toBe(expected);
    }
  });
  it('rejects unfinished, alpha, named, multiple and arbitrary color values', () => {
    for (const input of ['', '#', '#12', '12345', '#abcd', '#12345678', 'red', '#fff #000', 'rgb(1,2,3)', '##fff', '#gggggg', null]) {
      expect(parseColorCode(input)).toBeNull();
    }
  });
});
