# Actual used colors in 1-bit captions

Date: 2026-10-17. Task 3 implementation helper; integration and device acceptance are owned by the parent task.

## Decision

Count unique visible RGB colors actually produced by the mask, excluding transparent pixels. Two enabled inks do not guarantee two used colors. A solid silhouette can use one; two equal RGB inks are one; either ink set to None contributes no color. An entirely transparent result is zero colors. GIF captions describe the union across the complete animation, matching the existing Palette count semantics and avoiding per-frame caption flicker.

The user's proposed early stop is valid once every distinct visible output ink has been observed. This is a correctness bound, not a heuristic. With two distinct opaque inks, finding both means later pixels and frames cannot increase the count. With one visible ink, finding that ink suffices. With both None, no mask is needed. When a possible ink is absent, the complete relevant source must still be checked.

## Implementation

`onebit-usage.js` adds a weak per-analyzed-frame cache containing only role-presence bits for its latest style/settings. It retains no mask or converted pixels. An exact Tile mask can call `rememberOneBitMask`; sampled masks must not be submitted. Ink edits can reuse role bits without generating another mask. Cache keys include the style and captured settings; changed analyses naturally have new weak identities.

`collectOneBitUsage` captures inks/style/settings into one serial queue, uses the same reanalysis preparation as exports, and yields before a missing full-resolution mask. Canceled queued requests are removed before preparation. It rechecks the metadata cache after yielding because a Tile might have completed an exact mask in that turn. GIF work stops after all possible visible RGB inks are found, while the returned `frames` still describes the whole animation. Cancellation is checked before preparation, before each mask and before publication. The parent must guard stale ownership, analysis readiness and source changes.

Sampled masks are not exact full-source evidence. For example, Bayer, Hatch, Noise and Atkinson are redrawn at sampled dimensions; they are not merely sampled full masks. Even a sampled presence lower bound cannot be assumed to apply to full-source output. The helper therefore never generates a count from a sampled mask.

## Evidence and limits

Nine focused unit tests pass, including all eleven styles compared against independently enumerated visible RGBA from the existing `colorize` output; None/equal inks, empty and solid masks; complete animation union; saturation without visiting a later frame; cache reuse across ink edits; sampled-mask rejection, cancellation and serialized jobs with queued cancellation.

Run the retained host benchmark with `node bench/onebit-caption-counts-2026-10-17/check.mjs`; numbers are in its `result.json`. A sparse 2048×2048 sheet's existing full masks took roughly 6.5–90 ms across the eleven styles on this host. Role scanning added less than 0.063 ms when both roles appeared early; a one-role silhouette required a full byte scan, about 4 ms. A result from cached role metadata took roughly 0.025–0.263 ms. A 256×256, 32-frame clip usually saturated after its first frame; most measured counts took 1.6–3.5 ms versus 13–51 ms to build all frame masks. The first Solid case took 13.5 ms including host scheduling and possible GC, so the single run does not establish a uniform speedup.

These are Node host measurements, not desktop or phone frame rates. A cold Icon full mask took about 90 ms and remains synchronous; merely yielding before it does not eliminate that long task. This helper changes no conversion algorithm or existing export behavior. Parent integration must measure practical desktop/mobile responsiveness and should not claim that a whole-image task is cooperatively sliced. Browser/device acceptance remains pending here.
