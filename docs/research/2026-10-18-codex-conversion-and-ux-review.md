# Codex independent conversion and UX review

Date: October 18, 2026.

This review comes from my source inspection, three parallel reviewers, browser observations, independently checked conversion probes, and primary-source research. Its evidence is in `bench/app-review-2026-10-18/`; the similarly named conversion review was not used to write it.

Findings describe the tested baseline `0c3194e9b5b96ced8d19cef5420e4b0985d4f752`. Later concurrent changes are outside its verification claims. This review has not implemented the recommended fixes.

## Recommended priorities

| Order | Fix | Why it matters |
| --- | --- | --- |
| 1 | Make output inspection trustworthy | A sampled preview can hide or greatly exaggerate saved dithering. |
| 2 | Add decoded-memory limits to artwork import | A tiny compressed GIF can occupy substantial memory before previews. |
| 3 | Crop transparent GIF frame bounds | Demonstrated smaller files without changing visible output or timing. |
| 4 | Evaluate dither-aware color limiting | Max colors can discard colors the enabled dither needs. |

## Findings and recommended fixes

### 1. Dither previews can misrepresent saved output

**Evidence:** A uniform #808080 image at 1024×128, converted to Black & White with 4×4 dithering at 100%, saves with **25% white pixels**. Production sampling at 256×32 shows **0% white**. This includes the existing layout mitigation; the minimum short-axis size can undo it. Other tested layouts also show substantial bias.

Maximum zoom does not guarantee exact inspection. A browser-tested 20-frame 1024×1024 GIF retained a 720×720 raster at 16× zoom, without indicating that it remained sampled. Export still uses the full source.

**Recommended fix:** Show sampling status and provide native-pixel inspection of one selected frame or viewport region. Separately evaluate area-aware or phase-aware dither previews. Preserve the clip memory budget and exact export coordinates; increasing every frame's resolution is insufficient as a safe solution.

**Verify:** Inspect long sheets, multiple tile sizes, device pixel ratios, transparency, and long animations. These examples establish conditional failures, not how frequently they affect ordinary artwork.

Evidence: `color-quality/layout-results.json`, `decode-export/crosscheck.json`, and `ux/ui-receipt.json` under the review evidence directory. Implementation: `src/lib/layout.js`, `src/lib/palette-dither.js`, and `src/lib/viewer-layout.js`.

### 2. Artwork import has no decoded-memory admission budget

**Evidence:** A valid **51,751-byte GIF**, containing 64 frames at 512×512, retains **117,571,584 bytes, approximately 112.1 MiB**, in source and analysis buffers alone. Previews and browser overhead add more. A crash was not induced.

Artwork decoding permits unlimited pixels by default and prepares the whole animation before transfer. Existing palette-import limits and the animation-preview cache budget do not bound artwork memory.

**Recommended fix:** Preflight dimensions and frame count, estimate decoded storage, and reserve capacity against the wall plus pending imports. Reject excessive imports before expansion with a useful explanation; optionally offer reduced dimensions or fewer frames. Compressed file size alone is an inadequate limit.

**Verify:** Multiple simultaneous imports, many-frame compressed GIFs, cancellation, failed reservations, and removal releasing capacity.

Evidence: `decode-export/results.json`, case `compressed-animation-expansion`. Implementation: `src/lib/gif.js`, `src/lib/image-import-worker.js`, and `src/lib/image-decode.js`.

### 3. GIF exports encode unnecessary transparent space

**Evidence:** Cropping transparent frame bounds reduced four existing animation exports by **43.5–65.8%**. Independent Sharp decoding verified visible RGB, every alpha byte, dimensions, frame count, delays, and loop metadata. RGB values underneath fully transparent pixels were not required to match.

**Recommended fix:** Start with transparent-bound cropping while retaining existing disposal behavior. Positioned frame rectangles are supported by [GIF89a](https://www.w3.org/Graphics/GIF/spec-gif89a.txt). Treat temporal changed-rectangle encoding as a separate, more complex improvement.

**Verify:** Empty frames, moving and shrinking objects, edge-touching artwork, finite loops, and both recoloring families. File-size savings do not establish a conversion-speed improvement.

Evidence: `decode-export/real-gif-trim.json` and `real-gif-trim.mjs`. Implementation: `src/lib/gif.js`.

### 4. Max colors can suppress useful dithering

**Evidence:** With a uniform #808080 source, Grayscale 8, and 8×8 dithering, All produces two colors. Max 2 selects only #929292 and produces a flat image. This happens at both 50% and 100% strength through the actual export-preparation path.

The limiter selects nearest-color winners before dithering. A useful mixing endpoint can therefore be removed. This obeys the maximum-count contract; it is an interaction between different quality objectives.

**Recommended fix:** Prototype bounded dither-aware subset selection or filling while dithering is effective. Preserve undithered behavior. Any new dependency on dither settings must enter worker, cache, snapshot, and export identities.

**Verify:** Spatial appearance, point error, exact target membership, frame consistency, and phone cost before adoption.

Evidence: `decode-export/crosscheck.json`, `capApplicationPath`. Implementation: `src/lib/palette-limit.js` and `src/lib/palette-state.js`.

## Additional useful fixes

| Finding | Recommendation and qualification |
| --- | --- |
| Keep PNG always uses RGBA for fractional alpha | Index exact color/alpha pairs when at most 256 states exist. One fixture was **40.3% smaller**, with every RGBA byte preserved. Keep RGBA otherwise. [PNG supports per-entry alpha](https://www.w3.org/TR/png-3/#11tRNS). |
| Global GIF table rejects some representable clips | Permit local tables when each frame fits. This cannot solve a single frame needing 256 opaque colors plus transparency. |
| Play-once GIF repeats in preview | Respect source loop metadata, or expose an explicit preview Loop control and Replay. Saved metadata already specifies play-once correctly. |
| Space fails to activate focused Preview buttons | Restrict held comparison to artwork/noninteractive surfaces. Enter works; this is a smaller accessibility correction. [W3C button behavior](https://www.w3.org/WAI/ARIA/apg/patterns/button/) expects both keys. |
| Import errors discard filename and cause | Retain bounded per-file diagnostics and recovery guidance. A malformed supported PNG currently receives only the supported-format list. |
| ZIP names can be invalid on Windows | Sanitize portable filename characters before resolving collisions. Windows extraction reproduced omission of `a:b-colorfetti.png`. |

Export evidence is in `decode-export/results.json` and `filename-portability.json`; browser evidence is in `ux/ui-receipt.json`.

## Changes that need more research

Explicit source-to-target color mapping deserves a prototype. Editing the allowed palette currently reruns nearest matching, which can merge regions rather than recolor the intended one. Frozen assignment controls could give users precise artistic control; this would be a separate workflow, not a correction to nearest matching.

Keep the current matching defaults. A broader dither occupancy search improved spatial error in 20 real-art cases, worsened 15, and tied once. Better internal scores do not establish consistently better artwork or acceptable runtime. Additional color-space settings are lower priority than the demonstrated problems above.

## Verification and limits

The recorded baseline passed **1,161 unit tests, with two skips, across 67 files**, and its production build passed. Browser checks used the recorded desktop build. Independent scalar checks confirmed the selected sampling and color-limit examples; independent image decoding checked the export comparisons.

Receipts: `bench/app-review-2026-10-18/validation.json`, `unit-tests.txt`, and `ux/ui-receipt.json`. Focused reviewer test counts overlap the full suite and are not additional independent totals. This review does not establish Safari/iOS behavior, physical-phone performance, or whole-process peak memory.

The recommended first implementation work is trustworthy native inspection, import admission, and transparent GIF cropping. Evaluate dither-aware limiting separately before changing conversion output.
