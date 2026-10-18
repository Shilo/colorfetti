# M1 bounded artwork admission

## Challenged policy

The review's decoded-memory finding is real, but a compressed-file limit alone does not solve it, and a browser app cannot promise a whole-process heap ceiling. This implementation tracks a defined source-storage budget and rejects before controlled expansion. It preserves strict decoding and does not resize, shorten or repair imported content.

The logical budget is **256 MiB**, shared by queued/pending imports, wall ownership and active source borrowers. Each imported frame is limited to **16,777,216 pixels**, each asset to **4,096 frames**. These are conservative product limits rather than measured phone crash thresholds.

| Tracked component | Reservation |
| --- | --- |
| Immutable RGBA plus current legacy analysis | 7 bytes per source pixel |
| One live-wall reanalysis generation | 3 additional bytes per source pixel |
| Current and replacement histogram/edge arrays | 4 KiB per frame |
| GIF encoded bytes while importing | Exact File.size, reserved before arrayBuffer |
| GIF compositing canvas and restoration canvas | 8 bytes per logical-frame pixel while importing |
| GIF LZW dictionary and stack | 20 KiB while importing |
| Captured input analyses, including matching export/count/native jobs | Separate 128 MiB ledger; 3 bytes per pixel plus 2 KiB per captured frame until actual settlement |
| Newly prepared nonmatching export/count analysis | Another 3 bytes per pixel plus 2 KiB per frame in that captured-analysis ledger |

The captured-analysis ledger is **additive**, not part of the 256 MiB source budget. M2 has separate one-frame **84 MiB** logical inspection headroom. The frame cap separately bounds JavaScript metadata count; JavaScript object sizes are not measured by these ledgers. Conversion indexes/RGBA, style caches, encoded exports/ZIP buffers, native codecs, browser canvases/GPU storage and delayed garbage collection remain outside these bounds. The numbers are not a whole-process memory promise.

## Ownership and implementation

The complete decode/analysis pipeline is serial. This deliberately prevents concurrent PNG requests from allocating RGBA before their analysis queue slot. Queued cancellation performs no decoding. Native still decoding calls admission at validated dimensions before controlled RGBA/canvas allocation; repeated/fallback dimensions atomically recheck the existing reservation. Native codecs may allocate before those dimensions become available.

A constant-storage GIF framing scan validates logical/patch bounds and counts real image descriptors before GifReader creates its metadata array. It skips framed comment/application/LZW subblocks rather than searching their payload for image markers. It preserves strict LZW decoding, existing no-trailer acceptance, and M4 loop aliases. The cooperative fallback preflight yields between bounded encoded-byte groups.

Reservations survive worker transfers, immutable-File recovery and unpublished setting retries. ARTWORK_MEMORY_LIMIT is terminal for that import attempt and does not trigger fallback. Publication drops import-only GIF scratch while retaining source/reanalysis capacity. Failure and cancellation discard unpublished frames; removal and teardown release wall ownership. Active borrowers keep the reservation charged until actual settlement, including shared worker producers, ordinary/native Preview conversion, queued count work, explicit exports and cached drag preparation. Native drag grace retains only encoded output, releasing its source request/lease.

Live-wall reanalysis waits for an aborted generation to settle before starting another. Captured 1-bit exports/counts charge their input analysis even when matching; nonmatching preparation also charges its new generation. Queued counts acquire that capture before entering the queue. No-ink/large-analysis early exits remain free. Palette queues, exports, drag records and worker signatures instead project original-only sources with opaque stable identities, avoiding obsolete analysis retention. Copy holds until PNG preparation settles even if clipboard transport fails early. ZIP remains atomic.

## Challenge iterations and validation

- Root challenged ownership after removal. The token API gained independent borrower leases rather than treating removal as immediate memory availability.
- Root and M2 review found shared preview subscriber cancellation can settle before its producer. Producer and consumer lifetimes are now separate.
- Root's tests found eager pixel getter reads introduced by a naive lease scan. Original-object and item-token WeakMap/identity helpers avoid those reads and preserve cancellation/saturation fast paths.
- Independent review found a missing nonmatching 1-bit count analysis charge; added it after existing early exits, with a regression test.
- Initial queue tests exposed a real late File-read rejection overriding cancellation; cancellation now retains AbortError authority.
- A final adversarial parser comparison found that non-11-byte Application Extension headers could desynchronize omggif's fixed header skip from a generic framed scan. Artwork preflight now rejects those malformed headers before GifReader; hostile payload/actual-worker regressions prove GifReader is not invoked. Valid 11-byte unknown application IDs and both loop aliases remain unchanged.
- The final App race audit found that a stale remove callback could release an old clone without removing its current immutable replacement. Removal now resolves the stable ID against the live wall, releases only that actual owner and no-ops for absent IDs. A real-pool regression includes an active export borrower, repeated removal and final settlement.
- Existing integrity/queue tests were updated for intentional preflight reading and serial decoding. Strict integrity failures still never perform a recovery decode.
- Focused tests cover atomic concurrent reservations, queued/completed cancellation, zero/oversized geometry, tiny-frame caps, worker and fallback rejection, repeated unpublished settings, native/bitmap fallback rejection before copying, output-byte preservation, export scratch rollback and removed-source drag lifetimes.
- The final v4 whole-suite run passed **1,325 tests, 2 skipped, 78 files**; production and browser-harness builds passed. See tests-v4.txt and build-v4.txt. Root-operated browser receipts are recorded alongside this review.

This agent's prior Codex browser binding became unavailable during M1. Root is the explicit desktop-browser operator for before/after UI and actual-worker/fallback harness checks; this report does not claim independent agent browser execution or any physical-phone validation.

### Initial v4 receipt review and agreement

Both reviewers accept the final v4 fix. Root repeated the actual file-picker rejection/recovery/removal flow and both harness modes after the final source change. This agent independently reviewed those receipts, inspected the final screenshot, and checked provenance: all **21 source hashes and 51 build-file hashes match**, with no mismatches.

The actual module-worker receipt reports one worker; fallback reports zero. Both report one admitted/one rejected concurrent job, ARTWORK_MEMORY_LIMIT, exact source bytes, a charged removed-source borrower, peak 103,822 below 145,286 test bytes, and zero final bytes. The screenshot visibly identifies oversized-logical.gif and recovery guidance while valid.gif remains on the wall. Root's rejection AX diff contains no changed nodes, so the screenshot is the primary visible proof for that notice; the separate recovery AX snapshot confirms the valid 2×2 wall item. Root observed no JavaScript errors/warnings.

Evidence: worker-v4-root.txt, fallback-v4-root.txt, after-rejection-root.txt, after-recovery-root.txt, validation-v4.json, and ../screenshots/m1-admission-before.jpg / m1-admission-after.jpg. A subsequent crossfeature audit found the captured-generation gap described below; v5 supersedes v4's matching-capture accounting policy.

### Crossfeature audit correction, v5

The independent final audit challenged the earlier assumption that matching exports require no additional reservation. A matching asynchronous export retains analysis A while wall settings can publish B and then allocate C. A 64×64 real-module reproduction retained 59,392 unique typed-buffer bytes while only 45,056 were charged. Nonmatching exports can retain both input A and prepared export E alongside current/replacement B/C. This is a real intentional reference lifetime, distinct from garbage collection delay.

The corrective implementation adds the separate 128 MiB captured-analysis ledger above. Matching captures charge one generation; nonmatching captures charge input plus replacement. A logical-cost regression admits one 20×1024² clip even with nonmatching preparation (125,911,040 bytes) without allocating that large clip, rejects overlapping capture over quota, and verifies subsequent recovery. Native inspection charges only its selected legacy frame. Rollback and release are idempotent and source ownership stays independent.

The audit also removed unwanted strong references: App viewer selection keeps only its stable ID and clears detached focus owners; queued Palette count records keep opaque identities; Palette captures and Limiter/Cleanup signatures retain original pixels plus weakly assigned identity tokens, preserving wrapper invalidation and cache sharing. Hover desired items retain only IDs, and projected drag requests compare opaque tokens. Ordinary Palette preview completions and native requests avoid whole-item/analysis wrappers.

A second independently confirmed M2 issue involved joining another Tile's animation-cache producer: the viewer's own producer never ran, leaving its local settlement promise resolved. The cache now reports the actual producer promise to every subscriber. Native conversion waits for all registered superseded producers; subscriber cancellation alone does not release that barrier. The M2 agent owns those cache/Tile changes and their deterministic joined-producer regression.

Corrective focused checks passed **148 tests, 2 skipped, 11 files**; app-v5 and harness-v5 production builds passed. The root operated both frozen desktop browser harness modes: one real module worker versus zero fallback workers, exact source bytes, cancellation/removal ownership, matching A/B/C coverage, captured quota rejection/recovery, and zero final source/captured bytes. Both reported actual A/B/C storage **60,224 bytes**, exactly equal to source plus capture reservations. The quota peak of 134,217,728 is a logical reservation test, not an allocation of that many pixel bytes. No browser JavaScript errors/warnings were observed.

This agent independently reviewed both v5 AX receipts and recomputed **30 source/test hashes plus 51 build-file hashes**, with zero mismatches at that receipt review. Exact immutable URLs are in validation-v5.json on port 5211; root browser operation remains explicit.

Both reviewers accept the M1 corrective implementation. Root's integrated desktop walkthrough on the paired M2 build at port 5238 confirmed current-ID Palette captions, Reuse opening the exact two-color whole-GIF palette, 1-bit Icon native 2048² inspection/Fit, small-GIF frame selection/resume and the 390px layout. This agent independently inspected browser-capture-root.txt, browser-capture-narrow.json and m2-native-icon-after.jpg; the Palette caption/Reuse steps are root-reported observations rather than additional independent child DOM execution. Existing M8 App Save/ZIP capture receipts also exercise the source-only Palette projections. No M1 source change followed those checks.

The final provenance challenge detected a later concurrent M8-only save.js revision: the frozen M1/M2 builds contain hash e89328616e42547273a3984aa2403cf729d0ea24ee640e4700defff68cfa92aa, while the then-current M8 source was b47dd70534fe5ef20912cfb1aaf6a45c53a30a527c452912dfcb54b45f4f73b3. The other 29 M1 source/test hashes and 15 M2 source hashes still matched. Historical receipts remain unchanged; final M8 acceptance must use its subsequent frozen build/tests. This does not alter the reviewed M1 accounting/identity source or its explicit acceptance.

## Browser reproductions

`node bench/conversion-fixes-2026-10-18/m1/setup.mjs` creates bounded owned GIF fixtures and builds a harness that uses the real import client and browser module worker. Build an immutable app-vN directory, then run serve.mjs. The server snapshots all served bytes in memory.

- `/baseline/` uses the frozen pre-M1 build.
- `/app-v1/` is the first M1 candidate, superseded by later versioned candidates.
- `/app-v4/` is the final candidate with application-header alignment and stable owner removal guards.
- `/app-v5/` on port 5211 adds captured-analysis accounting and source-only identity projections.
- `/harness-v4/harness.html` runs a small explicit budget with actual worker imports; `?fallback=1` runs the same cases without a worker.
- `oversized-logical.gif` has a 4097×4096 logical screen with one 1×1 patch. Its baseline source+analysis is approximately 112 MiB, comparable to the prior reviewed GIF fixture; this is a finite desktop test rather than an intentional crash experiment. The candidate rejects it before expansion.
- The harness checks a concurrent admission rejection, exact source bytes, borrowed removal storage, repeated source reanalysis, queued cancellation, recovery and a zero final ledger.

## Proposed behavior contract for coordinator

> Artwork import uses a shared 256 MiB logical source-storage admission ledger. Reserve 10 bytes per source pixel (RGBA plus current analysis and one replacement analysis) and 4 KiB per frame, with a 16,777,216-pixel/frame and 4,096-frame/asset limit. GIF import additionally reserves exact encoded bytes, two logical-frame RGBA scratch canvases and 20 KiB of decoder scratch until publication. Preflight GIF framing/counts before GifReader metadata or RGBA expansion, preserving strict decoding and loop metadata. Stills reserve after valid native dimensions become available and before controlled pixel allocation; admission failures are terminal, never a fallback retry. Native decoding before metadata is outside this bound.
>
> Serial decode/analysis preserves batch publication and cancellation. Pending/unpublished ownership persists through transfer, fallback and setting retries; cancellation/failure discards it. Removal/teardown release wall ownership, while actual source borrowers retain independent leases until settlement. Live-wall reanalysis is serialized through aborted settlement, using its reserved replacement generation. A separate additive 128 MiB captured-analysis ledger charges 3 bytes per pixel plus 2 KiB per retained analysis frame, even when matching; nonmatching export/count preparation charges its additional new generation too. Queued analysis consumers charge at capture, not job start. Original-only Palette consumers avoid obsolete analysis references through opaque stable source identities. Memory rejection retains valid wall items, reports the relevant filename and offers removing images, using a smaller image/shorter animation, or waiting for exports. Copy/Save/ZIP memory rejection produces no partial file.
>
> These ledgers bound defined source and captured legacy-analysis reservations, not total browser/native/GPU/JavaScript heap, conversion/style caches or encoded-output storage. Native inspection has its own separate 84 MiB bounded one-frame headroom and waits for actual superseded producer settlement, including joined shared-cache jobs.
