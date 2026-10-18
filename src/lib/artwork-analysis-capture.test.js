import { describe, expect, it } from 'vitest';
import { analyze } from './recolor.js';
import { reanalyzeItems, reanalyzeItem } from './image-reanalysis.js';
import { convertedAnimation } from './converted-animation.js';
import { artworkCost, createArtworkAdmission } from './artwork-admission.js';
import { holdArtworkExport } from './artwork-export-lease.js';
import { CAPTURED_ANALYSIS_BYTES, capturedAnalysisCost, holdArtworkAnalyses } from './artwork-analysis-capture.js';

function fixture() {
  const original = { width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4) };
  for (let i = 0; i < original.data.length; i += 4) original.data.set([i & 255, 41, 197, 255], i);
  const frame = { original, img: analyze(original), delay: 100 };
  const source = createArtworkAdmission(artworkCost(64, 64)), admission = source.reserve(artworkCost(64, 64));
  return { item: { id: 1, name: 'captured.gif', ...frame, frames: [frame], by: 'luma ', admission }, source };
}
function uniqueBytes(items) {
  const buffers = new Set();
  for (const item of items) for (const value of Object.values(item.img)) if (ArrayBuffer.isView(value)) buffers.add(value.buffer);
  return [...buffers].reduce((n, buffer) => n + buffer.byteLength, 0);
}
const settings = { first: '#000000', second: '#ffffff', style: 'solid', set: { source: 'luma', alpha: 128 } };

describe('bounded captured legacy analyses', () => {
  it('charges a matching export surviving two live-wall generations and releases after actual encoding ownership', async () => {
    const { item, source } = fixture(), captures = createArtworkAdmission(100000);
    const release = holdArtworkExport([item], { source: 'luma' }, { budget: captures });
    const exported = convertedAnimation(item, settings);
    const current = await reanalyzeItems([item], { source: 'red' });
    const replacement = await reanalyzeItems(current, { source: 'blue' });
    expect(uniqueBytes([item, ...current, ...replacement])).toBe(59392);
    expect(source.used).toBe(45056); expect(captures.used).toBe(14336);
    expect(source.used + captures.used).toBeGreaterThanOrEqual(uniqueBytes([item, ...current, ...replacement]));
    item.admission.release(); expect(source.used).toBe(45056);
    expect(exported.getFrame(0).mask).toHaveLength(4096);
    release(); release(); expect(source.used).toBe(0); expect(captures.used).toBe(0);
  });
  it('charges both captured input and nonmatching export analyses alongside current/replacement analyses', async () => {
    const { item, source } = fixture(), captures = createArtworkAdmission(100000);
    const release = holdArtworkExport([item], { source: 'green' }, { budget: captures });
    const exported = await reanalyzeItem(item, { source: 'green' });
    const current = await reanalyzeItems([item], { source: 'red' });
    const replacement = await reanalyzeItems(current, { source: 'blue' });
    expect(captures.used).toBe(28672);
    expect(source.used + captures.used).toBe(uniqueBytes([item, exported, ...current, ...replacement]));
    release(); item.admission.release(); expect(source.used + captures.used).toBe(0);
  });
  it('admits one twenty-megapixel matching or nonmatching clip without allocating that clip', () => {
    const frames = Array.from({ length: 20 }, () => ({ original: { width: 1024, height: 1024,
      get data() { throw new Error('Cost must not read pixels.'); } }, img: {} }));
    const budget = createArtworkAdmission(CAPTURED_ANALYSIS_BYTES);
    const bytes = capturedAnalysisCost(frames, 1);
    expect(bytes).toBe(125911040); expect(bytes).toBeLessThan(CAPTURED_ANALYSIS_BYTES);
    const first = holdArtworkAnalyses(frames, { extraGenerations: 1, budget });
    expect(() => holdArtworkAnalyses(frames, { budget })).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    expect(budget.used).toBe(bytes); first(); expect(budget.used).toBe(0);
    const later = holdArtworkAnalyses(frames, { budget }); later(); expect(budget.used).toBe(0);
  });
  it('deduplicates existing analysis identity but separately charges new replacement frames', () => {
    const frame = { original: { width: 2, height: 2 }, img: {} };
    expect(capturedAnalysisCost([frame, { ...frame }])).toBe(2060);
    expect(capturedAnalysisCost([frame, { ...frame }], 1)).toBe(6180);
  });
  it('rolls back source and prior captures on partial batch admission failure', () => {
    const a = fixture(), b = fixture(), budget = createArtworkAdmission(14336);
    expect(() => holdArtworkExport([a.item, b.item], { source: 'luma' }, { budget })).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    a.item.admission.release(); b.item.admission.release();
    expect(budget.used + a.source.used + b.source.used).toBe(0);
  });
});
