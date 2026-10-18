# CanvasGrid attribution counter decision

Fresh auxiliary sandboxed headless Edge155.0.4283.62,927×827,DPR1, fixed light theme and ENDESGA32, frozen baseline5ae11b1 served on5401. This separate test-only instrumentation window followed the coordinated native window. No runtime source changed. [Raw receipts](grid-counter-receipts.json), [runner](run-grid-counters.mjs), [wrappers](ui-telemetry.js) and [execution log](grid-counter.log) are retained.

| Action | App-subtree observer callbacks | Observed mutation records | Root grid-variable writes | Same-value writes | Wall-art clientWidth calls |
|---|---:|---:|---:|---:|---:|
| Open Palette panel |1|1|3|3|2|
| Ten palette selections, empty demo |0|0|0|0|0|
| Open new editor |1|3|3|3|1|
| Review256 colors,64 visible |1|129|3|3|1|
| Next then Previous review page |2|128|6|6|2|
| Close editor |1|67|3|3|1|
| Total |6|328|18|18|7|

The source prediction of irrelevant structural notifications and repeated identical grid variables is reproduced. Wrapped wall-art width getters total about0.4ms across these actions; observer callback measurements round to0ms at the browser's coarse timer resolution. This does **not** mean zero CPU or zero layout. Callback measurements exclude deferred animation-frame measurement; spacing computation was not directly timed, and canvas bounding rectangles are grouped with other geometry reads. The other-geometry bucket has several callers and cannot be assigned wholesale to CanvasGrid. Same-value setProperty calls also do not establish that the browser invalidated layout.

The ten palette selections produced no grid callbacks or variable writes. This counters a broad claim that ordinary palette changes always trigger this observer path. Other paint-only palette canvases did reset width/height and acquire contexts during selections, while Review painted64 and page navigation128 swatches; those counts alone establish no material savings.

No candidate passes the predeclared requirement of at least5ms saved in a common single action or10% in a repeated workflow. This is bounded attribution evidence, not an A/B speedup measurement: the wrappers perturb execution, only the empty demo/editor were exercised, and import/resize/first-art replacement were not measured here. Do not narrow the observer or introduce a retained-geometry cache on these receipts. Preserving first-art replacement, empty/real wall changes, viewport changes and cleanup remains necessary if a future material reproducer warrants an implementation.
