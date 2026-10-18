# Exact caption-count performance — October 17, 2026

## Decision

Count actual visible RGBs, excluding fully transparent pixels. A converted count
may stop once every color in its **prepared output palette** has occurred. This
is exact: later pixels or frames cannot add a color outside that palette. The
reported animation frame total remains the complete clip total. An Original count
cannot use the selected target palette as its stopping bound: the source may have
more colors than that palette.

For nearest matching without Cleanup or effective dithering, cache a compact exact
RGB/maximum-alpha summary of each immutable source frame. Repeated instances of
one RGB choose the same output entry; maximum alpha determines whether at least
one survives Cut, or is visible in Keep. Quantize one representative per eligible
RGB with the existing matcher and prepared palette. Do not implement another
nearest-color algorithm.

The summary accepts at most 4096 visible RGBs and retains five typed-array bytes
per color (at most 20 KiB per live source frame, plus object/WeakMap overhead).
Transient construction uses a bounded Map. More than 4096 RGBs stores a bypass
sentinel and uses ordinary exact conversion. No estimate is published. Summaries
are weakly owned by immutable originals and disappear with them; no converted
images, frame-index buffers or source copies are cached.

Cold summary requests use one serial queue and recheck the completed WeakMap
after waiting. Simultaneous Original/output requests therefore share one completed
scan. Each caller owns cancellation: a canceled queued request is removed without
source access, and an aborted active owner leaves no cached partial result or
failure for an independent waiting caller. Deadline checks occur every 2048
pixels with an 8 ms target; this is cooperative scheduling, not a hard browser
latency guarantee.

The separate `cold-scheduling.mjs` Node timer probe observed an 18.96 ms maximum
timer gap on its first cold-engine 2048×2048 eight-RGB scan; subsequent fresh-source
trials observed 8.13–8.20 ms gaps. Reducing the deadline-check block to 2048 pixels
does not eliminate JIT/scheduler overshoot. Physical-browser acceptance is still
required, and the 8 ms target must not be described as a hard upper bound.

Cleanup and nonzero dithering depend on position and neighborhoods, so they use
the unchanged full conversion path. Their union may still stop after proven
prepared-palette saturation. Auto, limit fitting and Cleanup preparation remain
shared with export and can still be the dominant cost.

## Evidence

Run `node bench/count-speed-2026-10-17/benchmark.mjs`. The benchmark compares actual
usage inspection with full export conversion and index-union reference results.
All results agree. Inputs reuse the licensed practical-workload cohort and an
owned 16,384-RGB counterexample; decoding is outside timing. Each median has five
trials after engine warmup. Cold-source trials use fresh immutable wrappers to
avoid summary-cache hits. These are Node kernel timings, **not browser frame-rate
or physical-device claims**.

Resurrect 64, Oklab, All, Cut 128, nearest, milliseconds:

| Input | Full conversion reference | Cold source | Cached source |
|---|---:|---:|---:|
| 2048×2048 real sprite sheet | 37.09 | 11.71 | 0.11 |
| Genuine 32×32, 6-frame GIF | 0.28 | 0.33 | 0.39 |
| 128×128, 32-frame motion assembly | 3.38 | 1.26 | 0.51 |
| 256×256, 48-frame motion assembly | 17.19 | 4.91 | 0.69 |
| 128×128, 16,384 RGBs | 2.76 | 2.93 | 2.78 |

ENDESGA 32 also matched exactly. The tiny native GIF has approximately 0.1 ms
additional overhead, while the high-entropy cold probe costs approximately 0.17 ms;
neither is evidence of a meaningful interaction regression. Dense photographic
sources continue to require full conversion, and arbitrary huge animations are
not promised a fixed memory or latency bound.

## Verification

Focused suite: 52 passing tests across summary, palette usage, palette state and
the integrating Original-count helper (42 tests in the first three files).
Coverage includes maximum-alpha eligibility at Cut 1/64/128/255 and Keep; RGB and
Oklab; capped palettes; Cleanup; effective/zero-strength dither; empty output;
4096/4097-RGB boundary; cancellation before cache reuse and during cold scans;
simultaneous same-source requests and independent queued cancellation;
invalid-opacity validation even on empty output; whole-clip union parity; a later source-frame getter proving saturation skips
remaining conversion while retaining the original clip frame total. Existing
export return behavior and captured immutable settings remain unchanged.

Desktop/Android integration, all-wall scheduling, Original counts, 1-bit counts
and caption lifecycle are owned by the coordinating task and must be accepted
separately. The helper does not itself schedule wall work or change UI policy.
