# Removed Preview source retention

Independent fresh native evidence on frozen `5ae11b13977f2ce3cc7ae67cf7bd220f8a8734ce`:

| Controlled condition | CDP backingStorageSize after removal,11s wait,two explicit GCs |
|---|---:|
| Motion clip imported,never Preview |595,193B |
| Fresh document,motion clip Preview→close→Remove |22,976,754B |
| Same document,tiny sprite Preview→close→Remove replaces saved trigger |615,727B |

The no-Preview clip live snapshot was23,617,023B. Baseline documents were~588KB. The healthy import worker remains reusable in each case; document teardown closes it. No native Save, objectURL download, Worker wrapper, rAF sampler or persistent staged-file global participates in this diagnostic. It isolates Preview close/trigger lifetime from the earlier GIF export run.

Receipt: `retention-probe-1792320293818.json`,0page errors. Inputs are the licensed motion256×256×48 fixture and dungeon wizard tiny PNG. The original retained source had48frames plus analyses. Snapshot: `retention-probe/1792320293818-preview-removed.heapsnapshot` (10,313,614B); parsed retaining paths in its `.paths.json` sidecar.

The strong-edge diagnostic path is live document→More button event→App closure context field`et`→detached button with exact removed clip's `caption-preview`/aria-label→button click closure→Tile contexts→item.frames→frame.original/ImageData→Uint8ClampedArray→ArrayBuffer backing store. Other paths include analysis buffers. The parser ignores weak edges and is not a complete V8 ephemeron/dominator implementation; its path agrees with the controlled behavior and reviewed App source.

App source retains `viewTrigger` after `onclose` captures it. Setting `viewing=null` unmounts the viewer but leaves this old tile button reachable from the App closure. That button's event closure owns the removed source. A later Preview replaces the trigger and releases the previous source, exactly as observed. This is retained memory proportional to the most recently previewed removed source, not evidence of unbounded per-removal accumulation. It can still be substantial for large clips/photos.

The coordinator owns the fix. Narrow proposal: capture trigger and keyboard state for focus restoration, immediately clear stored trigger while closing, then preserve the existing post-tick focus/blur behavior. Related stored share/palette triggers deserve source review and equivalent invalidation only if their lifetimes can retain detached source buttons. Production source is not edited by this subagent.

Acceptance: repeat this exact native diagnostic on the frozen candidate; Preview-removed backing storage should return near the no-Preview case, without needing a second Preview. Preserve actual keyboard focus return and pointer blur, escape/backdrop close, source removal with viewer open, import/Save/Copy/GIF/ZIP behavior. Resource snapshots remain distinct from processPSS and are not whole-app peak bounds. Final cumulative filename changes require their own smoke.

Completed candidate/final validation: isolated candidate5409 releases to595,933B, cumulative18de3f7+App-only5406 to595,853B, both below the predeclared2MB threshold and near no-Preview595KB. Forty baseline/candidate keyboard/native-touch closes preserve focus/captions and four exact native PNG witnesses; final cumulative PNG/GIF/1bit/ZIP/Copy/ImageDecoder smoke passes. The first broader pointerCPU pairedmedian+6.684ms/+21.25% concern did not meet the single unchanged repeat's full reproduction criteria (+4.615ms/+16.57%,4/5worse; misses5ms absolute). This adverse direction is retained, not ruled out by source reasoning. Close-event portion latency does not exceed original5ms/5% loss gate; full dispatch→close wall time was not separately captured. See`preview-trigger-final-decision.json`; no third repeat. Root owns the final promotion/commit decision.
