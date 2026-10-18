import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExportDrag } from './export-drag.js';
import { createArtworkAdmission } from './artwork-admission.js';
import { artworkIdentity, originalArtworkItem } from './artwork-source-projection.js';

afterEach(() => { vi.useRealTimers(); });
describe('preparatory export drag ownership', () => {
  it('stores a scalar desired item while sharing projected requests by opaque identity', async () => {
    vi.useFakeTimers();
    const original = { width: 1, height: 1, data: new Uint8Array(4) };
    let live = { id: 7, name: 'test.png', original, img: { lum: new Uint8Array(1) } };
    const retained = [], prepared = [];
    const controller = createExportDrag({ delay: 1,
      retainItem: item => { const next = { id: item.id }; retained.push(next); return next; },
      request: item => item.id === live.id ? { item: originalArtworkItem(live), identity: artworkIdentity(live), key: 'same' } : null,
      prepare: async asked => { prepared.push(asked); return record('blob:projected'); }, revoke: vi.fn(), notify: vi.fn() });
    controller.hover(live); await vi.advanceTimersByTimeAsync(1);
    expect(retained).toEqual([{ id: 7 }]); expect(controller.readyFor(live)).toBeTruthy();
    expect(prepared[0].identity).not.toBe(live); expect(prepared[0].item.img).toEqual({ w: 1, h: 1 });
    controller.refresh(); await vi.advanceTimersByTimeAsync(1); expect(prepared).toHaveLength(1);
    live = { ...live, img: {} }; controller.refresh(); await vi.advanceTimersByTimeAsync(1);
    expect(prepared).toHaveLength(2); controller.destroy();
  });
  it('retains the removed source until canceled preparation actually settles, then drops its lease', async () => {
    vi.useFakeTimers(); const budget = createArtworkAdmission(100), token = budget.reserve(70), item = { admission: token };
    let live = true, finish;
    const controller = createExportDrag({ delay: 1, request: () => live ? { item, key: 'a' } : null,
      prepare: () => { const releaseSource = token.hold(); return new Promise(resolve => { finish = () => resolve({ ...record('blob:late'), releaseSource }); }); },
      revoke: vi.fn(), notify: vi.fn() });
    controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    live = false; token.release(); controller.refresh(); await vi.advanceTimersByTimeAsync(0);
    expect(budget.used).toBe(70); expect(() => budget.reserve(31)).toThrow(expect.objectContaining({ code: 'ARTWORK_MEMORY_LIMIT' }));
    finish(); await vi.advanceTimersByTimeAsync(0); expect(budget.used).toBe(0); controller.destroy();
  });
  it('drops a ready cached source lease when wall removal invalidates the request', async () => {
    vi.useFakeTimers(); const budget = createArtworkAdmission(100), token = budget.reserve(70), item = { admission: token };
    let live = true;
    const controller = createExportDrag({ delay: 1, request: () => live ? { item, key: 'a' } : null,
      prepare: async () => ({ ...record('blob:ready'), releaseSource: token.hold() }), revoke: vi.fn(), notify: vi.fn() });
    controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    expect(controller.readyFor(item)).toBeTruthy(); token.release(); expect(budget.used).toBe(70);
    live = false; controller.refresh(); expect(budget.used).toBe(0); controller.destroy();
  });
  function fixture(prepare, delay = 1) {
    let key = 'initial';
    const request = vi.fn(item => ({ item, key }));
    const notify = vi.fn(), revoke = vi.fn();
    const controller = createExportDrag({ request, prepare, notify, revoke, delay });
    return { controller, request, notify, revoke, change: () => { key = 'changed'; controller.refresh(); } };
  }
  const record = url => ({ url, file: new File(['pixels'], 'test.png', { type: 'image/png' }), width: 1, height: 1 });
  it('refuses an unavailable request without claiming that preparation is running', async () => {
    vi.useFakeTimers();
    const prepare = vi.fn(), notify = vi.fn(), item = { id: 1 };
    const controller = createExportDrag({ request: () => null, prepare, notify });
    const event = { dataTransfer: {}, preventDefault: vi.fn() };
    expect(controller.start(event, item)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    expect(prepare).not.toHaveBeenCalled(); expect(notify).not.toHaveBeenCalled();
    controller.destroy();
  });
  it('does not compute snapshots for observers without a ready export', () => {
    const f = fixture(vi.fn());
    expect(f.controller.readyFor({ id: 1 })).toBeNull(); expect(f.request).not.toHaveBeenCalled();
    f.controller.destroy();
    expect(f.controller.readyFor({ id: 1 })).toBeNull(); expect(f.request).not.toHaveBeenCalled();
  });
  it('cancels obsolete preparation and lets the next item start without an error toast', async () => {
    vi.useFakeTimers(); const calls = [];
    const f = fixture((asked, { signal }) => new Promise((resolve, reject) => {
      calls.push({ asked, signal, resolve });
      signal.addEventListener('abort', () => reject(new DOMException('Canceled', 'AbortError')), { once: true });
    }));
    const first = { id: 1 }, next = { id: 2 };
    f.controller.hover(first); await vi.advanceTimersByTimeAsync(1);
    f.controller.hover(next); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); expect(calls[0].signal.aborted).toBe(true);
    calls[1].resolve(record('blob:new')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(next)?.url).toBe('blob:new'); expect(f.notify).not.toHaveBeenCalled();
    f.controller.destroy(); expect(f.revoke).toHaveBeenCalledWith('blob:new');
  });
  it('rejects a late canceled result, retains completed reuse, and invalidates changed settings', async () => {
    vi.useFakeTimers(); const calls = [];
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })));
    const item = { id: 1 };
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    f.controller.leave(item); await vi.advanceTimersByTimeAsync(1); expect(calls[0].signal.aborted).toBe(true);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); // Module-loading work need not resolve before the next hover starts.
    calls[0].resolve(record('blob:late')); await vi.advanceTimersByTimeAsync(0);
    expect(f.revoke).toHaveBeenCalledWith('blob:late'); expect(calls).toHaveLength(2);
    calls[1].resolve(record('blob:ready')); await vi.advanceTimersByTimeAsync(0);
    f.controller.cancelHover(); f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); expect(f.controller.readyFor(item)?.url).toBe('blob:ready');
    f.change(); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(3); expect(f.controller.readyFor(item)).toBeNull();
    f.controller.destroy(); expect(calls[2].signal.aborted).toBe(true);
    calls[2].resolve(record('blob:disposed')); await vi.advanceTimersByTimeAsync(0);
    expect(f.revoke).toHaveBeenCalledWith('blob:disposed'); expect(f.notify).not.toHaveBeenCalled();
  });
  it('reuses in-flight preparation after a brief leave and return to the same request', async () => {
    vi.useFakeTimers(); const calls = [], item = { id: 1 };
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })), 180);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(180);
    await vi.advanceTimersByTimeAsync(80); f.controller.leave(item);
    await vi.advanceTimersByTimeAsync(10); f.controller.hover(item);
    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toHaveLength(1); expect(calls[0].signal.aborted).toBe(false);
    calls[0].resolve(record('blob:jitter')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(item)?.url).toBe('blob:jitter'); expect(f.notify).not.toHaveBeenCalled();
    f.controller.destroy(); expect(f.revoke).toHaveBeenCalledWith('blob:jitter');
  });
  it('stops queued work immediately and aborts a sustained departure after the hover delay', async () => {
    vi.useFakeTimers(); const calls = [], item = { id: 1 };
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })), 180);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(80); f.controller.leave(item);
    await vi.advanceTimersByTimeAsync(300); expect(calls).toHaveLength(0);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(180); f.controller.leave(item);
    await vi.advanceTimersByTimeAsync(179); expect(calls[0].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1); expect(calls[0].signal.aborted).toBe(true);
    calls[0].resolve(record('blob:late-departure')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(item)).toBeNull(); expect(f.revoke).toHaveBeenCalledWith('blob:late-departure');
    expect(f.notify).not.toHaveBeenCalled(); f.controller.destroy();
  });
  it('still discards a result completed while away within the leave delay', async () => {
    vi.useFakeTimers(); const calls = [], item = { id: 1 };
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })), 180);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(180); f.controller.leave(item);
    calls[0].resolve(record('blob:away')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(item)).toBeNull(); expect(f.revoke).toHaveBeenCalledWith('blob:away');
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(180);
    expect(calls).toHaveLength(2); expect(calls[1].signal.aborted).toBe(false);
    calls[1].resolve(record('blob:return')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(item)?.url).toBe('blob:return');
    expect(f.notify).not.toHaveBeenCalled(); f.controller.destroy();
  });
  it.each(['next', 'settings', 'cancel', 'destroy'])('invalidates immediately during leave grace: %s', async action => {
    vi.useFakeTimers(); const calls = [], item = { id: 1 }, next = { id: 2 };
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })), 180);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(180); f.controller.leave(item);
    if (action === 'next') f.controller.hover(next);
    else if (action === 'settings') f.change();
    else if (action === 'cancel') f.controller.cancelHover();
    else f.controller.destroy();
    expect(calls[0].signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(180);
    if (action === 'next') { expect(calls).toHaveLength(2); expect(calls[1].signal.aborted).toBe(false); }
    else expect(calls).toHaveLength(1);
    f.controller.destroy(); calls.forEach((call, index) => call.resolve(record(`blob:canceled-${index}`)));
    await vi.advanceTimersByTimeAsync(0); expect(f.notify).not.toHaveBeenCalled();
  });
  it('retains a native drag and its grace URL through cancellation and settings changes', async () => {
    vi.useFakeTimers(); const item = { id: 1 }, f = fixture(async () => record('blob:native'));
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    const ready = f.controller.readyFor(item);
    const image = { src: ready.url, complete: true, naturalWidth: 1, naturalHeight: 1 };
    const event = { target: image, preventDefault: vi.fn(), dataTransfer: { files: [ready.file], clearData: vi.fn(), setData: vi.fn() } };
    expect(f.controller.start(event, item, { record: ready, image, decoded: true })).toBe(true);
    f.controller.cancelHover(); f.change(); expect(f.revoke).not.toHaveBeenCalled();
    f.controller.end(); expect(f.revoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000); expect(f.revoke).toHaveBeenCalledWith('blob:native');
    f.controller.destroy();
  });
});
