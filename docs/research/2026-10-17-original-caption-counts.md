# Original comparison caption counts — October 17, 2026

## Decision

The caption should describe the displayed mode. Original comparison uses an exact source RGB count, cached independently from palette conversion settings. It must never display the converted count as an Original count while loading. No new setting or interactive count button is needed.

The number for an animation is the union across its complete clip, matching the converted caption's existing semantics. It does not jump on each animation frame. The caption tooltip must explain this scope.

## Semantics and challenge

- Count distinct RGB values that occur with alpha greater than zero. Repeated RGB at different nonzero opacities remains one color. Invisible RGB values do not count.
- A completely transparent source reports **0 colors**. Callers must not hide a valid result by testing `result.count` for truthiness.
- Original count is independent of Matching, Max colors, selected palette, Cleanup, dithering and Cut/Keep. An original can contain more colors than its selected target palette, so stopping at the target's size would give a false answer.
- Early termination is possible only at all 16,777,216 RGB values. It is not a practical shortcut for ordinary source artwork.
- These are browser-decoded source colors. Native decoder/profile differences remain the established import boundary; this helper does not re-decode files or read canvas pixels.

## Implementation contract

`src/lib/original-color-usage.js` exports:

```js
peekOriginalUsage(item) // frozen {count, frames}, or null
collectOriginalUsage(item, {signal}) // Promise of that same result
```

Cache identity is the ordered weak sequence of immutable source `original` objects, rather than analyzed item/frame wrappers. Reanalysis, layout, settings and Space toggles therefore reuse a settled count. Different frame sequences cannot reuse another clip's answer. The weak keys do not keep removed source buffers alive.

Cold work starts on a posted task and uses one serial queue. Concurrent consumers of the same source share the pending job. Canceling one consumer preserves another consumer's job; canceling the last consumer aborts it, including queued work. A canceled or failed job never caches a partial result. Failed jobs do not block the queue.

Counting reuses the shared bounded source summary, which preserves up to 4,096 visible RGB values per source frame. A small union uses a Set; larger unions promote to an exact 24-bit RGB bitset, allocating a fixed transient **2 MiB**, regardless of the source's pixel count. The bitset and temporary union are discarded when counting finishes. This module retains only the scalar result. The shared summary's separate per-frame cache remains bounded by 4,096 RGB/max-alpha entries and weak source identity.

For high-entropy pixels, the exact fallback scans in 8,192-pixel blocks with an approximately 8 ms posted-task target. This is cooperative main-thread work, not a worker or a hard latency guarantee. There is no duplicated image, RGBA clip, palette quantizer or converted frame cache.

Integration belongs to the parent task: precompute cooperatively when source identity becomes live, choose this result only while the tile displays Original, and publish only for the captured current source. A cold Original caption can be pending until its exact result is known; it must not borrow an output count.

## Validation

Ten unit cases cover transparent pixels, alpha-variant deduplication, source counts above the selected palette size, zero colors, GIF union, reanalysis identity, distinct clip identities, warm no-byte-read reuse, high-entropy fallback, union promotion, independent subscriber cancellation, queued cancellation/retry, cached cancellation and failed-job recovery.

`bench/original-caption-counts-2026-10-17/check.mjs` compares every result against an independent plain Set oracle over the source bytes. It also performs 1,000 warm peek/collect pairs per case. The recorded Node results are:

| Source | Exact count | Cold time | 1,000 warm pairs |
|---|---:|---:|---:|
| 2048×2048, 8 RGB values | 8 | 33.94 ms | 1.06 ms |
| 2048×2048, high entropy | 3,947,580 | 22.60 ms | 3.82 ms |
| 128×128, 32 frames | 32 | 5.77 ms | 2.14 ms |
| 256×256, 48 frames | 64 | 20.05 ms | 2.54 ms |

The cold low-color case had a 17.48 ms maximum timer gap, including first-use execution/JIT. Other maximum timer gaps were at most 8.43 ms. These Node timings establish helper behavior only; they are not Android or browser input-latency measurements. Integrated Codex Browser and physical Android validation remains the parent task's responsibility.

## Remaining risks to verify in integration

1. No stale converted count during local tile hold, global Space, Compare, settings changes or source removal.
2. Preserve the existing whole-clip count rather than updating it per frame.
3. No source rescans on repeated comparison; initial cooperative counting must not aggregate input stalls across a practical wall.
4. The same source-summary module can also serve conversion inspection. Its cold work can overlap with another caller; practical device measurements must judge that overlap rather than assuming cache hits.
5. Original and converted output can legitimately have the same count; that alone does not prove a mode-switch test is correct. Use a fixture whose source and output counts differ.
