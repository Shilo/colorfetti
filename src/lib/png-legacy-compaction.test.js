import { beforeEach, expect, it, vi } from 'vitest';
const control = vi.hoisted(() => ({ compressed: 0 }));
vi.mock('fflate', async original => {
  const actual = await original(); return { ...actual, zlibSync: (...args) => { control.compressed++; return actual.zlibSync(...args); } };
});
import { pngBytes } from './save.js';
import { legacyFixture } from '../../bench/conversion-fixes-2026-10-18/m8/fixtures.mjs';
beforeEach(() => { control.compressed = 0; });

it.each([[262144, 'opaque', 2], [262145, 'opaque', 1], [262144, 'three', 1]])('compresses only the permitted candidate at %i pixels/%s', (count, kind, expected) => {
  pngBytes(legacyFixture(kind, count, 1)); expect(control.compressed).toBe(expected);
});
it.each([262144, 262145, 4194304])('rejects a late malformed role at %i pixels before any compression', count => {
  const image = legacyFixture('opaque', count, 1); image.mask[count - 1] = 3;
  expect(() => pngBytes(image)).toThrow(/mask role/); expect(control.compressed).toBe(0);
});
