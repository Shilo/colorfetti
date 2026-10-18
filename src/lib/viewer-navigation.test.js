import { describe, it, expect, vi, afterEach } from 'vitest';
import { constrainView, zoomView, viewerNavigation, MIN_VIEWER_ZOOM, MAX_VIEWER_ZOOM } from './viewer-navigation.js';

const geometry = { width: 800, height: 600, imageWidth: 800, imageHeight: 400 };
const event = (pointerId, clientX, clientY, timeStamp = 0, extra = {}) => ({ pointerId, clientX, clientY, timeStamp, button: 0, isPrimary: pointerId === 1, ...extra });
function fixture(options) {
  const onclose = vi.fn(), onhold = vi.fn(), onchange = vi.fn();
  const navigation = viewerNavigation({ onclose, onhold, onchange, ...options }); navigation.resize(geometry);
  return { navigation, onclose, onhold, onchange };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

// Dispatch through the production listeners, not just the navigation methods:
// button-only tests cannot catch wheel/keyboard routing to different zoom math.
function inputFixture() {
  const doc = Object.assign(new EventTarget(), { querySelector: () => null, hidden: false });
  const win = Object.assign(new EventTarget(), { closest: () => null });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', win);
  const node = Object.assign(new EventTarget(), {
    ownerDocument: doc, open: true,
    closest: selector => selector === '.viewer-art' ? node : null,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  });
  const navigation = viewerNavigation();
  const action = navigation.attach(node, geometry);
  const wheel = (deltaY, deltaMode = 0, extra = {}) => {
    const e = Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode, clientX: 400, clientY: 300, ...extra });
    node.dispatchEvent(e); return e;
  };
  const key = value => win.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: value }));
  const step = (source, direction) => {
    if (source === 'button') navigation.stepZoom(direction);
    else if (source === 'keyboard') key(direction > 0 ? '+' : '-');
    else wheel((direction > 0 ? -1 : 1) * (source === 'trackpad' ? .25 : 120));
  };
  return { navigation, wheel, key, step, destroy: action.destroy };
}

describe('production zoom input routing', () => {
  const sources = ['button', 'keyboard', 'wheel', 'trackpad'];
  for (const away of sources) for (const back of sources) {
    it(`${away} to either limit and ${back} back retrace the same levels`, () => {
      const { navigation: n, step, destroy } = inputFixture();
      try {
        for (const [direction, count, endpoint] of [[-1, 7, MIN_VIEWER_ZOOM], [1, 13, MAX_VIEWER_ZOOM]]) {
          const scales = [1];
          for (let i = 0; i < count; i++) { step(away, direction); scales.push(n.view.scale); }
          expect(n.view.scale).toBe(endpoint);
          // Extra input at a limit must not build hidden zoom debt.
          for (let i = 0; i < 20; i++) step(away, direction);
          for (let i = count - 1; i >= 0; i--) { step(back, -direction); expect(n.view.scale).toBe(scales[i]); }
          expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
        }
      } finally { destroy(); }
    });
  }
  it.each([0, 1, 2])('wheel deltaMode %s and varying magnitudes always advance one shared level', deltaMode => {
    const { navigation: n, wheel, destroy } = inputFixture();
    try {
      for (const delta of [.1, 1, 16, 100, 120, 240, 1000]) {
        n.reset(); wheel(delta, deltaMode); expect(n.view.scale).toBe(.8);
        wheel(-delta, deltaMode); expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
      }
      const before = n.view; wheel(0, deltaMode, { deltaX: 100 }); expect(n.view).toEqual(before);
    } finally { destroy(); }
  });
  it('keeps Ctrl-wheel pinch continuous and lands on shared levels when incremental input resumes', () => {
    const { navigation: n, wheel, step, destroy } = inputFixture();
    try {
      wheel(-40, 0, { ctrlKey: true }); expect(n.view.scale).toBeCloseTo(Math.exp(.1));
      step('wheel', -1); expect(n.view.scale).toBe(1);
      wheel(40, 0, { ctrlKey: true }); expect(n.view.scale).toBeCloseTo(Math.exp(-.1));
      step('keyboard', 1); expect(n.view.scale).toBe(1);
    } finally { destroy(); }
  });
  it('wheel stepping retains the source coordinate under an off-center cursor', () => {
    const { navigation: n, wheel, destroy } = inputFixture();
    try {
      n.stepZoom(1); n.stepZoom(1); const before = n.view;
      const e = wheel(-120, 0, { clientX: 460, clientY: 330 });
      expect(e.defaultPrevented).toBe(true);
      expect((60 - before.x) / before.scale).toBeCloseTo((60 - n.view.x) / n.view.scale);
      expect((30 - before.y) / before.scale).toBeCloseTo((30 - n.view.y) / n.view.scale);
    } finally { destroy(); }
  });
});

describe('viewer geometry', () => {
  it('retains the image coordinate under the wheel/pinch anchor before a bound is reached', () => {
    const next = zoomView({ scale: 2, x: 30, y: -10 }, 3, { x: 60, y: 30 }, { x: 80, y: 50 }, geometry);
    expect((60 - 30) / 2).toBeCloseTo((80 - next.x) / next.scale);
    expect((30 + 10) / 2).toBeCloseTo((50 - next.y) / next.scale);
  });
  it('centers undersized axes and clamps oversized axes and zoom', () => {
    expect(constrainView({ scale: 0.01, x: 500, y: -500 }, geometry)).toEqual({ scale: .25, x: 0, y: 0 });
    expect(constrainView({ scale: 2, x: 9999, y: -9999 }, geometry)).toEqual({ scale: 2, x: 400, y: -100 });
    expect(constrainView({ scale: 100, x: 0, y: 0 }, geometry).scale).toBe(16);
  });
  it('keeps arbitrary pan and zoom sequences finite and within visible-image bounds', () => {
    let view = { scale: 1, x: 0, y: 0 };
    for (let i = 0; i < 500; i++) {
      view = zoomView(view, .01 + (i * 37 % 210) / 10, { x: i - 250, y: 300 - i }, { x: i * 7 - 1000, y: i * 3 - 600 }, geometry);
      expect(view.scale).toBeGreaterThanOrEqual(.25); expect(view.scale).toBeLessThanOrEqual(16);
      expect(Math.abs(view.x)).toBeLessThanOrEqual(Math.max(0, (800 * view.scale - 800) / 2));
      expect(Math.abs(view.y)).toBeLessThanOrEqual(Math.max(0, (400 * view.scale - 600) / 2));
    }
  });
});

describe('reversible viewer zoom', () => {
  for (const [direction, steps, endpoint] of [[-1, 7, MIN_VIEWER_ZOOM], [1, 13, MAX_VIEWER_ZOOM]]) {
    it(`returns exactly to Fit after every outward/return count toward ${endpoint}`, () => {
      const { navigation: n } = fixture();
      for (let count = 1; count <= steps; count++) {
        for (let i = 0; i < count; i++) n.stepZoom(direction);
        expect(n.view.scale).not.toBe(1);
        if (count === steps) {
          expect(n.view.scale).toBe(endpoint);
          const atLimit = n.view;
          for (let i = 0; i < 5; i++) n.stepZoom(direction);
          expect(n.view).toEqual(atLimit);
        }
        for (let i = 0; i < count; i++) n.stepZoom(-direction);
        expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
      }
    });
    it(`retraces every zoom level from ${endpoint} without drift across repeated cycles`, () => {
      const { navigation: n } = fixture();
      for (let cycle = 0; cycle < 50; cycle++) {
        const scales = [1];
        for (let i = 0; i < steps; i++) { n.stepZoom(direction); scales.push(n.view.scale); }
        for (let i = steps - 1; i >= 0; i--) { n.stepZoom(-direction); expect(n.view.scale).toBe(scales[i]); }
        expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
      }
    });
  }
  it('normalizes continuous reciprocal zoom roundoff in the actual view, not just Fit detection', () => {
    const { navigation: n, onchange } = fixture();
    for (let cycle = 0; cycle < 100; cycle++) {
      n.zoomBy(.8); n.zoomBy(.8); n.zoomBy(1.25); n.zoomBy(1.25);
      expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
      expect(onchange).toHaveBeenLastCalledWith({ scale: 1, x: 0, y: 0, dragging: false });
    }
  });
  it('steps in the requested direction after an arbitrary wheel/pinch scale', () => {
    const { navigation: n } = fixture();
    n.zoomBy(.93); n.stepZoom(1); expect(n.view.scale).toBe(1);
    n.zoomBy(.93); n.stepZoom(-1); expect(n.view.scale).toBeCloseTo(.8);
    n.reset(); n.zoomBy(1.1); n.stepZoom(-1); expect(n.view.scale).toBe(1);
    n.zoomBy(1.1); n.stepZoom(1); expect(n.view.scale).toBe(1.25);
    n.reset(); n.zoomBy(1.25 * (1 + Number.EPSILON)); n.stepZoom(1); expect(n.view.scale).toBe(1.5625);
  });
  it('returning from a panned zoom centers the image exactly at Fit', () => {
    const { navigation: n } = fixture();
    for (let i = 0; i < 8; i++) n.stepZoom(1);
    n.panBy(117, -83); expect(n.view.x).not.toBe(0);
    for (let i = 0; i < 8; i++) n.stepZoom(-1);
    expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it.each([-1, 1])('a zoom key at limit %s still retires pending tap/hold ownership', direction => {
    vi.useFakeTimers();
    const { navigation: n, onhold } = fixture();
    n.zoomBy(direction < 0 ? .01 : 100);
    const atLimit = n.view;
    n.down(event(1, 300, 200)); n.stepZoom(direction);
    vi.advanceTimersByTime(500);
    expect(onhold).not.toHaveBeenCalledWith(true);
    n.up(event(1, 300, 200, 100)); expect(n.click()).toBe(false);
    expect(n.view).toEqual(atLimit);
  });
  it('cleans numerical edge/scale residue while preserving intentional zoom and pan', () => {
    expect(constrainView({ scale: 1 + Number.EPSILON, x: 1e-14, y: -1e-14 }, { ...geometry, imageWidth: 800 + 1e-13 }))
      .toEqual({ scale: 1, x: 0, y: 0 });
    expect(constrainView({ scale: 1 + 1e-8, x: 1e-6, y: 0 }, geometry))
      .toEqual({ scale: 1 + 1e-8, x: 1e-6, y: 0 });
    expect(constrainView({ scale: MIN_VIEWER_ZOOM + Number.EPSILON, x: 0, y: 0 }, geometry).scale).toBe(MIN_VIEWER_ZOOM);
    expect(constrainView({ scale: MAX_VIEWER_ZOOM - Number.EPSILON * 16, x: 0, y: 0 }, geometry).scale).toBe(MAX_VIEWER_ZOOM);
  });
});

describe('viewer gesture ownership', () => {
  it('closes on a quick stationary click, including when zoomed', () => {
    const { navigation: n, onclose } = fixture(); n.zoomBy(2);
    n.down(event(1, 300, 200)); n.up(event(1, 302, 202, 100)); expect(n.click()).toBe(true); expect(onclose).toHaveBeenCalledOnce();
  });
  it('pans both axes without dismissing, even after returning to the starting point', () => {
    const { navigation: n, onclose } = fixture(); n.zoomBy(3);
    n.down(event(1, 300, 200)); n.move(event(1, 380, 260)); expect(n.view.x).toBe(80); expect(n.view.y).toBe(60);
    n.move(event(1, 300, 200)); n.up(event(1, 300, 200, 100)); expect(n.click()).toBe(false); expect(onclose).not.toHaveBeenCalled();
  });
  it('checks the release position even without intermediate moves', () => {
    const { navigation: n } = fixture(); n.zoomBy(2); n.down(event(1, 300, 200)); n.up(event(1, 340, 240, 50)); expect(n.click()).toBe(false); expect(n.view.x).toBe(40);
  });
  for (const firstLift of [1, 2]) it(`pinches, then continues dragging with finger ${3 - firstLift}, without a jump or close`, () => {
    const { navigation: n } = fixture();
    n.down(event(1, 350, 300)); n.down(event(2, 450, 300));
    n.move(event(1, 300, 300)); n.move(event(2, 500, 300)); expect(n.view.scale).toBeCloseTo(2);
    n.up(event(firstLift, firstLift === 1 ? 300 : 500, 300, 100)); const before = n.view;
    n.move(event(3 - firstLift, firstLift === 1 ? 520 : 320, 320)); expect(n.view.x).toBeCloseTo(before.x + 20);
    n.up(event(3 - firstLift, firstLift === 1 ? 520 : 320, 320, 150)); expect(n.click()).toBe(false);
  });
  it('a second stationary finger prevents dismissal and comparison', () => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture();
    n.down(event(1, 300, 200)); n.down(event(2, 400, 200)); vi.advanceTimersByTime(500);
    expect(onhold).not.toHaveBeenCalledWith(true);
    n.up(event(2, 400, 200, 50)); n.up(event(1, 300, 200, 100)); expect(n.click()).toBe(false);
  });
  it('hold compares and release restores; moving a held image starts pan and restores immediately', () => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture(); n.zoomBy(2);
    n.down(event(1, 300, 200)); vi.advanceTimersByTime(450); expect(onhold).toHaveBeenLastCalledWith(true);
    n.move(event(1, 330, 220)); expect(onhold).toHaveBeenLastCalledWith(false);
    n.up(event(1, 330, 220, 500)); expect(n.click()).toBe(false);
  });
  it.each(['cancel', 'reset', 'resize'])('%s retires a pending tap and hold timer', operation => {
    vi.useFakeTimers(); const { navigation: n, onhold } = fixture(); n.down(event(1, 200, 200));
    n[operation](operation === 'resize' ? { ...geometry, width: 500 } : undefined);
    vi.advanceTimersByTime(500); n.up(event(1, 200, 200, 100)); expect(n.click()).toBe(false); expect(onhold).not.toHaveBeenCalledWith(true);
  });
  it('rejects secondary buttons, orphan fingers, and release over toolbar', () => {
    const { navigation: n } = fixture();
    n.down(event(1, 300, 200, 0, { button: 2 })); n.up(event(1, 300, 200, 50)); expect(n.click()).toBe(false);
    n.down(event(2, 300, 200)); n.up(event(2, 300, 200, 50)); expect(n.click()).toBe(false);
    n.down(event(1, 300, 200)); n.up(event(1, 300, 200, 50), false); expect(n.click()).toBe(false);
  });
  it('wheel/buttons invalidate pending taps; comparison shortcut gates close', () => {
    const { navigation: n } = fixture({ canClose: () => false });
    n.down(event(1, 300, 200)); n.up(event(1, 300, 200, 50)); expect(n.click()).toBe(false);
    const { navigation: other } = fixture(); other.down(event(1, 300, 200)); other.zoomBy(2); other.up(event(1, 300, 200, 50)); expect(other.click()).toBe(false);
  });
  it('resizing retains scale but clamps offsets; reset always restores Fit', () => {
    const { navigation: n } = fixture(); n.zoomBy(3); n.panBy(999, 999);
    n.resize({ width: 400, height: 800, imageWidth: 400, imageHeight: 200 }); expect(n.view).toEqual({ scale: 3, x: 400, y: 0 });
    n.reset(); expect(n.view).toEqual({ scale: 1, x: 0, y: 0 });
  });
});
