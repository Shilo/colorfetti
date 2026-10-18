// Test-only probe for the second audit (Claude browser, no CDP). Never bundled.
// Injected by server.mjs for ?probe. With ?profile it starts a JS Self-Profiling
// Profiler at head for the startup window (needs Document-Policy: js-profiling).
(() => {
  if (window.__p) return;
  const q = new URLSearchParams(location.search), longtasks = [], startup = {};
  // ?seed=palette|onebit|light writes the first audit's seed settings before the app reads storage.
  const palette = { family: 'full-palette', paletteId: 'preset-res64', alphaCut: 128, alphaMode: 'cut', metric: 'oklab', maxColors: 0, lastMaxColors: 16, cleanup: false, dither: 'none', ditherStrength: 50, theme: 'dark' };
  const seeds = { palette, light: { ...palette, theme: 'light' }, auto: { ...palette, paletteId: 'generated-32' }, dither8: { ...palette, dither: '8x8' }, checker: { ...palette, family: 'two-color', first: '#222323', second: '#f0f6f0', none: 0, style: 'checker' }, onebit: { ...palette, family: 'two-color', first: '#222323', second: '#f0f6f0', none: 0, style: 'cutout' } };
  if (seeds[q.get('seed')]) { localStorage.setItem('colorfetti', JSON.stringify(seeds[q.get('seed')])); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1'); }
  const hasProfiler = typeof Profiler === 'function';
  const newProfiler = () => { try { return hasProfiler ? new Profiler({ sampleInterval: 1, maxBufferSize: 200000 }) : null; } catch { return null; } };
  const ltObs = new PerformanceObserver(l => { for (const e of l.getEntries()) longtasks.push({ start: e.startTime, duration: e.duration }); });
  ltObs.observe({ type: 'longtask', buffered: true });
  // Long animation frames carry script attribution (sourceURL/function/char position).
  const loafs = [], short = u => (u || '').replace(location.origin, '');
  const onLoaf = es => { for (const e of es) if (e.duration > 50) loafs.push({ start: e.startTime, duration: e.duration, blocking: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, styleLayout: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0, scripts: e.scripts.map(x => ({ invoker: x.invoker, type: x.invokerType, src: short(x.sourceURL), fn: x.sourceFunctionName, char: x.sourceCharPosition, duration: Math.round(x.duration), forcedLayout: Math.round(x.forcedStyleAndLayoutDuration) })) }); };
  const loafObs = new PerformanceObserver(l => onLoaf(l.getEntries()));
  loafObs.observe({ type: 'long-animation-frame', buffered: true });
  const flush = () => { for (const e of ltObs.takeRecords()) longtasks.push({ start: e.startTime, duration: e.duration }); onLoaf(loafObs.takeRecords()); };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (...a) {
    const r = put.apply(this, a), t = performance.now();
    this.canvas.__paintAt = t; this.canvas.__paintCount = (this.canvas.__paintCount || 0) + 1;
    startup.firstPutImageDataAt ??= t;
    return r;
  };
  const mo = new MutationObserver(() => {
    const b = document.querySelector('button:not([disabled])');
    if (b) { startup.firstEnabledButtonAt = performance.now(); startup.button = b.getAttribute('aria-label') || b.textContent.trim().slice(0, 60); mo.disconnect(); }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true });

  let win = null;
  // First trusted input after begin() marks the action start for windows driven by real UI.
  for (const k of ['pointerdown', 'keydown', 'paste', 'input', 'change'])
    addEventListener(k, e => { if (win && win.actionAt == null && (e.isTrusted || win.allowSynthetic)) { win.actionAt = performance.now(); win.actionEvent = k; } }, true);
  const frame = t => { if (!win) return; win.frames.push(t); win.raf = requestAnimationFrame(frame); };
  const post = (name, body) => fetch('/receipt?name=' + encodeURIComponent(name), { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

  function begin(name, { profile = true, allowSynthetic = false } = {}) {
    if (win) throw Error('window already open: ' + win.name);
    win = { name, start: performance.now(), frames: [performance.now()], actionAt: null, allowSynthetic, profiler: profile ? newProfiler() : null };
    win.raf = requestAnimationFrame(frame);
    return win.start;
  }
  async function end(extra = {}) {
    const w = win; win = null; cancelAnimationFrame(w.raf);
    const stop = performance.now(), trace = w.profiler ? await w.profiler.stop() : null;
    flush(); await new Promise(r => setTimeout(r, 0)); flush();
    const lf = loafs.filter(x => x.start >= w.start - 1 && x.start < stop);
    const g = w.frames.slice(1).map((v, i) => v - w.frames[i]).sort((a, b) => a - b), lt = longtasks.filter(x => x.start >= w.start - 1 && x.start < stop);
    const s = {
      name: w.name, start: w.start, stop, elapsedMs: stop - w.start, actionAt: w.actionAt, actionEvent: w.actionEvent,
      fromActionMs: w.actionAt != null ? (extra.readyAt ?? stop) - w.actionAt : null, rafCount: w.frames.length,
      rafMaxGapMs: g.at(-1) || 0, rafP95GapMs: g[Math.floor(g.length * 0.95)] || 0, longtasks: lt,
      longtaskTotalMs: lt.reduce((a, x) => a + x.duration, 0), maxLongtaskMs: Math.max(0, ...lt.map(x => x.duration)),
      visibility: document.visibilityState, gate: window.__p?.lastGate, loafs: lf, sampleInterval: w.profiler?.sampleInterval ?? null, samples: trace?.samples.length ?? 0, ...extra,
    };
    if (trace) await post(w.name + '.trace.json', trace);
    await post(w.name + '.json', s);
    return s;
  }

  async function stage(urls) {
    __p.staged = await Promise.all(urls.map(async u => { const b = await (await fetch(u)).blob(); return new File([b], u.split('/').pop(), { type: b.type }); }));
    return __p.staged.map(f => f.name + ':' + f.size);
  }
  function paste() {
    const dt = new DataTransfer(); for (const f of __p.staged) dt.items.add(f); __p.staged = null;
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }
  const figures = () => [...document.querySelectorAll('.grid figure')];
  const nameOf = f => (f.querySelector('.name') || f.querySelector('.caption-preview'))?.textContent?.trim();
  // names: exact imported filenames. count: require a non-busy exact count caption.
  // paintAfter: every named canvas painted at or after that time.
  function readyNow(names, { count = true, paintAfter = 0 } = {}) {
    const fs = figures();
    return fs.length === names.length && names.every(n => fs.some(f => {
      const c = f.querySelector('.art canvas'), cc = f.querySelector('.caption-color-count');
      return nameOf(f) === n && c && c.width > 0 && (c.__paintAt || 0) >= paintAfter && (!count || (cc && cc.getAttribute('aria-busy') === 'false'));
    }));
  }
  function waitReady(names, opts = {}, timeout = 120000) {
    return new Promise((res, rej) => {
      const t0 = performance.now();
      const tick = () => { if (readyNow(names, opts)) return res(performance.now()); if (performance.now() - t0 > timeout) return rej(Error('ready timeout ' + JSON.stringify(wall()))); setTimeout(tick, 4); };
      tick();
    });
  }
  const wall = () => figures().map(f => ({ name: nameOf(f), caption: f.querySelector('.dim')?.textContent, w: f.querySelector('.art canvas')?.width, h: f.querySelector('.art canvas')?.height, paints: f.querySelector('.art canvas')?.__paintCount }));

  // For windows driven by a real (trusted) click from outside the page: open the window
  // now, then once the action has happened and cond() holds, close it two frames later.
  const results = {};
  function arm(name, cond, { profile = true, timeout = 60000 } = {}) {
    begin(name, { profile }); results[name] = 'pending';
    const t0 = performance.now();
    const tick = () => {
      if (win?.actionAt != null && cond(win.actionAt)) { const readyAt = performance.now(); requestAnimationFrame(() => requestAnimationFrame(async () => { results[name] = await end({ readyAt }); })); return; }
      if (performance.now() - t0 > timeout) { end({ timeout: true, wall: wall() }).then(s => (results[name] = s)); return; }
      setTimeout(tick, 4);
    };
    tick();
  }
  const paintedAfter = t => { const fs = figures().filter(f => f.querySelector('.art canvas')); return fs.length > 0 && fs.every(f => (f.querySelector('.art canvas').__paintAt || 0) >= t); };
  const countsDone = () => figures().every(f => { const cc = f.querySelector('.caption-color-count'); return !cc || cc.getAttribute('aria-busy') === 'false'; });

  // Staged (outside timing) synthetic paste handoff to the real app paste handler, timed
  // to named+painted tiles and then to non-busy exact counts.
  async function importCohort(name, urls, { count = true, profile = true } = {}) {
    await stage(urls);
    const names = __p.staged.map(f => f.name);
    await new Promise(r => setTimeout(r, 300));
    begin(name, { profile, allowSynthetic: true }); paste();
    const paintedAt = await waitReady(names, { count: false });
    const readyAt = count ? await waitReady(names, { count: true }) : paintedAt;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s = await end({ readyAt, paintedFromActionMs: paintedAt - win_action(), wall: wall() });
    return s;
  }
  let lastAction = 0; const win_action = () => lastAction;
  addEventListener('paste', () => { lastAction = performance.now(); }, true);

  // rAF cadence gate: median and max gap over ~600 ms. Timing is valid only near 16.7 ms.
  const cadence = () => new Promise(r => { const ts = []; const t0 = performance.now(); const f = t => { ts.push(t); if (performance.now() - t0 < 600) requestAnimationFrame(f); else { const g = ts.slice(1).map((v, i) => v - ts[i]).sort((a, b) => a - b); r({ median: g[g.length >> 1] ?? null, max: g.at(-1) ?? null, n: ts.length, ok: g.length > 20 && g.at(-1) < 40 }); } }; requestAnimationFrame(f); });

  // One-call timed window over real app controls (synthetic DOM clicks on the actual
  // buttons). steps: async functions run in order; cond(lastAt) closes the window.
  const btn = label => { const b = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label || b.textContent.trim() === label); if (!b) throw Error('no button ' + label); return b; };
  const click = label => { btn(label).click(); lastAt = performance.now(); };
  let lastAt = 0;
  const until = (f, timeout = 120000) => new Promise((res, rej) => { const t0 = performance.now(); const tick = () => { if (f()) return res(performance.now()); if (performance.now() - t0 > timeout) return rej(Error('timeout ' + JSON.stringify(wall()))); setTimeout(tick, 4); }; tick(); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function timed(name, steps, cond, { profile = true, timeout = 120000 } = {}) {
    begin(name, { profile, allowSynthetic: true }); win.actionAt = lastAt = performance.now(); win.actionEvent = 'synthetic DOM click';
    for (const s of steps) await s();
    const firstAt = win.actionAt, lastClick = lastAt;
    const readyAt = await until(() => cond(lastClick), timeout);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return end({ readyAt, fromLastActionMs: readyAt - lastClick, wall: wall(), firstAt });
  }
  // Exact canvas pixels of the first tile, base64, for out-of-page oracle comparison.
  const pixels = () => { const c = document.querySelector('.grid figure .art canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = ''; for (let i = 0; i < d.length; i += 8192) s += String.fromCharCode(...d.subarray(i, i + 8192)); return { width: c.width, height: c.height, base64: btoa(s) }; };

  // Pre-window gate: rAF cadence plus a fixed CPU loop (min of 6 runs; ~9 ms unthrottled here).
  async function gate() { __p.lastGate = null; const r = []; for (let k = 0; k < 6; k++) { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) | 0; r.push(performance.now() - t); } const c = await cadence(); const cpuMinMs = Math.min(...r); return (__p.lastGate = { ...c, cpuMinMs, ok: c.ok && cpuMinMs < 15 }); }

  // Short result row for the tool output; full receipts are posted by end().
  const row = (s, g) => ({ n: s.name, ready: Math.round(s.fromLastActionMs ?? s.fromActionMs), lt: s.longtasks.map(x => Math.round(x.duration)), raf: Math.round(s.rafMaxGapMs), cpuGate: +g.cpuMinMs.toFixed(1), samples: s.samples });
  const styleButton = S => [...document.querySelectorAll('[role=group][aria-label=Style] button')].find(x => x.textContent.trim() === S);
  // 1-bit: untimed import of F with the Style picker opened, then a timed first click on style S.
  async function coldStyle(F, S, N) {
    await stage(['/fixtures/' + F]); paste(); await waitReady([F], { count: false }, 40000); await until(countsDone);
    click('Style'); await sleep(200); document.querySelector('button[aria-labelledby="style-label style-name"]').click(); await sleep(800);
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const b = styleButton(S), s = await timed(N, [() => b.click()], t => paintedAfter(t));
    return { ...row(s, g), style: document.querySelector('#style-name').textContent, cap: s.wall.map(w => w.caption + w.w).join('|') };
  }

  // 1-bit Cutout: untimed import of F with the settings tray open, then timed rapid
  // Brightness R -> G -> Value (gap ms apart) to the final committed paint.
  async function brightness(F, N, gap = 50) {
    await stage(['/fixtures/' + F]); paste(); await waitReady([F], { count: false }, 40000); await until(countsDone);
    click('Style'); await sleep(200); click('More settings'); await sleep(600);
    const opt = v => [...document.querySelectorAll('[role=group][aria-label=Brightness] button')].find(b => b.textContent.trim() === v);
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const hit = v => () => { opt(v).click(); lastAt = performance.now(); };
    const s = await timed(N, [hit('R'), () => sleep(gap), hit('G'), () => sleep(gap), hit('Value')], t => paintedAfter(t) && JSON.parse(localStorage.getItem('colorfetti')).settings.cutout.source === 'value');
    return { ...row(s, g), fromFirstMs: Math.round(s.readyAt - s.firstAt), pressed: opt('Value').getAttribute('aria-pressed') };
  }

  // Palette editor with 256 pasted colors: separate windows for text entry (value set +
  // input event, standing in for Playwright fill), Review, and Next/Previous paging.
  async function editor(N) {
    const pal = (await (await fetch('/diag/manifest.json')).json()).palette256;
    click('Palette'); await sleep(200); click('Import palette'); await sleep(300); click('Paste colors'); await sleep(300);
    const d = document.querySelector('dialog[open]'), ta = d.querySelector('textarea');
    const first = () => d.querySelector('button[aria-label^="Select color"]')?.getAttribute('aria-label');
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    const a = await timed(N + '-fill', [() => { set.call(ta, pal.join('\n')); ta.dispatchEvent(new Event('input', { bubbles: true })); }], () => true);
    await sleep(300);
    const b = await timed(N + '-review', [() => click('Review colors')], () => /256 colors/.test(d.textContent) && first() === 'Select color 1 #000000');
    await sleep(300);
    const c = await timed(N + '-next', [() => click('Next')], () => first() === 'Select color 65 #4040c0');
    await sleep(300);
    const e = await timed(N + '-previous', [() => click('Previous')], () => first() === 'Select color 1 #000000');
    click('Close palette editor');
    return [a, b, c, e].map(s => row(s, g));
  }

  // Palette 8x8 dithered source F (seed=dither8), timed switch to 4x4 through fresh paint and
  // a non-busy exact count.
  async function dither(F, N) {
    await stage([F]); const name = F.split('/').pop(); paste(); await waitReady([name], { count: true }, 60000);
    click('Palette settings'); await sleep(600);
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    let seenBusy = false;
    const s = await timed(N, [() => click('Dithering 4x4')], t => { if (!countsDone()) seenBusy = true; return paintedAfter(t) && seenBusy && countsDone(); }, { timeout: 40000 });
    const c = document.querySelector('.grid figure .art canvas');
    return { ...row(s, g), paintMs: Math.round(c.__paintAt - s.firstAt), cap: s.wall.map(w => w.caption + w.w).join('|'), pressed: btn('Dithering 4x4').getAttribute('aria-pressed') };
  }

  // Practical cohort follow-up (first audit run.mjs stages without Save): rapid settings
  // RGB/Oklab/RGB, cap 4 -> 8, Cleanup on, Dither 4x4 to final paint + exact counts; then
  // Preview zoom / Original / converted / Fit / close.
  async function rapid(urls, N) {
    await stage(urls); const names = __p.staged.map(f => f.name); paste(); await waitReady(names, { count: true }, 60000);
    click('Palette settings'); await sleep(600);
    const num = document.querySelector('input[aria-label="Max colors value"]');
    const setNum = v => () => { num.value = v; num.dispatchEvent(new Event('input', { bubbles: true })); num.dispatchEvent(new Event('change', { bubbles: true })); lastAt = performance.now(); };
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    let busy = false;
    const s = await timed(N + '-settings', [() => click('RGB matching'), () => click('Oklab matching'), () => click('RGB matching'), setNum('4'), setNum('8'), () => click('Cleanup on'), () => click('Dithering 4x4')],
      t => { if (!countsDone()) busy = true; return paintedAfter(t) && busy && countsDone(); }, { timeout: 40000 });
    const pressed = ['RGB matching', 'Cleanup on', 'Dithering 4x4'].map(l => btn(l).getAttribute('aria-pressed')), maxColors = num.value;
    click('Palette settings'); await sleep(400);
    const preview = await timed(N + '-preview', [
      () => { document.querySelector('.grid figure .caption-preview').click(); },
      () => until(() => document.querySelector('dialog.image-viewer .art canvas')),
      () => click('Zoom in'), () => sleep(250), () => click('Show original image'), () => sleep(180), () => click('Show converted image'), () => click('Fit image'), () => click('Close preview'),
    ], () => !document.querySelector('dialog[open]') && figures().length === names.length);
    return { settings: { ...row(s, g), cap: s.wall.map(w => w.caption).join('|'), pressed, maxColors }, preview: { ...row(preview, g), elapsed: Math.round(preview.elapsedMs) } };
  }

  // Tiny 1-bit pass: dungeon-wizard, one window stepping through all 11 styles, each to a fresh paint.
  async function styles11(N) {
    const F = 'dungeon-wizard.png';
    await stage(['/fixtures/' + F]); paste(); await waitReady([F], { count: false }, 40000); await until(countsDone);
    click('Style'); await sleep(200); document.querySelector('button[aria-labelledby="style-label style-name"]').click(); await sleep(600);
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const steps = ['Solid', 'Lines', 'Stencil', 'Icon', 'Checker', 'Bayer', 'Hatch', 'Atkinson', 'Noise', 'Shape', 'Cutout'].map(S => async () => {
      let b = styleButton(S); if (!b) { document.querySelector('button[aria-labelledby="style-label style-name"]').click(); await sleep(0); b = styleButton(S); }
      const t = performance.now(); b.click(); lastAt = t; await until(() => paintedAfter(t), 20000);
    });
    const s = await timed(N, steps, t => paintedAfter(t));
    return { ...row(s, g), totalMs: Math.round(s.readyAt - s.firstAt), style: document.querySelector('#style-name').textContent };
  }
  // A/B exactness spot check: post the first tile canvas for the current style.
  const postPixels = name => post(name + '.pixels.json', pixels());

  const captions = () => figures().map(f => nameOf(f) + ' ' + (f.querySelector('.dim')?.textContent || '').replace(/\s+/g, ' ').trim());
  // C-A1: 1-bit Checker wall; Threshold drag through the real range input (pointerdown ->
  // Dock drag.press, input -> own[key] + drag.move, pointerup/change -> drag.end).
  async function thresholdDrag(urls, N, steps = 40, every = 3) {
    await stage(urls); const names = __p.staged.map(f => f.name); paste(); await waitReady(names, { count: false }, 60000); await until(countsDone, 60000);
    click('Style'); await sleep(600);
    const range = document.querySelector('input[type=range][aria-label="Threshold"]'); if (!range) throw Error('no Threshold range');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const before = captions();
    begin(N, { profile: false, allowSynthetic: true });
    const t0 = performance.now(); win.actionAt = t0; win.actionEvent = 'synthetic pointer/input drag';
    const frame = () => new Promise(r => requestAnimationFrame(r));
    const dragFrames = [];
    // Main-thread busy proxy: idle time granted to requestIdleCallback during the drag.
    let idleMs = 0, idleOn = true;
    const idle = d => { if (!idleOn) return; idleMs += d.timeRemaining(); requestIdleCallback(idle); };
    requestIdleCallback(idle);
    range.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', isPrimary: true, button: 0 }));
    let busySeen = false;
    for (let i = 0; i < steps; i++) {
      for (let k = 0; k < every; k++) dragFrames.push(await frame());
      setValue.call(range, String(80 + 2 * i)); range.dispatchEvent(new Event('input', { bubbles: true }));
      if (!countsDone()) busySeen = true;
    }
    dragFrames.push(await frame());
    const releaseAt = performance.now(); idleOn = false;
    // Release -> settled: last caption mutation or tile paint after release, once 500 ms quiet
    // with all captions non-busy (a release at the last dragged value need not repaint).
    let lastChange = releaseAt;
    const mo = new MutationObserver(() => { lastChange = performance.now(); });
    mo.observe(document.querySelector('.grid'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-busy'] });
    range.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', isPrimary: true, button: 0 }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
    const lastPaint = () => Math.max(releaseAt, ...figures().map(f => f.querySelector('.art canvas')?.__paintAt || 0));
    await until(() => countsDone() && performance.now() - Math.max(lastChange, lastPaint()) > 500, 60000);
    mo.disconnect();
    const readyAt = Math.max(lastChange, lastPaint());
    const lts = () => longtasks.filter(x => x.start >= t0 - 1);
    const g2 = dragFrames.slice(1).map((v, i) => v - dragFrames[i]).sort((a, b) => a - b);
    const dragLt = () => lts().filter(x => x.start < releaseAt);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s = await end({ readyAt, releaseAt, dragMs: releaseAt - t0, dragIdleMs: idleMs, dragBusyEstMs: releaseAt - t0 - idleMs, releaseToFinalMs: readyAt - releaseAt, dragRafMaxGapMs: g2.at(-1), dragRafP95GapMs: g2[Math.floor(g2.length * 0.95)], dragLongtasks: dragLt(), busyDuringDrag: busySeen, captionsBefore: before, captionsFinal: captions(), value: range.value });
    // Press + release without a move: no caption may change (watch for any aria-busy/text change).
    const pre = captions(); let changed = false;
    const mo2 = new MutationObserver(() => { if (captions().join('|') !== pre.join('|') || !countsDone()) changed = true; });
    mo2.observe(document.querySelector('.grid'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-busy'] });
    range.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', isPrimary: true, button: 0 }));
    await sleep(100);
    range.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', isPrimary: true, button: 0 }));
    await sleep(700); mo2.disconnect();
    const pressOnly = { changed: changed || captions().join('|') !== pre.join('|') };
    await post(N + '.pressonly.json', pressOnly);
    return { n: N, dragMs: Math.round(s.dragMs), dragBusyEstMs: Math.round(s.dragBusyEstMs), releaseToFinalMs: Math.round(s.releaseToFinalMs), dragRafMax: Math.round(s.dragRafMaxGapMs), lt: s.longtasks.map(x => Math.round(x.duration)), dragLt: s.dragLongtasks.map(x => Math.round(x.duration)), busyDuringDrag: busySeen, cpuGate: +g.cpuMinMs.toFixed(1), pressOnlyChanged: pressOnly.changed, final: s.captionsFinal.join(' | ') };
  }
  // C-B4: hover export preparation (exportDragArt pointerenter, mouse) on the first tile;
  // completion = prepared File's object URL (end of prepare) and the drag image attached.
  async function hoverPrep(urls, N) {
    await stage(urls); const names = __p.staged.map(f => f.name); paste(); await waitReady(names, { count: true }, 60000); await sleep(500);
    const art = document.querySelector('.grid figure button.art');
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    let urlAt = null, size = null; const orig = URL.createObjectURL;
    URL.createObjectURL = function (o) { if (urlAt == null && o instanceof File) { urlAt = performance.now(); size = o.size; } return orig.call(this, o); };
    try {
      const s = await timed(N, [() => art.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', isPrimary: true }))], () => urlAt != null && document.querySelector('.grid figure .export-drag-image'), { profile: false, timeout: 30000 });
      const r = { ...row(s, g), enterToFileMs: Math.round(urlAt - s.firstAt), prepMs: Math.round(urlAt - s.firstAt - 180), imageMs: Math.round(s.readyAt - s.firstAt), bytes: size, maxLongtaskMs: s.maxLongtaskMs, gate: g };
      await post(N + '.prep.json', r); return r;
    } finally { URL.createObjectURL = orig; art.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', isPrimary: true })); }
  }

  // SHA-256 of every tile canvas (display check across builds, not an export oracle).
  const canvasHashes = async () => Promise.all(figures().map(async f => { const c = f.querySelector('.art canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const h = new Uint8Array(await crypto.subtle.digest('SHA-256', d)); return [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join(''); }));
  const countOf = f => +((f.querySelector('.caption-color-count')?.textContent || '').match(/(\d+) colou?rs?/)?.[1] ?? NaN);
  // C-B1: palette family; Max colors 2 -> 4 -> 8 through the real number field (input + change),
  // each step to a fresh paint of every tile and non-busy exact captions with count <= cap.
  async function maxColorsSteps(urls, N) {
    await stage(urls); const names = __p.staged.map(f => f.name); paste(); await waitReady(names, { count: true }, 60000); await sleep(400);
    click('Palette settings'); await sleep(600);
    const num = document.querySelector('input[aria-label="Max colors value"]');
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    begin(N, { profile: false, allowSynthetic: true }); const t0 = performance.now(); win.actionAt = t0; win.actionEvent = 'synthetic input+change';
    const steps = [];
    for (const v of [2, 4, 8]) {
      // Settled = every tile repainted after the edit, captions non-busy with count <= cap, and
      // 300 ms without caption mutation or paint; the step ends at the last such change.
      const s0 = performance.now(); let lastChange = s0;
      const mo = new MutationObserver(() => { lastChange = performance.now(); });
      mo.observe(document.querySelector('.grid'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-busy'] });
      num.value = String(v); num.dispatchEvent(new Event('input', { bubbles: true })); num.dispatchEvent(new Event('change', { bubbles: true }));
      const lastPaint = () => Math.max(s0, ...figures().map(f => f.querySelector('.art canvas')?.__paintAt || 0));
      await until(() => paintedAfter(s0) && countsDone() && figures().every(f => countOf(f) <= v) && performance.now() - Math.max(lastChange, lastPaint()) > 300, 60000);
      mo.disconnect();
      const at = Math.max(lastChange, lastPaint());
      steps.push({ cap: v, ms: at - s0, longtasks: longtasks.filter(x => x.start >= s0 - 1 && x.start < at).map(x => Math.round(x.duration)) });
    }
    const readyAt = performance.now();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s = await end({ readyAt, totalMs: steps.reduce((a, x) => a + x.ms, 0), steps, captionsFinal: captions(), canvasHashes: await canvasHashes() });
    return { n: N, totalMs: Math.round(s.totalMs), steps: steps.map(x => Math.round(x.ms) + (x.longtasks.length ? '/LT' + x.longtasks.join('+') : '')), maxLt: Math.round(s.maxLongtaskMs), rafMax: Math.round(s.rafMaxGapMs), cpuGate: +g.cpuMinMs.toFixed(1), final: s.captionsFinal.join(' | '), hashes: s.canvasHashes.join(',') };
  }
  // C-B5: 1-bit Cutout wall, rapid Brightness R -> G -> Value (50 ms apart) to the final paint.
  async function brightnessWall(urls, N, gap = 50) {
    await stage(urls); const names = __p.staged.map(f => f.name); paste(); await waitReady(names, { count: false }, 60000); await until(countsDone, 60000);
    click('Style'); await sleep(200); click('More settings'); await sleep(600);
    const opt = v => [...document.querySelectorAll('[role=group][aria-label=Brightness] button')].find(b => b.textContent.trim() === v);
    const g = await gate(); if (!g.ok) throw Error('gate ' + JSON.stringify(g));
    const hit = v => () => { opt(v).click(); lastAt = performance.now(); };
    const s = await timed(N, [hit('R'), () => sleep(gap), hit('G'), () => sleep(gap), hit('Value')], t => paintedAfter(t) && JSON.parse(localStorage.getItem('colorfetti')).settings.cutout.source === 'value', { profile: false });
    await until(countsDone, 60000);
    const hashes = await canvasHashes(), caps = captions();
    await post(N + '.display.json', { captions: caps, hashes });
    return { ...row(s, g), totalMs: Math.round(s.readyAt - s.firstAt), maxLt: Math.round(s.maxLongtaskMs), rafMax: Math.round(s.rafMaxGapMs), final: caps.join(' | '), hashes: hashes.join(',') };
  }

  window.__p = { maxColorsSteps, brightnessWall, canvasHashes, thresholdDrag, hoverPrep, captions, styles11, postPixels, rapid, dither, editor, brightness, row, styleButton, coldStyle, gate, btn, click, until, sleep, timed, pixels, loafs, cadence, importCohort, begin, end, arm, results, paintedAfter, countsDone, stage, paste, readyNow, waitReady, wall, longtasks, startup, post, hasProfiler };

  if (q.has('profile')) {
    begin('startup-' + (q.get('profile') || 'run'), { profile: true });
    // Startup ends at the first enabled control plus first art paint (the live example), then two frames.
    const done = () => startup.firstEnabledButtonAt && startup.firstPutImageDataAt;
    const poll = () => (done() ? requestAnimationFrame(() => requestAnimationFrame(async () => {
      const nav = performance.getEntriesByType('navigation')[0], paints = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime]));
      __p.startupResult = await end({ ...startup, nav: nav && { dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, responseEnd: nav.responseEnd }, paints, readyAt: Math.max(startup.firstEnabledButtonAt, startup.firstPutImageDataAt) });
    })) : setTimeout(poll, 4));
    poll();
  }
})();
