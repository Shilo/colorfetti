# Caption count acceptance — October 17, 2026

Baseline: `5794b26`. Scope: accurate, responsive, efficient plain caption metadata;
no conversion-algorithm changes, no automatic cap or color-protection UI.

| Task | Owner | Status / evidence |
|---|---|---|
| Disappearance and cancellation | count_reliability | Complete: automatic exact Palette counts, retained pending captions, strict current Reuse |
| Responsive order and anchored dimensions | caption_layout | Complete: 20 isolated geometry combinations plus integrated desktop/touch/phone checks |
| Actual 1-bit counts | onebit_counts | Complete within bounded policy: actual 0/1/2, rendering proofs, large unknowns never guessed |
| Original comparison | original_counts | Complete: cached source union, Compare/Space/hold and native phone verified |
| Fast exact counts and safe early stopping | count_speed | Complete: bounded summary, serial cancellation, exact prepared-palette saturation |
| Empty-wall example | demo_counts | Complete: shared component/pipeline; theme, Original, import/removal and responsive tests |
| Slider efficiency marker | slider_marker | Deferred: counterexample proves count is not a no-change threshold; `3f55dde` |
| Combined adversarial review | integrated_review | Two rounds: reproduced large 1-bit overhead fixed; docs reconciled; final UI retest passed |
| Codex Browser | root | Complete: actual Original, demo, source import, 2048 Palette count26→25 on Matching and 1-bit count2 |
| Physical USB Android | root | Complete: native portrait practical wall, caption settings stability, Original, GIF/None and independently decoded PNG |

## Semantics

- Count actually used RGB values, excluding fully transparent pixels; alpha
  variants of one RGB count once. Zero is a valid result.
- GIF captions describe the complete clip's color union, avoiding per-frame flicker.
- Original and converted output have separate caches. A source may exceed target
  palette capacity; never stop its count at the selected palette's size.
- Output early stopping needs proof that all possible distinct output colors have
  appeared. Requested cap alone does not supply that proof.
- A sampled preview is never presented as an exact full-source count. Retained
  previous output is marked busy while current inspection is pending; Reuse only
  consumes the current exact result.
- Preserve export pixels, delays, alpha, subset selection, Cleanup and dithering.

## Acceptance

Check tiny/large stills, practical batches and real animation; rapid settings,
palette/family switches, Original via Space/hold/Compare, Preview round trips,
Reuse joins, cancellation/removal, zero output, theme-switching demo and
portrait/landscape geometry. Use independent source/export decoding for counts.
Record cold costs as well as cache hits. Do not claim device coverage from Node
or touch emulation. Commit each feature separately; never push/deploy implicitly.

## Final evidence and remaining limits

See [acceptance report](2026-10-17-caption-acceptance.md), the independent integrated
review, and `bench/caption-acceptance-2026-10-17/`. Full suite: 1050 passed, two
GC-dependent tests skipped. No deployment/push performed.

- Large 1-bit pattern images may have no count until existing exact rendering
  supplies it. This is deliberate performance protection, not an estimated count.
- Native Android was portrait (448×819); landscape was checked with touch browser
  emulation. No new physical-rotation, Safari, macOS or iOS result is claimed.
- Automatic Palette Cleanup/dither counts still do real cooperative conversion.
  Cache-hit timings do not establish a hard latency bound on all devices/artwork.
- The slider marker is explicitly deferred, not a remaining implementation defect.
