# M8 — exact PNG compaction

## Finding and chosen behavior

Partial Keep originally always wrote RGBA8, even when its actually used RGB/alpha combinations fit an indexed PNG. The authored 512×512/128-state fixture is 386,902 bytes with the existing fflate level-3 compressor. Exact indexed output is 231,802 bytes (40.1% smaller), with every stored RGBA byte unchanged.

Palette partial Keep now validates the entire input, writes the existing RGBA baseline, and considers an indexed candidate with at most 256 used `(target index, alpha)` states. EMPTY has its own lookup slot and RGBA 0,0,0,0. A 257th state keeps the byte-identical RGBA baseline. The candidate uses minimum 1/2/4/8-bit indices and exact per-entry tRNS; it replaces RGBA only when the complete PNG is strictly smaller. Ties retain RGBA. Binary Palette output, including its existing hidden-RGB convention at empty pixels, remains byte-identical.

The complete-size gate matters: a retained 49-pixel/two-alpha fixture produces 109-byte RGBA versus 118-byte indexed PNG. Both are exact, and shipping output remains 109 bytes. PNGs at or below the absolute indexed-partial floor of 104 bytes skip lookup allocation and the second compression entirely. A subsequent state-specific conservative floor can skip further candidates.

Legacy 1-bit styles consider compaction only for small sprites of at most 262,144 pixels. They count actual emitted RGBA states while packing the baseline; at most two states may use a 1-bit candidate, while three retain 2-bit encoding. Larger synchronous exports pack/compress one 2-bit baseline without collecting roles or considering a candidate. The original hidden RGB beneath None/empty pixels is preserved, including when either ink is None or both inks have equal RGB. Both legacy candidates now declare sRGB, matching Palette PNG metadata. This intentionally adds 13 bytes to legacy outputs that retain 2-bit encoding (213→226 bytes in the three-state fixture). It is metadata consistency, not evidence that every prior PNG displayed incorrect colors. The size guarantee for legacy compaction compares both encodings with the same sRGB tag.

The legacy gate also has real counterexamples: a 3×257 None image is 296 bytes with 2-bit encoding versus 297 bytes with 1-bit encoding; a 3×1025 image ties at 738 bytes. Both retain the complete tagged baseline, with identical stored RGBA.

The PNG specification permits up to 256 palette entries and one 8-bit alpha value per entry; omitted trailing tRNS values mean fully opaque. See [PNG PLTE](https://www.w3.org/TR/png-3/#11PLTE) and [PNG tRNS](https://www.w3.org/TR/png-3/#11tRNS).

## Bounds and measured cost

The fixed extra state arrays total 132,354 bytes (65,537 Uint16 lookup slots plus 256 RGB and alpha entries). They never grow with pixel count; the lookup handles EMPTY separately and can store slot 256 without wrapping. No extra per-pixel state-index array is retained. Both validation and candidate packing yield/check cancellation at bounded batches, including a single row wider than 65,536 pixels.

RGBA and indexed row buffers are serialized. The completed encoded baseline survives between passes; the first layout's raw rows are explicitly cleared before candidate allocation. Raw baseline rows cost `4*w*h+h`; candidate rows cost at most `w*h+h`, commonly less at low bit depth. Compression and complete-PNG assembly still allocate compressed/chunk/output copies. These are logical array bounds, not a browser process or garbage-collector peak guarantee. fflate's asynchronous one-shot helper terminates its worker before invoking completion; cancellation separately terminates a pending worker and ignores late callbacks. No baseline file is returned as a successful cancellation fallback.

Compaction deliberately spends additional CPU on an eligible candidate. The same installed fflate level-3 comparison alternates before/after order, discards three warmup passes, and keeps nine timings per side. The retained receipt reports:

| Workload | Before → after bytes | Median before → after ms |
| --- | ---: | ---: |
| 262K pixels, 128 Keep states | 386,902 → 231,802 | 27.59 → 34.69 |
| 400K pixels, 128 Keep states | 589,675 → 353,120 | 41.41 → 54.32 |
| 256 Keep states, odd width | 6,924 → 5,418 | 0.51 → 0.69 |
| 257-state fallback | 6,927 → 6,927 | 0.43 → 0.48 |
| Flat partial Keep | 2,147 → 152 | 14.55 → 18.67 |
| Tiny Keep | 83 → 83 | 0.084 → 0.086 |
| Binary Palette | 101,758 → 101,758 | 8.17 → 8.75 |
| Legacy opaque two-state | 10,000 → 8,525 | 1.05 → 1.62 |
| Legacy None | 214 → 187 | 0.57 → 0.89 |

These are local synthetic workloads, not universal performance claims. The known losing candidate spends a second compression before returning the original 109 bytes. Async Palette compression stays off the main thread; legacy encoding retains its synchronous policy.

The independent peer found and rejected uncapped legacy double encoding: one 16 MP random workload rose from about 163 ms to 424 ms for a 14% size reduction. The agreed 262,144-pixel cap avoids that extra large-image pass. The retained `peer-cost-uncapped-results.json` records the rejected design, and `peer-cost-results.json` measures the final capped version at 512²/2048²/4096². Large exports still have measurable fused role-validation overhead and remain synchronous; wall timings varied under system load. Migrating legacy Save/Copy to cooperative asynchronous encoding is separate follow-up work, not claimed solved here.

## Verification and reproduction

`png-compaction.test.js`, `png-compaction-cancel.test.js` and `png-legacy-compaction.test.js` cover used-state and bit-depth boundaries, dedicated EMPTY/256th-slot handling, odd-width/mid-byte async packing, full alpha validation after 257-state overflow, real encoded-size rejection, tiny lookup-allocation avoidance, frozen binary output digest, legacy None hidden RGB, exact cap boundaries, compressor counts, wide-row cancellation and cancellation during the second compressor. Together with the existing Save, Palette export, filename, batch, animation snapshot and compression cancellation suites, 120 tests in nine files pass.

The independent read-only peer's `PEER-REVIEW.md` accepts the final capped source after 114 independent Node/Sharp cases and 85 directly affected unit tests. Its separate scripts and source hashes are retained. Counts overlap with this implementation's tests and should not be summed as distinct cases.

`png-oracle.mjs` independently reads IHDR/PLTE/tRNS, verifies CRCs and inflates/unpacks rows with Node, preserving RGB even at alpha zero. `probe.mjs` additionally decodes all 12 retained workloads through Sharp and compares every stored RGBA byte with pre-M8 output and authored data where applicable. It loads the old encoder from `git show cdca311:src/lib/save.js` into ignored task temp storage, with the same installed compressor. The receipt includes reference/source hashes, raw timings, byte counts and logical row-array bounds.

Run from the repository root:

```powershell
node bench/conversion-fixes-2026-10-18/m8/probe.mjs
node bench/conversion-fixes-2026-10-18/m8/capture-oracle.mjs
node bench/conversion-fixes-2026-10-18/m8/build.mjs after-v4 after
node bench/conversion-fixes-2026-10-18/m8/serve.mjs after 5237 after-v4
```

The probes use installed `sharp`, or an absolute path/module URL supplied through `SHARP_MODULE`. The capture oracle needs regenerated actual downloads, which are intentionally ignored `.bin` artifacts. The baseline browser bundle was built and frozen before the product edit; building the current checkout with a `before` label does not recreate historical code.

For desktop browser checks, open `/bench/conversion-fixes-2026-10-18/m8/browser.html` on the frozen server. Run the native PNG matrix. Dismiss the welcome overlay, import the Keep fixture, explicitly choose Palette Opacity **Keep**, click the real App **Save**, import the same fixture again, and click the real App **Save all**. The test-only wrapper observes the final Blob at anchor-click download transport; the App bundle, click handlers, snapshot preparation, conversion, filename and encoder are unchanged. Chrome ImageDecoder compares visible RGB and every alpha byte; it cannot establish hidden RGB under alpha zero. The baseline receipt's historical `nativeRGBAExact` field means this same native visible-RGB/all-alpha check. Separate Node/Sharp receipts establish exact stored RGBA.

Root operated the desktop browser because this child's CUA inventory remained empty. The child independently reviewed the screenshots and captured receipts, and verifies exported bytes separately. The frozen before matrix passed, with actual App Save 386,902 bytes and a two-image ZIP of 774,070 bytes. The after Keep Save is 231,802 bytes and the two-image ZIP is 463,870 bytes. The independent capture oracle verifies all eight exported PNGs: both Keep Saves, four ZIP entries and both large legacy Saves. Keep output matches authored RGBA through Node and Sharp. The final native matrix passes all eight cases, including a 4 MP legacy image that retains 2-bit encoding. The large source is independently authored RGBA8 PNG from `sourcePng(legacyAsPalette(legacyFixture('opaque',2048,2048)))`, the same exact bytes used through the App's native file picker and the harness import button. Its actual App Save grows from 612,977 to 612,990 bytes, with the only changed bytes being the inserted 13-byte sRGB chunk; stored RGBA and compressed pixel data are identical. An earlier SVG test input was rejected by the baseline decoder; it was replaced with the supported PNG source, with no product change.

## Console diagnostic investigation

The desktop tool's console reported `MutationObserver.observe` receiving a non-Node during harness navigation/reload, with an empty source URL and no stack. This was investigated rather than treated as a clean console run. `make-trace.mjs` copies the immutable final bundle and adds an early inline HTML diagnostic before either production module entry. All 23 JS/CSS assets remain byte-identical (`trace-build-receipt.json`). The wrapper calls the native method, records target/native/call stacks if it throws, and rethrows the same error; it neither suppresses nor substitutes observer behavior. Early main-world error/rejection listeners also record failures.

Three standalone loads and two iframe loads recorded two valid App observer calls each, with no observer failure, window error or unhandled rejection. The harness parent recorded zero observer calls. The console-only message recurred twice on harness navigation despite no corresponding trace failure; ordinary standalone final-App load/reload had no console errors. These observations do not identify its exact origin, including whether it belongs to browser tooling, an earlier context or another uninstrumented world. No concrete product failure was reproduced or source change justified. This diagnostic remains unassigned; the evidence does not claim that every console surface was clean. `trace-events.json` retains the successful main-world observations; the trace entry runs separately on port 5239 without restarting or changing the download-capture servers.

## Rejected alternatives and limits

- Always indexing up to 256 states fails the 109→118-byte counterexample; complete encoded size decides.
- Alpha thresholding or color reduction would alter exact Keep output and is excluded.
- A 65,536-slot lookup cannot represent EMPTY at key 65,536; its dedicated slot is required.
- A per-pixel candidate index cache or simultaneous raw RGBA/indexed buffers adds unnecessary image-sized storage.
- Always using legacy 1-bit packing would lose its genuine three-RGBA-state images. Merging alpha-zero states while changing their stored RGB would break existing None conventions.
- Compressor/filter changes would confound this measured result; matching, palette selection and compression level remain the same.

Shared documentation contract: “Partial Keep PNG may use an exact indexed representation when at most 256 used RGB/alpha states fit and its complete encoded file is strictly smaller than the RGBA baseline; otherwise RGBA is retained. Binary Palette bytes remain unchanged. Legacy PNG declares sRGB and, only at up to 262,144 pixels, may compact at most two actual RGBA states to 1-bit when smaller than its tagged 2-bit reference. Larger legacy PNGs pack/compress the tagged 2-bit baseline once. All stored RGB/alpha values, including existing transparent RGB conventions, are preserved.”
