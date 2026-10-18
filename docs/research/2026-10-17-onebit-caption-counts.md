# Actual used colors in 1-bit captions

Date: 2026-10-17. Task 3 implementation helper; integration and device acceptance are owned by the parent task.

## Decision

Count unique visible RGB colors actually produced by the mask, excluding transparent pixels. Two enabled inks do not guarantee two used colors. A solid silhouette can use one; two equal RGB inks are one; either ink set to None contributes no color. An entirely transparent result is zero colors. GIF captions describe the union across the complete animation, matching the existing Palette count semantics and avoiding per-frame caption flicker.

The user's proposed early stop is valid once every distinct visible output ink has been observed. This is a correctness bound, not a heuristic. With two distinct opaque inks, finding both means later pixels and frames cannot increase the count. With one visible ink, finding that ink suffices. With both None, no mask is needed. When a possible ink is absent, the complete relevant source must still be checked.

Silhouette has a stricter proven bound: its fixed threshold is 255, so it never emits its second ink. A sampled visible first-ink pixel therefore establishes one color even with both inks enabled; first ink None establishes zero without conversion. An empty sample alone still cannot establish whether an opaque first ink is used elsewhere.

## Implementation

`onebit-usage.js` adds a weak per-analyzed-frame cache containing only role-presence bits for its latest style/settings. It retains no mask or converted pixels. An exact Tile mask can call `rememberOneBitMask`; sampled masks must not be submitted. Ink edits can reuse role bits without generating another mask. Cache keys include the style and captured settings; changed analyses naturally have new weak identities.

`collectOneBitUsage` captures inks/style/settings into one serial queue, uses the same reanalysis preparation as exports, and yields before a missing full-resolution mask. Canceled queued requests are removed before preparation. It rechecks the metadata cache after yielding because a Tile might have completed a mask in that turn. GIF work stops after all possible visible RGB inks are found, while the returned `frames` still describes the whole animation. Cancellation is checked before preparation, before each mask and before publication. The parent must guard stale ownership, analysis readiness and source changes.

### Performance correction after integration review

The first implementation allowed an extra full-source mask at any size. Review reproduced incremental long tasks after an already sampled wall render, so that policy was rejected. Automatic fallback now builds a missing full mask only up to **262,144 source pixels per frame**. Larger sources use already cached exact role metadata or a proven presence bound from existing rendering; otherwise inspection returns **null (unknown)**, never zero or a guessed count. It also refuses to trigger mismatched large source reanalysis. The parent must clear a stale retained caption when this bounded inspection terminates unknown, and can retry after new rendering metadata appears.

`rememberOneBitSample` accepts only Cutout, Solid, Lines, Stencil, Icon and Silhouette, whose sampled pixels have the same role as the corresponding full-source coordinate. Sampled role presence is a lower bound; it becomes an exact count only after every possible visible RGB ink has appeared, including across frames. A sampled mask showing one of two possible colors is insufficient. Full-size masks remain exact for every style.

Checker, Bayer, Hatch, Noise and Atkinson are redrawn at sampled dimensions; they are not merely sampled full masks. Even sampled presence is unsafe for their full-source output. Their sampled masks are rejected, so large outputs can legitimately omit the caption count until exact cached evidence becomes available. No conversion algorithm or slider behavior changes to make counts easier.

## Evidence and limits

Fourteen focused unit tests pass, including all eleven styles compared against independently enumerated visible RGBA from the existing `colorize` output; None/equal inks, empty and solid masks; complete animation union; saturation without visiting a later frame; cache reuse across ink edits; cancellation and serialized jobs with queued cancellation. Additional tests compare actual sampled mask pixels with their full-source coordinate for all six accepted pointwise styles, with multiple settings and sample sizes that cross Lines' alternate thickness implementations. Large-source getter tripwires prove missing masks and reanalysis are never called, partial evidence stays unknown, saturation works, pattern/diffusion samples are rejected and exact cached large roles remain usable. The Silhouette-specific bound has a separate large-source test for first None and for sampled first-ink presence with both inks opaque.

Run the retained host benchmark with `node bench/onebit-caption-counts-2026-10-17/check.mjs`; numbers are in its `result.json`. After the bound, missing 2048² metadata inspection took about 0.02–0.21 ms per style in warm host measurements, with the first posted-task startup about 12 ms. Counts from saturating existing pointwise samples took about 0.02–0.07 ms. Missing large metadata produced null, with no new full mask. The benchmark also times existing full-mask generation separately; these timings are not automatic caption work. A 256×256, 32-frame clip usually saturated after its first frame, measured about 0.5–3.3 ms versus 10–48 ms to build every frame mask.

These are Node host measurements, not desktop or phone frame rates. Earlier cold full Icon preparation took about 90 ms; merely yielding before it did not eliminate that long task, motivating the bound. Small automatic fallback remains synchronous within one frame and this does not promise a time budget on every phone. This helper changes no conversion algorithm or existing export behavior. Parent integration must measure practical desktop/mobile responsiveness. Browser/device acceptance remains pending here.
