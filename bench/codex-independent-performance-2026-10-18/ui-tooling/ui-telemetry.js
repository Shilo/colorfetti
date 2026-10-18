// Test-only attribution counters. Call start(label)/finish() around an action.
// Wrappers perturb timing; use separate uninstrumented windows for latency claims.
(() => {
  if (window.__codexUiTelemetry) return;
  const originals = {
    setProperty: CSSStyleDeclaration.prototype.setProperty,
    rect: Element.prototype.getBoundingClientRect,
    context: HTMLCanvasElement.prototype.getContext,
    width: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'),
    height: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height'),
    clientWidth: Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth'),
    mutation: window.MutationObserver,
  };
  const watched = new WeakMap(), receipts = [];
  let current;
  function increment(key, amount = 1) { if (current) current.counts[key] = (current.counts[key] || 0) + amount; }
  function elapsed(key, start) { if (current) current.ms[key] = (current.ms[key] || 0) + performance.now() - start; }
  function kind(node) {
    if (node.matches('.palette-review-swatch,.palette-review-grid') || node.closest('.palette-review-grid')) return 'review';
    if (node.matches('.tooltip')) return 'tooltip';
    if (node.matches('dialog.image-viewer')) return 'viewerDialog';
    if (node.matches('.art') && node.closest('.grid,.empty')) return 'wallArt';
    if (node.matches('canvas') && node.closest('.palette-circle,.full-active-palette,.palette-color-input,.sw')) return 'palettePaint';
    return 'other';
  }
  const rootStyle = document.documentElement.style;
  CSSStyleDeclaration.prototype.setProperty = function(name, value, priority) {
    if (current && this === rootStyle && ['--canvas-grid-step', '--canvas-grid-x', '--canvas-grid-y'].includes(name)) {
      increment('gridVariableWrites');
      if (this.getPropertyValue(name) === String(value)) increment('gridVariableSameValueWrites');
    }
    return originals.setProperty.call(this, name, value, priority);
  };
  Element.prototype.getBoundingClientRect = function(...args) {
    if (!current) return originals.rect.apply(this, args);
    const bucket = kind(this), start = performance.now();
    const value = originals.rect.apply(this, args);
    increment(`${bucket}.rect`); elapsed(`${bucket}.rect`, start); return value;
  };
  if (originals.clientWidth?.get && originals.clientWidth.configurable) Object.defineProperty(Element.prototype, 'clientWidth', {
    ...originals.clientWidth,
    get() {
      if (!current) return originals.clientWidth.get.call(this);
      const bucket = kind(this), start = performance.now(), value = originals.clientWidth.get.call(this);
      increment(`${bucket}.clientWidth`); elapsed(`${bucket}.clientWidth`, start); return value;
    },
  });
  HTMLCanvasElement.prototype.getContext = function(...args) {
    if (!current) return originals.context.apply(this, args);
    const bucket = kind(this), start = performance.now(), value = originals.context.apply(this, args);
    increment(`${bucket}.getContext`); elapsed(`${bucket}.getContext`, start); return value;
  };
  for (const property of ['width', 'height']) {
    const descriptor = originals[property];
    if (!descriptor?.set || !descriptor.configurable) continue;
    Object.defineProperty(HTMLCanvasElement.prototype, property, { ...descriptor, set(value) {
      if (current) increment(`${kind(this)}.${property}Sets`);
      return descriptor.set.call(this, value);
    } });
  }
  window.MutationObserver = class extends originals.mutation {
    constructor(callback) {
      super((records, observer) => {
        if (!current || !watched.get(observer)) return callback(records, observer);
        increment('appChildCallbacks'); increment('appMutationRecords', records.length);
        const start = performance.now();
        try { return callback(records, observer); }
        finally { elapsed('appChildCallbacks', start); }
      });
    }
    observe(node, options) {
      if (node.id === 'app' && options?.subtree && options?.childList) watched.set(this, true);
      return super.observe(node, options);
    }
  };
  const api = {
    start(label) {
      if (current) api.finish();
      current = { label, start: performance.now(), counts: {}, ms: {} };
    },
    finish() {
      if (!current) return null;
      const value = { ...current, end: performance.now() };
      current = null; receipts.push(value); return value;
    },
    receipts,
    dispose() {
      api.finish();
      CSSStyleDeclaration.prototype.setProperty = originals.setProperty;
      Element.prototype.getBoundingClientRect = originals.rect;
      HTMLCanvasElement.prototype.getContext = originals.context;
      for (const property of ['width', 'height']) if (originals[property]?.configurable) Object.defineProperty(HTMLCanvasElement.prototype, property, originals[property]);
      if (originals.clientWidth?.configurable) Object.defineProperty(Element.prototype, 'clientWidth', originals.clientWidth);
      window.MutationObserver = originals.mutation;
      delete window.__codexUiTelemetry;
    },
  };
  window.__codexUiTelemetry = api;
})();
