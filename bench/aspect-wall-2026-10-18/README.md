# Aspect-aware wall acceptance

Design decisions and final results live in
[the research record](../../docs/research/2026-10-18-aspect-aware-wall.md).

The desktop-caption correction uses `REPORT_TAG=desktop-restored`; its reports and
screenshots are separate from the initial implementation's evidence. The harness
now explicitly distinguishes desktop single-line captions/hover actions from
touch stacked captions/44px More, including when desktop cards become narrow.
The corrected Edge full run passed 162/162 groups with no page errors; Firefox
passed 13/13. WebKit passed its 13 functional groups with the documented existing
resize notifications. The complete unit run passed 1,371 tests (two skipped),
and Codex checked both mixed/all-fixture desktop walls at 15 sizes (30 states).

```powershell
npm run build
node bench/aspect-wall-2026-10-18/fixtures.mjs
node bench/aspect-wall-2026-10-18/geometry-fuzz.mjs
node bench/aspect-wall-2026-10-18/qa.mjs
```

The browser harness imports actual files into the unmodified production build.
It checks 12 viewport/input configurations and 12 image populations, including
both open panels and live resizing. Separate workflows check Preview, zoom/Fit,
comparison, PNG/GIF and ZIP dimensions in Palette and 1-bit, single-line desktop
versus stacked touch captions, retained desktop hover-action focus during resizing,
and narrow-card removal using the desktop capsule.

`QUICK=1` selects desktop, phone and landscape with single-strip, extreme and
all-fixture populations. Set `ENGINE=firefox` or `ENGINE=webkit` for representative
cross-engine runs; the default is installed Edge with Chromium sandbox enabled.
The script uses the local bundled Playwright and installed browser paths recorded
near its top; adjust those paths when running on another machine. `BASE_URL` can
target an already-running build server. Browser profiles stay under `.tmp`.

Current Edge evidence is `results/desktop-restored-full.json`; current Firefox
and WebKit reports include the same `desktop-restored` tag. Cross-engine screenshots
have engine prefixes. `baseline-quick.json` and `webkit-first-quick.json` retain
intermediate findings and must be read with the research record's reconciliation.
`geometry-fuzz.json` records the reproducible 10,000-case seeded geometry probe.
`desktop-restored-unit-tests.txt` records the current complete Vitest run;
`unit-tests.txt` and `results/full.json` record the earlier implementation.

`codex/` contains screenshots and DOM geometry from actual Codex browser testing:
122 imported-wall states, 15 empty examples, and the user's original 256×1 image
with Preview zoom/Fit checks. Codex viewport resizing does not emulate a physical
phone or switch its pointer type. Touch behavior is checked separately by the
production browser harness; Firefox does not support Playwright's `isMobile` flag.

No physical Android, iPhone or Safari session is claimed by these results.

WebKit passes all 13 geometry/functional groups, but its aggregate `pass` remains
false because two ResizeObserver notifications were recorded without suppression.
`webkit-baseline-quick.json` confirms the same wide-image notification on untouched
HEAD `765f76f0ad94a32a62318dcf9e2073cd21c02d12`. The smaller
`resize-observer-compare.mjs` and `results/webkit-resize-observer-compare.json`
match the 1280×900→320×360 focus-resize sequence: baseline and candidate each emit
one identical notification at `focus/shrink`. Temporary baseline/compare preview
servers were stopped after testing.

Final results: Edge 162/162 groups and Firefox 13/13 groups passed without page
errors; WebKit passed 13/13 functional groups but retains two ResizeObserver
notifications. Both notification sequences reproduce in untouched HEAD765f76f0;
the matched comparison and `resize-observer-compare.mjs` preserve that evidence.
WebKit reports intentionally keep `pass:false` rather than filtering warnings.
