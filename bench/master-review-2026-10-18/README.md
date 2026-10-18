# Conversion review evidence

The implementation-planning document is
[the master review](../../docs/research/2026-10-18-master-conversion-and-ux-review.md).
The earlier independent evidence lives in `../app-review-2026-10-18/`.

Versioned files are the review text, probe source, frozen review inputs, JSON
measurements and test/build receipts. Generated PNG/GIF/ZIP files, screenshots,
build bundles and extraction directories stay local and are ignored. The longer
superseded draft was archived locally under `.tmp/review-archive/`.

## Reproducing probes

Run from the repository root with Node 25 and installed project dependencies.
Image comparisons used Sharp 0.35.5/libvips 8.18.7. The scripts load `sharp` through
ordinary Node resolution or an explicit `SHARP_MODULE` path. To keep this optional
review dependency outside the application's dependencies, a local setup is:

```powershell
npm install --prefix .tmp/review-deps --no-save --package-lock=false sharp@0.35.5
$env:SHARP_MODULE = (Resolve-Path '.tmp/review-deps/node_modules/sharp').Path
```

Selected probe order:

```powershell
node bench/master-review-2026-10-18/root/recheck-export-probe.mjs
node bench/master-review-2026-10-18/root/png-compressor-probe.mjs
node bench/master-review-2026-10-18/root/io-stencil-probe.mjs
node bench/master-review-2026-10-18/root/crop-probe.mjs
node bench/master-review-2026-10-18/root/recheck-crosscheck.mjs
node bench/master-review-2026-10-18/independent/kernel-challenge.mjs
& './bench/master-review-2026-10-18/root/filename-portability.ps1'
```

These probes write JSON measurements beside their source. Preserve the committed
historical receipts when comparing a new implementation; review new results as a
diff or run in a separate checkout. The candidate study uses the already tracked
`bench/important-colors-review/manifest.json` and hash-checked Kenney sprites.
Cropping uses the four already tracked animation128/animation256 nearest/enhanced
GIF workloads under `bench/practical-workloads-2026-10-16/desktop/`.

`root/record.mjs` is a historical recorder and refuses to replace its receipt.
`root/finalize.mjs` checks the retained original source/build/input hashes and
needs the original local `.tmp/master-review/dist` build. It is a snapshot check,
not a command that should pass after implementing the recommendations. Its latest
result is retained as `root/final-verification.json`. Original browser observation
receipts are manual CUA observations; the fixture/server scripts do not reproduce
those interactions automatically.

Before versioning, probe dependency resolution was made portable without changing
conversion or measurement logic. Historical JSON still records the actual module
paths and versions used during the original runs.
