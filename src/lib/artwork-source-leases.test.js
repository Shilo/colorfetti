import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let admission, holdSources;
beforeEach(async () => {
  vi.resetModules();
  admission = await import('./artwork-admission.js');
  ({ holdArtworkSources: holdSources } = await import('./artwork-source-leases.js'));
});
afterEach(() => vi.unstubAllGlobals());

function source(pool, value = 1) {
  const token = pool.reserve(64);
  const original = { width: 1, height: 1, data: Uint8ClampedArray.of(value, 2, 3, 255) };
  admission.attachArtworkData(original.data, token);
  return { original, admission: token };
}

describe('artwork source borrower leases', () => {
  it('deduplicates data and keeps removed source charged until its borrower settles', () => {
    const pool = admission.createArtworkAdmission(100), item = source(pool);
    const release = holdSources([item, item.original, { data: item.original.data }]);
    item.admission.release();
    expect(pool.used).toBe(64);
    expect(() => pool.reserve(64)).toThrow();
    release(); release();
    expect(pool.used).toBe(0); expect(pool.count).toBe(0);
  });

  it('rolls back earlier holds if a later source was already freed', () => {
    const pool = admission.createArtworkAdmission(200), first = source(pool), stale = source(pool, 9);
    stale.admission.release();
    expect(() => holdSources([first, stale])).toThrow();
    first.admission.release();
    expect(pool.used).toBe(0);
  });

  it('accepts unregistered demo sources without reserving storage', () => {
    const release = holdSources([{ data: new Uint8ClampedArray(4) }]);
    expect(() => { release(); release(); }).not.toThrow();
  });
});

class HangingWorker {
  postMessage() {}
  terminate() { this.terminated = true; }
}

async function requestFor(kind) {
  const { preparePalette } = await import('./quantize.js');
  const palette = preparePalette(['#000000', '#ffffff']);
  if (kind === 'limit') {
    const { getLimitedPalette } = await import('./palette-limit-client.js');
    return (item, signal) => getLimitedPalette(item, palette, 128, 'oklab', 1, { signal });
  }
  if (kind === 'cleanup') {
    const { getPaletteCleanup } = await import('./palette-cleanup-client.js');
    return (item, signal) => getPaletteCleanup(item, palette, 128, 'oklab', { signal });
  }
  const { captureGeneratedSources } = await import('./palette-generated-sources.js');
  const { getGeneratedPalette } = await import('./palette-generated-client.js');
  return (item, signal) => getGeneratedPalette(captureGeneratedSources([item]), { signal });
}

describe.each(['limit', 'cleanup', 'generated'])('%s source ownership', kind => {
  it('keeps a shared running job charged after wall removal and one subscriber cancellation', async () => {
    vi.stubGlobal('Worker', HangingWorker);
    const request = await requestFor(kind), pool = admission.createArtworkAdmission(200), item = source(pool);
    const first = new AbortController(), second = new AbortController();
    const a = request(item, first.signal).catch(error => error);
    const b = request(item, second.signal).catch(error => error);
    item.admission.release(); first.abort();
    expect(await a).toMatchObject({ name: 'AbortError' });
    expect(pool.used).toBe(64);
    second.abort(); expect(await b).toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(pool.used).toBe(0));
  });

  it('releases canceled queued work without releasing the running job', async () => {
    vi.stubGlobal('Worker', HangingWorker);
    const request = await requestFor(kind), pool = admission.createArtworkAdmission(200);
    const firstItem = source(pool), secondItem = source(pool, 9);
    const first = new AbortController(), second = new AbortController();
    const a = request(firstItem, first.signal).catch(error => error);
    const b = request(secondItem, second.signal).catch(error => error);
    firstItem.admission.release(); secondItem.admission.release();
    expect(pool.used).toBe(128);
    second.abort(); expect(await b).toMatchObject({ name: 'AbortError' });
    expect(pool.used).toBe(64);
    first.abort(); expect(await a).toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(pool.used).toBe(0));
  });
});
