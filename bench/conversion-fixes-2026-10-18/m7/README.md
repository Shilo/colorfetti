# M7 — transparent GIF bounds with a non-growing size gate

Shared `createPaletteGifWriter` now considers independent, tightly bounded GIF
frame rectangles for Palette worker/fallback exports and asynchronous legacy
1-bit exports, after None remapping. Logical dimensions, global tables, disposal
2, delays and repeats are retained. No previous-frame differencing is introduced.
The synchronous legacy writer remains a full-frame semantic test reference.

## Why plain cropping was rejected

Smaller rectangles do not guarantee smaller LZW. Exhausting 65,536 binary 4×4
images found 14,064 with smaller bounds: 10,977 became smaller, 3,082 tied and
five grew. Rows `0101/0100/0100/0100` crop to 3×4 but grow 64→65 bytes.
`crop-size-challenge.mjs` retains that counterexample and checks the shipping
writer on all 14,064 inputs: **zero grew**.

Near-full cropping is also a poor CPU/memory tradeoff. A dense 256×256 clip with
one transparent row saved only 256 bytes while the unrestricted prototype nearly
doubled reserved output capacity. The final policy considers candidates only
when their area is at most **75%** of the logical frame. Its helper returns the
original buffer before allocating a skipped near-full rectangle. Boundaries at
74%, 75% and 76% are covered by tests.

For eligible candidates, encode the full and cropped independent frame blocks
beside one another in the same output buffer, then retain only the smaller
complete block. Ties retain the full frame. This compares GCE, descriptor and
compressed payload together; the global header/table/trailer are unchanged, so
the complete file cannot grow relative to the same full-frame writer. Empty
frames offer a 1×1 transparent candidate at 0,0, subject to the same size gate.

## Bounded work and storage

- Opaque tables skip the pixel scan. Transparent tables inspect only row edges;
  dense interiors are skipped. Worst-case scan work remains O(N).
- A cropped candidate adds one A-byte indexed buffer, where A≤0.75N. No source
  index/mask is mutated and no converted clip or per-clip candidate cache is kept.
- Reserve a full frame first, then reserve its cropped candidate beside the
  **actual** full-frame encoding. Both use the existing growing output buffer.
  For committed prefix P, the full-frame request is P+2N+1024. Candidate request
  is actualFullEnd+2A+1024, bounded by P+2N+2A+2048.
- Growth chooses max(requested capacity, twice old capacity). A growth allocation
  is less than twice the request; its temporarily coexisting old and new buffers
  total less than three times that request. These bounds exclude source/analysis
  buffers, the one cropped A-byte buffer, LZW scratch and the existing final file
  copy. They do not claim to bound the application's whole heap.
- Only eligible rectangles run a second compression. Scan, copy, compression and
  reserve time remain inside the async writer's existing elapsed deadline before
  yielding between frames. Cancellation checks before/after add and Palette
  worker acknowledgment/backpressure are retained. A single huge synchronous
  frame still cannot be interrupted between its internal operations.

The final allocation recheck (`choice-allocation-final-results.json`) found:

| Case | Full→selected bytes | Maximum output capacity full→selected |
|---|---:|---:|
| animation128 nearest | 12,752→6,753 | 67,744→67,744 |
| animation128 enhanced | 13,559→7,659 | 67,744→67,744 |
| animation256 nearest | 29,510→10,089 | 264,352→264,352 |
| animation256 enhanced | 30,860→11,419 | 264,352→264,352 |
| Known crop regression | 64→64 | 2,048→2,048 |
| Dense opaque 256 colors | 101,505→101,505 | 265,792→265,792 |
| Dense one-row margin | 15,593→15,593 | 265,792→265,792 |
| 1,000 moving one-pixel frames | 177,790→23,039 | 270,640→67,660 |

Initial/repeated prototype CPU observations are retained, including raw times.
The first three uncontended workload medians added about 8–19% encoding CPU;
later samples had large external contention and cannot support precise final
CPU claims. Two compressions on eligible rectangles are an explicit tradeoff
for guaranteed non-growing files. No universal speedup is claimed. The final
allocation-only receipt deliberately contains no timing measurements.

## Verification and review

- Targeted GIF, bounds, crop, Palette-export, cancellation and repeat tests:
  **241 passed** across thirteen files. Includes the known LZW regression, equal-size
  fallback, 75% boundary, unchanged opaque 256-color bytes, 1,000-frame growth,
  buffer-growth bounds, None remapping and source immutability. Existing tests
  retain late-frame snapshot rejection and atomic ZIP failure behavior.
  Converted-animation checks independently decode output with omggif, retain
  byte identity for uncropped full-frame outputs and require warm structural
  preparation exports to match the first export's bytes.
- Independent Sharp/libvips checks cover all alpha bytes, visible RGB and
  width/frame-height/pages/delays/repeats for first-cropped, shrinking, empty,
  empty-first, edge pixels, all three valid 1-bit ink/None configurations,
  255 colors plus transparency, opaque 256 colors and four real workloads.
  256 colors plus transparency still fails explicitly before compression.
- Codex desktop Chrome `ImageDecoder` independently decodes every frame in five
  before/after cases. The before receipt shows unchanged full descriptors; after
  shows bounded descriptors with identical native pixels, timing and repeats.
  This checks transparent pixels outside the first cropped rectangle, prior
  larger rectangles followed by smaller/empty frames, and both None choices.
- Actual production App Save and Save all are exercised through real controls.
  Test-only iframe code captures only finished Blob download transport; production
  handlers, naming, settings capture, conversion and compression run unchanged.
  Generated `before-ui-*` / `after-ui-*` artifacts are compared independently in
  `oracle-results.json`. Test capture labels do not alter product filenames.
- The implementing sub-agent's CUA inventory became unavailable after M4. The
  coordinator independently operated its working Codex desktop browser and saved
  receipts/screenshots; the implementing agent reviews those receipts and the
  independent Sharp comparisons before mutual agreement. No physical phone was
  used. This does not establish Safari/Firefox compatibility.

Reproduce from the repository root:

```powershell
npx vitest run src/lib/gif.test.js src/lib/gif-loop.test.js src/lib/gif-crop.test.js src/lib/gif-frame-bounds.test.js src/lib/gif-decode.test.js src/lib/palette-decode.test.js src/lib/palette-export.test.js src/lib/palette-state.test.js src/lib/palette-dither-state.test.js src/lib/save.test.js src/lib/save-batch.test.js src/lib/converted-animation.test.js src/lib/export-compression-cancel.test.js
node bench/conversion-fixes-2026-10-18/m7/crop-size-challenge.mjs
node bench/conversion-fixes-2026-10-18/m7/choice-benchmark.mjs --allocation-only
node bench/conversion-fixes-2026-10-18/m7/build.mjs after
node bench/conversion-fixes-2026-10-18/m7/serve.mjs after 5215
```

Open the printed harness in a desktop browser and run the native checks. For
actual App comparisons, capture the same settings and fixture through before
and after builds, then run `oracle.mjs --require-ui` with Sharp installed or `SHARP_MODULE`.
Bundles remain under ignored `.tmp`; media versioning belongs to the root
coordinator. Oracle receipts include source and frozen-bundle SHA-256 hashes.

## Proposed shared contract additions

CLAUDE/spec:

> Animated Palette and asynchronous 1-bit GIF exports consider transparent
> frame bounds only at up to 75% logical-frame area. Full and cropped complete
> frame encodings are compared in one output buffer; only strictly smaller
> cropped blocks replace full blocks. Logical screen dimensions, disposal 2,
> source delays/repeats and visible RGB/all alpha remain unchanged. Empty frames
> offer a one-pixel transparent candidate. No temporal differencing or table
> expansion is introduced. Synchronous legacy encoding stays the full-frame
> semantic test reference.

Performance documentation should retain the concrete scan/copy/second-compression
and buffer-growth bounds above, along with the CPU tradeoff and single-frame
blocking limitation.
