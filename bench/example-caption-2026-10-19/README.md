# Empty-example caption priority

The example caption must preserve its existing Add instruction and import glyph
when the artwork shrinks. Its left title and metadata can ellipsize first. The
old left column had `flex: none`, so the right instruction shrank and clipped.

The correction is scoped to the example: a shrinking left column with bounded
ellipsis, and a nonshrinking instruction that can wrap within 60% of the caption
content width. This accommodates the longer desktop copy in the existing two-line
height. Text, glyphs, caption heights and imported-image styles are unchanged.

`viewport-results.json` records direct Codex in-app browser measurements against
the built app (`index-CHDQxMKo.js`, `index-CzwydYh4.css`):

- 40/40 empty-caption states pass: ten viewport sizes, closed panels, 1-bit
  Palette/Style panels and full-palette settings. Widths are 320–1440px and heights
  240–1024px, including 568x320 and 667x375 short landscape.
- Every rendered instruction line stays within its caption; title/metadata do
  not overlap it, and the import glyph stays inside the button. Existing copy,
  source resolution and color metadata remain in the DOM.
- 5/5 imported-image states pass with square, portrait and 256:1 fixtures:
  normal 27px single-line mouse captions and existing metadata flex layout remain.
- Clicking the example caption opens the actual multiple-file picker and imports
  all three fixtures. Reload restores the empty example.

These are mouse-input browser checks at desktop and phone-sized viewports, not
physical-device or touch emulation. The unchanged touch wording, Add images, is
shorter than the full desktop instruction verified at the same minimum width.
No runtime CSS override, edited text or injected application state was used.
Screenshots are generated local evidence and follow the benchmark PNG ignore rule.

The final production build and whitespace checks pass. All 82 Vitest files pass:
1371 tests pass and two existing tests are skipped (`unit-results.json`).

Two harness assumptions were corrected without production changes: clicking
outside an open panel dismisses that panel before opening the picker, and an
inline-flex element computes to flex when it is itself a flex item.

## Browser recovery

The old localhost tab was an internal data-URL connection-error page because no
server was listening on port 5173. Attempting to observe that error page produced
a protocol-policy rejection. No browser security setting or site permission needed
changing. Starting the app and opening its normal HTTP URL restored access.

The development-module preview did not complete rendering in this session. A
fresh production build served by Vite preview rendered immediately and was used
for all final browser checks. The running preview is left available on localhost:

```powershell
npm run build
npm run preview -- --host localhost --port 5173 --strictPort
```

Check the listener and actual tab URL before diagnosing a localhost error as a
browser permission problem. After rebuilding, reload the browser before testing.
