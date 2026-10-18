import { describe, it, expect } from 'vitest';
import { artworkCost, createArtworkAdmission, attachArtworkData, attachArtworkOriginal,
  holdArtworkData, holdArtworkOriginal, holdArtworkItems, removeArtworkItem, ARTWORK_FRAME_PIXELS } from './artwork-admission.js';
import { holdArtworkExport } from './artwork-export-lease.js';

describe('logical artwork reservations', () => {
  it('removes the current immutable clone by stable ID without releasing an absent wall owner', () => {
    const budget = createArtworkAdmission(100), owner = budget.reserve(70), other = budget.reserve(20);
    const stale = { id: 1, admission: owner }, live = { ...stale, analysis: 'replacement' }, remaining = { id: 2, admission: other };
    const finishExport = owner.hold();
    let wall = removeArtworkItem([live, remaining], stale.id);
    expect(wall).toEqual([remaining]); expect(budget.used).toBe(90);
    const previous = wall; wall = removeArtworkItem(wall, stale.id);
    expect(wall).toBe(previous); expect(removeArtworkItem(wall, undefined)).toBe(previous); expect(budget.used).toBe(90);
    finishExport(); expect(budget.used).toBe(20); remaining.admission.release(); expect(budget.used).toBe(0);
  });
  it('keeps a removed source charged until its actual export borrower settles', () => {
    const budget = createArtworkAdmission(100), token = budget.reserve(70), item = { admission: token };
    const finishExport = holdArtworkItems([item, item]);
    token.release(); token.release();
    expect(budget.used).toBe(70); expect(budget.count).toBe(1);
    expect(() => budget.reserve(31)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    finishExport(); finishExport(); expect(budget.used).toBe(0); expect(budget.count).toBe(0);
    budget.reserve(100).release(); expect(budget.peak).toBe(100);
  });
  it('atomically rechecks resized dimensions and cannot overbook concurrent jobs', () => {
    const budget = createArtworkAdmission(100), first = budget.reserve(30), second = budget.reserve(40);
    expect(() => first.resize(70)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    expect(first.bytes).toBe(30); expect(budget.used).toBe(70);
    second.release(); first.resize(100); expect(budget.used).toBe(100); first.release();
  });
  it('borrows originals without touching a lazy pixel getter', () => {
    const budget = createArtworkAdmission(100), token = budget.reserve(80);
    const original = { get data() { throw new Error('Do not scan a canceled or saturated source.'); } };
    const data = new Uint8ClampedArray(4);
    attachArtworkOriginal(original, token); attachArtworkData(data, token);
    const releaseOriginal = holdArtworkOriginal(original), releaseData = holdArtworkData(data);
    token.release(); releaseOriginal(); expect(budget.used).toBe(80); releaseData(); expect(budget.used).toBe(0);
  });
  it('reserves reanalysis overlap and rejects unsupported frame counts/pixel sizes', () => {
    expect(artworkCost(2, 3, 4)).toBe(6 * 4 * 10 + 4 * 4096);
    expect(() => artworkCost(ARTWORK_FRAME_PIXELS + 1, 1)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    expect(() => artworkCost(1, 1, 4097)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    expect(() => artworkCost(0, 1)).toThrow('Invalid artwork dimensions');
  });
  it('charges additional nonmatching export analysis until encoding settles, rolling back failures', () => {
    const budget = createArtworkAdmission(10000), admission = budget.reserve(4100);
    const item = { admission, by: 'luma ', img: { soft: false }, original: { width: 2, height: 2 } };
    const same = holdArtworkExport([item], { source: 'luma' }); expect(budget.used).toBe(4100); same();
    const changed = holdArtworkExport([item], { source: 'blue' }); expect(budget.used).toBe(4100 + 2060);
    admission.release(); expect(budget.used).toBe(6160); changed(); expect(budget.used).toBe(0);
    const tight = createArtworkAdmission(5000), small = tight.reserve(4100);
    expect(() => holdArtworkExport([{ ...item, admission: small }], { source: 'blue' })).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    small.release(); expect(tight.used).toBe(0);
  });
});
