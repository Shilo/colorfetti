# Master conversion and UX review

October 18, 2026. Use this document for implementation planning. It combines and supersedes the recommendations in the [conversion and UX review](2026-10-18-conversion-and-ux-review.md) and [independent Codex review](2026-10-18-codex-conversion-and-ux-review.md); the originals remain historical inputs.

The coordinator and one independent sub-agent challenged both reviews against source, product contracts, fresh conversion probes, independent image decoding, and a frozen production build. Several findings survived, but several proposed fixes did not. **Do not implement the original reviews as checklists.**

## Recommended work

| ID | Priority | Recommendation | Readiness |
| --- | --- | --- | --- |
| M1 | High reliability | Bound decoded artwork memory before expansion and publication | Confirmed need; define budget and ownership policy before implementation |
| M2 | High output confidence | Disclose sampling and provide bounded native-pixel inspection | Confirmed need; native inspection needs a scoped design |
| M3 | Medium, small fix | Preserve useful import errors and distinguish invalid dimensions from size limits | Ready for scoped implementation |
| M4 | Medium output integrity | Preserve ANIMEXTS1.0 GIF repeat metadata | Ready for scoped implementation |
| M5 | Medium, small fix | Correct enabled palette-editor text contrast in light theme | Ready for scoped implementation |
| M6 | Medium, small fix | Make individual and ZIP output names portable | Ready for scoped implementation |
| M7 | Medium export value | Crop transparent GIF frame bounds | Demonstrated prototype; integrate and complete encoder coverage |
| M8 | Lower export value | Compact PNG states, including exact indexed alpha | Demonstrated encoding opportunities; integrate with bounded work |
| R1 | Next quality experiment | Account for effective dithering during color-limit selection | Reproduced tradeoff; replacement policy needs evaluation |
| R2 | Next performance experiment | Test a bounded exact-key dither memo | Promising prototype; no browser/phone speed promise |

First make the small corrections M3–M6. In parallel, specify M1 and M2. Then implement M7 and evaluate M8. Keep R1/R2 separate from those corrections so conversion-quality changes and performance changes can be assessed independently.

## Confirmed findings and implementation requirements

### M1 Decoded artwork needs an admission budget

A fresh run accepts a valid **51,751-byte, 512×512, 64-frame GIF** and retains **117,571,584 bytes, or 112.1 MiB**, in source and analysis buffers alone. No crash was induced. The measured storage excludes previews, decoder overhead, temporary copies, and other wall images.

Artwork decoding defaults to unlimited pixels and prepares the full animation before transferring frames. Palette-import limits and the 8 MiB preview index cache do not bound artwork memory.

**Solution:** Preflight GIF geometry/frame count before expansion; reserve estimated decoded storage against the live wall and pending imports. Enforce still-image limits before application-sized RGBA/analysis allocations where the native API permits. Native decoding can itself allocate before dimensions become available, so this cannot promise a universal process-memory ceiling. Include retained and temporarily overlapping analysis storage in the policy. A compressed-byte limit alone is inadequate.

**Acceptance:** Worker and fallback paths enforce the same policy; concurrent reservations cannot oversubscribe it; cancellation, failure, removal and teardown release reservations; failed imports preserve existing images. Choose the budget with device measurements. Frame reduction/resizing is optional future UX, not required to introduce admission checks.

Source: `src/lib/gif.js`, `image-import-worker.js`, `image-import-client.js`, `image-decode.js`. Evidence: `root/results.json`, case `compressed-animation-expansion`.

### M2 Separate overview appearance from native inspection

The sampling problem is real. With production `shown()` sizing, a uniform #808080, 1024×128 source using Black & White and 4×4 dithering at 100% exports **25% white** but previews **0% white** at 256×32. Existing near-integer-ratio mitigation is included. Long clips can also remain sampled at maximum zoom because refinement is bounded across the clip.

However, the proposed output-coordinate one-line fix is **not a complete solution**. A fresh structured source exports 47.65625% white; current sampling shows 18.75%, while output-coordinate dithering shows 0%, worsening the discrepancy. Another probe changes 194 of 391 samples relative to their actual export coordinates. Current source-coordinate matching correctly preserves those individual sampled pixels; it does not guarantee integrated visual appearance.

**Solution:** First show when inspection remains sampled. Add native-pixel inspection of a selected paused frame or bounded source region. Reuse the original whole-image/whole-clip Auto palette, Max subset, full analysis and frozen Cleanup decisions; recomputing them from a crop would change conversion. Preserve original coordinate offsets for dither phase and contextual operations. Treat phase-aware/area-aware overview rendering as a separate experiment. Do not allocate a full-resolution converted clip to fix inspection. Copy retains its existing first-frame behavior unless a separate current-frame action is deliberately designed.

**Acceptance:** Native inspected pixels agree with independently decoded Save output at the same source coordinates. Cover cap, Cleanup, alpha, matching, dither strength, noninteger ratios, long sheets, DPR changes, pan/zoom refinement, frame selection, cancellation and stale work. Define and measure a scratch-memory bound. An optional overview strategy must test spatially correlated sources, not just uniform patches or gradients.

Source: `src/lib/layout.js`, `quantize.js`, `palette-dither.js`, `viewer-layout.js`, `Tile.svelte`, `ImageViewer.svelte`. Evidence: `independent/kernel-results.json`, `root/crosscheck.json`; the earlier zoom observation remains in `bench/app-review-2026-10-18/ux/ui-receipt.json`.

### M3 Report the actual import failure without weakening decoding

`App.svelte` discards decode-error causes and filenames, then shows the supported-format list. A malformed PNG or GIF consequently receives little useful recovery guidance. Separately, a GIF with zero logical width reports “This image is too large.”

**Solution:** Preserve bounded per-file failure details, classify invalid geometry separately from exceeded limits, and provide concise recovery guidance. Retain successful additions and cancellation semantics. Aggregate large batches rather than creating unbounded error text.

**Acceptance:** Distinguish damaged data, unsupported content, size/admission rejection and download failures; report the relevant filename; cancel quietly; keep valid items in a mixed batch.

**Do not combine this with automatic tolerant GIF decoding.** Fresh probes confirm rejection of missing LZW termination and out-of-screen patches while Sharp accepts them. For the latter, Sharp enlarges the image instead of simply clipping it. The [GIF89a specification](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) requires image rectangles within the logical screen and an LZW end code. Viewer acceptance does not establish a unique faithful repair. Keep strict defaults; any explicit partial-recovery feature requires a separate design and must disclose changed content/timing.

Source: `src/App.svelte:659`, `:670`; `src/lib/gif.js:45`, `gif-decode.js`. Evidence: `root/io-stencil-results.json`, cases `zero-logical-width-message`, `strict-missing-eoi`, `strict-outside-screen`.

### M4 Preserve ANIMEXTS1.0 repeat metadata

Changing only a valid loop extension identifier from NETSCAPE2.0 to ANIMEXTS1.0 makes the current decoder return `loop:null`. Independent Sharp decoding treats both sources as **three total plays**; saving through the current exporter changes the ANIMEXTS input to **one play**. Pixels are unchanged. This is actual export-metadata loss, distinct from the intentionally looping wall preview.

**Solution:** Recognize the alias through bounded, framing-aware application-extension parsing shared by artwork and palette GIF acquisition. Preserve existing NETSCAPE behavior and explicit errors; do not globally search/replace bytes. [Skia's decoder](https://skia.googlesource.com/skia/+/19b91531e912283d237435d94516575b28713cba/third_party/gif/GIFImageReader.cpp) recognizes both identifiers.

**Acceptance:** Infinite and finite repeat counts, no loop extension, comments containing fake identifiers, split/truncated sub-blocks, conflicting/repeated extensions, single-frame semantics, and independent decoded Save/ZIP loop metadata. State whether a field represents repeats or total plays; the two are not interchangeable.

Source: `src/lib/gif.js` and its omggif metadata boundary. Evidence: `root/io-stencil-results.json`, `animexts.gif`, `animexts-export.gif`.

### M5 Fix enabled text contrast in the palette editor

Fresh browser checks of the frozen current build found light-theme enabled **Save palette text at 2.259:1** and unselected, enabled import-method text at **3.430:1**, after alpha composition. Dark-theme equivalents were 6.942:1 and 5.123:1. These are enabled controls, not exempt disabled empty-draft buttons. Their measured text sizes require 4.5:1 under [W3C G18](https://www.w3.org/WAI/WCAG21/Techniques/general/G18).

**Solution:** Adjust app-scoped text tokens against the actual backgrounds, preserving the palette colors themselves and global styling architecture.

**Acceptance:** At least 4.5:1 for these enabled labels in both themes and relevant selected/hover/focus states. Check phone layouts, forced colors, and related shared controls. The numbers above come from desktop computed colors and composition, not a physical-phone or screenshot-pixel audit.

Source: `src/palette-import.css`, `PaletteImport.svelte` and inherited segmented-control text tokens. Evidence: `independent/ui-receipt.json`.

### M6 Sanitize portable output names before resolving collisions

Fresh Windows extraction omits ZIP entry `a:b-colorfetti.png`. Such a source name can come from a URL even when the local filesystem would not permit it. The shared Save/ZIP naming helper sanitizes slash characters only; the export-drag path already adds Windows-forbidden character and control-character sanitation.

**Solution:** Centralize portable filename normalization, covering forbidden characters, control characters, trailing spaces/dots and reserved names, before case-insensitive collision resolution. Reuse it for Save, ZIP and drag exports, and any clipboard transport that actually supplies a filename. Keep original display names intact.

**Acceptance:** Real Windows ZIP extraction succeeds; normalization-created collisions remain distinct; Unicode and empty names work; extensions match actual PNG/GIF output. Do not merely trust the browser's individual-download filename cleanup.

Source: `src/lib/save.js:14`. Evidence: `root/filename-portability.json` and its PowerShell reproduction.

### M7 Crop transparent GIF bounds before attempting temporal differencing

Fresh reconstruction through the **current Palette GIF writer**, followed by transparent-bound cropping, produced:

| Workload | Full frames | Cropped frames | Saving |
| --- | ---: | ---: | ---: |
| animation128 nearest | 12,752 B | 6,753 B | 47.0% |
| animation128 enhanced | 13,559 B | 7,659 B | 43.5% |
| animation256 nearest | 29,510 B | 10,089 B | 65.8% |
| animation256 enhanced | 30,860 B | 11,419 B | 63.0% |

Independent Sharp checks verify visible RGB, every alpha byte, dimensions, frame count, delays and loops. Two additional cases cover empty frames, an empty first frame, movement to an edge and shrinking content. Reconstructed full files have the same lengths as historical workload files but **different encoded bytes**; decoded visible output and metadata match. Hidden RGB under alpha zero is not asserted identical.

**Solution:** Integrate transparent-bound cropping while retaining disposal 2 and logical dimensions. Handle fully empty frames with a valid transparent placeholder. Start with the Palette writer; legacy 1-bit/None remapping requires its own integration tests. Avoid unnecessary table expansion and preserve the full-frame path when cropping offers no benefit.

**Acceptance:** Independent decoded parity for both families before enabling both; empty and edge cases; transparency and 255/256-color boundaries; finite loops; worker backpressure, cancellation, hover export and atomic ZIP behavior. Measure encoding cost and scratch separately from file size.

Temporal changed-rectangle encoding is a second phase. The earlier 38–76% range is not adopted as a universal claim. A fresh authored opaque-motion probe separately demonstrates 88.9% savings, but disposal/transparency transitions need broader coverage before shipping that approach.

Source: `src/lib/gif.js`, `palette-gif-worker.js`. Evidence: `root/crop-results.json`, `crop-probe.mjs`, `results.json`.

### M8 Compact PNG output states without changing RGB or alpha

Two independent opportunities survived:

- **Palette Keep:** An authored 128-state RGBA fixture shrinks from 386,902 to 231,798 bytes, **40.1%**, using exact indexed alpha and the same fflate compressor at level 3. Independent decoding matches every RGBA byte. The earlier 231,039-byte/40.3% reference used Node zlib; the controlled comparison removes that compressor difference. Encode `(target index, alpha)` states when at most 256 states exist; otherwise retain RGBA. Do not merge colors or round alpha. [PNG supports a per-entry alpha table](https://www.w3.org/TR/png-3/#11tRNS).
- **Legacy 1-bit family:** Actual output with at most two RGBA states can use 1-bit indexed storage. Fresh opaque fixtures through a compact encoder shrink by 14.75–38.30%. This comparison also changes palette/chunk layout and adds sRGB, so the savings cannot be attributed solely to bit depth or generalized to every sprite. The current legacy writer omits sRGB metadata.

**Acceptance:** Count emitted states, including transparency, rather than checking only whether either ink is None. Three emitted states still require two index bits. Preserve all visible RGB and alpha, the legacy None/transparent-RGB convention used to avoid fringes, low-alpha cases, exact RGB caption semantics, duplicate RGB with different alpha, odd row widths and the 256/257-state boundary. Bound/cancel scans and packing, retain async compression policy, and measure tiny-image overhead. Confirm intended sRGB tagging in both families; this is metadata consistency work, not a demonstrated universal display-color defect.

Source: `src/lib/save.js`, `palette-export.js`. Evidence: `root/results.json`, `png-compressor-results.json`, `io-stencil-results.json`. No encoding change should alter palette generation or matching.

## Experiments to evaluate separately

| ID | What is established | Recommendation and gate |
| --- | --- | --- |
| R1 Dither-aware cap | At Grayscale 8, #808080 and 8×8/50% or 100%, All emits two colors while Max 2 selects one and disables the mixture. Max remains a correct upper bound. | Prototype bounded useful-endpoint selection/filling only when dithering is effective. Preserve Off behavior, membership and alpha. Include new dither dependencies in worker/cache/failure/snapshot identities. Compare spatial appearance, point error, artist preference, duration-weighted GIF stability and device cost. |
| R2 Exact-key dither memo | Current memo can abandon later repetitions. A fresh 512 KiB/job direct-map prototype preserved outputs in eight selected cases; smooth synthetic blocks showed about 3.1× Node CPU benefit, distinct RGB around 1×, with variable or adverse other timings. | Do not promise 4–10× or replace the cache yet. Require paired browser/phone measurements on sprites, smooth sources and real noisy photos; tiny-source regressions, concurrent scratch, sync/async slicing, collisions, cancellation and exact output-byte parity. |
| R3 Local GIF tables | Current global-table restriction rejects a clip with 256 opaque colors overall plus transparency, although each frame uses only 128 opaque colors. A 1,907-byte local-table reference decodes exactly. | Useful capability extension if this limit matters in real workflows. Retain global fast path. Test per-frame mapping, table scope, disposal/background, worker protocol and bounded memory. It cannot solve one frame needing 256 opaque colors plus transparency. |
| R4 Explicit source mapping | Editing the allowed target set can merge regions; retaining source assignments enables a different precise recoloring workflow. | Prototype source → target rules with clear scope, cap conflicts, dither/Cleanup precedence, persistence and frame behavior. This is a product capability, not a nearest-matching defect. |

## Corrections and recommendations not ready to implement

| Original claim or proposed change | Master disposition |
| --- | --- |
| One-line output-coordinate dither fix | Discrepancy confirmed, universal solution rejected by fresh counterexample. It may be an overview experiment, never a substitute for native inspection. |
| Eight candidates should fix most banding | Fresh 72 cases use 12 hash-verified Kenney sprites × PICO-8/ENDESGA 8/DawnBringer 16 × strength 50/100, all with 4×4 dithering. They improve 4×4 block error in 22, worsen 30 and tie 20. Point error worsens 52 and improves none. Keep experimental; lower pair-objective error is not artist preference. |
| Knoll hybrid at a particular palette size | Screenshots are visual evidence, but the claimed contour/error thresholds lack a retained runnable implementation and raw measurements in the input review's evidence directory. Rebuild a controlled prototype before selecting a cutoff or changing defaults. No legal conclusion is carried forward. |
| Stencil flicker is fixed by unified thresholds | Fresh default-Stencil witness flips all 64 unchanged subject pixels, yet shared and sprite thresholds are already 80 in both frames. The body median changes 180 → 20. Threshold unification cannot fix that witness; replacing the median can break the fewer-than-half-interior protection. Stencil is excluded from the general threshold documentation and has an explicit per-frame sprite exception. Document the temporal limitation; a stable alternative needs its own design. |
| Play-once GIF repeating on the wall is an export bug | Wall looping is an explicit product contract; exports preserve recognized repeat metadata. Optional Pause/frame-step/Loop/Replay controls belong to inspection design. ANIMEXTS loss in M4 is the separate true metadata defect. |
| Palette vertical wheel/arrows are broken | Full Palette intentionally has no vertical style axis. Remapping both axes to palettes is a product change, not a one-line defect repair. Preserve scroll, dialog, input and pinch guards if changed. |
| Space on Preview buttons is accidental keyboard breakage | Space is explicitly reserved for comparison, including toolbars; Enter works. Native Space activation on toolbar buttons would improve consistency with the W3C button pattern, but requires an explicit shortcut/spec change and release/blur tests. Do not claim all keyboard access fails. |
| Editor dismissal without dirty warning corrupts saved work | Closing cancels the draft and preserves saved originals by design. Optional draft recovery/discard protection is useful, but existing `edited` is insufficient: it ignores names and resets after imports. Track real draft state before adding any guard. |
| Help focus-to-More; first-image Ctrl+C; missing Ctrl+S/O | Existing contracts or feature absences. Change only with deliberate focus/shortcut rules, text-selection/input safeguards and updated Help. |
| Compare pill, seven tile tab stops, missing Undo, palette suffixes in filenames | Plausible improvements, not proven failures. Validate comprehension/navigation before changes. Undo retains decoded data and must participate in M1; palette suffixes must use M6 sanitation and captured export settings. |
| Settings Reset only describes 1-bit | Current wording is broad, not literally 1-bit-only. More explicit conversion-setting copy is optional. Lospec slug wording and Palette settings/Recolor naming can be corrected narrowly for consistency. |
| Animated PNG/WebP and AVIF | Non-GIF animation flattening is the existing contract; clearer first-frame/GIF-only animation guidance is useful. Full animation support or an AVIF native path is additional capability requiring format, alpha/profile and fallback tests. |
| Integer export upscale | Explicitly excluded by the current spec. Consider separately if sharing workflows justify it; keep 1× default, exact nearest replication, dimensions/timing and size limits. Blanket social-site rejection/blur claims are not established here. |
| Lines noise sensitivity, different Otsu rules, tone fit, blue noise, new matching spaces, default dither strength | Neither review establishes enough preference and device evidence for a default change. Preserve current choices and prior rejected examples; do not infer universal superiority or universal uselessness from bounded proxy metrics. |
| Exact decoding of every profile/16-bit source and exactness of every codec | Overbroad. The defined still-image input is browser-managed visible 8-bit sRGB, not preservation of arbitrary original precision/profile/index bytes. Independent fixture checks establish the tested cases only. |
| Auto sometimes looks unchanged | Expected exact-color preservation when the source fits. A contextual explanation can help, but must use current evidence without extra scans or stale generation claims. |

Base-quantizer failure recovery remains a source-level hypothesis: its catch logs an error, unlike limiter/Cleanup recovery. No fresh fault-injected browser witness was established, so test the suspected retained-preview state before recommending a new failure gate.

## Implementation boundaries and verification

Preserve exact active-palette RGB, alpha policy, source-size exports, immutable gesture snapshots, cancellation, strict GIF validation, worker/fallback parity and atomic ZIP downloads. Keep generated palette policy and matching defaults unchanged during the small fixes. Update the behavior spec and relevant documentation in each later behavior-changing implementation.

Every implementation should have a narrow acceptance set tied to its finding. Decoded RGB/alpha/timing parity is the criterion for encoder optimization; historical byte identity is not required after a deliberate encoding change. Conversely, a cache-only change must retain exact conversion output. Record cost and quality separately; file-size savings do not prove faster rendering, and Node kernel time does not prove phone latency.

Fresh verification on runtime `6b9e290927066f5f361e6dfee174e7f557bf5665`: **68 test files, 1,186 passing tests, two existing skips; isolated production build passed.** During review, commits through `437e525` added review text/contact sheets only; runtime/dependency/build inputs were verified unchanged. The first input review gained contact-sheet links after its frozen copy; those exact documentation changes were checked and its claims remain unchanged. Browser checks used the frozen in-memory build at port 5196. No product source, dependency, configuration or specification edits were made by this master review.

Evidence directory: `bench/master-review-2026-10-18/`.

| Artifact | Purpose |
| --- | --- |
| `root/validation.json`, `unit-tests.txt`, `build.txt` | Input-review hashes, source/build hashes, runtime provenance and current test/build receipts |
| `root/finalize.mjs`, `final-verification.json` | Final source/build/input checks, examined input-link changes and final master-document hash |
| `root/inputs/` | Frozen copies of the two input reviews |
| `root/io-stencil-probe.mjs`, `io-stencil-results.json` | New GIF metadata/strictness, Stencil cause isolation and legacy PNG comparisons |
| `root/crop-probe.mjs`, `crop-results.json` | Current-writer and independently decoded crop comparisons, including boundary cases |
| `root/recheck-export-probe.mjs`, `results.json` | Fresh rerun of existing bounded memory/alpha/GIF export probes |
| `root/png-compressor-probe.mjs`, `png-compressor-results.json` | Exact indexed-alpha PNG comparison with the same compressor as production |
| `root/recheck-crosscheck.mjs`, `crosscheck.json` | Current application cap preparation and selected source-coordinate checks |
| `root/filename-portability.ps1`, `filename-portability.json` | Fresh Windows extraction reproduction |
| `independent/kernel-challenge.mjs`, `kernel-results.json` | Fresh phase counterexample, candidate-eight and exact-key memo experiments |
| `independent/ui-receipt.json`, `CHALLENGE.md` | Current-build enabled contrast, keyboard/draft observations and independent per-claim critique |

Run the named `.mjs` probes with Node from the repository root. Image comparisons use Sharp; scripts support `SHARP_MODULE` or ordinary module resolution. See the [evidence README](../../bench/master-review-2026-10-18/README.md) for dependency setup and probe ordering. Probe source and text receipts are versioned; generated images, screenshots, GIFs and ZIPs stay local and ignored. The 72-case study and crop comparisons depend on already tracked repository research fixtures. Historical recorder scripts deliberately refuse to overwrite existing receipts. Initial and repeated cache timings are retained; no favorable rerun was selected to imply a universal gain.

Limits: no new physical-phone/Safari/iOS acceptance, assistive-technology user study or whole-process peak-memory measurement. Visual proxy scores and synthetic counterexamples do not estimate real-world prevalence or replace artist evaluation. These limits constrain the recommendations above rather than preventing the confirmed small fixes.
