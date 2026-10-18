# Native audit decision and remaining costs

D1 is **REJECTED**. Five alternating AB/BA pairs on the actual USB Pixel8Pro did
not meet the predeclared10% integrated warm Save CPU gate on either practical
target:1024 was120.05→115.16ms (-4.1%);2048 was165.92→154.61ms (-6.8%).
First Save after import/count improved16%, but cannot replace the warm criterion.
First Save is not source/module/process-cold: import and exact captions have
already warmed the source and quantizer. The raw runner's original cold shorthand
is superseded by this correction and `d1-summary.md`.

All160 native output trials matched exact encoded bytes and independently decoded
visibleRGB, every alpha byte, dimensions and GIF frames/delay/loop. There were no
new Long Tasks>50ms in the matched cohort. All adverse medians and every trial
remain in `d1-pairs/results-all-wholeapp-d1-1792300555382.json`. Native tiny warm
CPU increased4.08ms/5.8%; first RGB1024 increased9.09ms/7.9%; first cap/Cleanup
increased22.96ms/16.3%. Variation exists and these are not attributed production
regressions; the target gate miss already rejects D1. No further tuning or kernel
timing was used to rescue it. `d1-kernel.mjs` is prepared but **not executed**.

The broad and expanded baseline found these ranked costs:

| Priority | Reproduced native observation | Attribution and decision |
|---|---|---|
|1|Cold large1-bit Icon:1024 first preparation186/300ms max Long Task in two source-cold runs;2048 first preparation471ms. Repeated style passes had none>50ms.|Profiled baseline. Frozen built`Ji` is `iconOf` in `src/lib/icon.js:40` (matching full-source typed allocations/cache prologue), with287.8ms self samples at2048; built`Bi` is its `glyphComponent` helper (59.9ms). Source geometry/arithmetic must remain exact. Cooperative preparation would require a separate lifecycle/atomic-publication design and measured candidate, not a local loop patch. Defer.|
|1|Cold Stencil:1024 max71/80ms,2048 max131ms.|Built`lo` is `sprites` in `src/lib/recolor.js:230` (matching three source-sized arrays/median prologue),90.7ms self samples at2048. Later passes reuse preparation. Defer; no claimed fix.|
|2|Rapid Brightness R→G→Value on2048:466.1ms rendererCPU and121ms max Long Task;1024 max52ms in final run.|Baseline committed reanalysis and final current paint. Existing per-frame analysis remains synchronous; source identity and stale publication guards passed this finite sequence.|
|2|Entropy512 RGB dither8→4 final current caption:1586.1ms rendererCPU,1982.2ms elapsed; no observed>50ms Long Task.|Profiled bounded diagnostic, not typical sparse sprite artwork. Dither cost already documented; no approximate matcher proposed.|
|3|Editor paste256/paging/close aggregate phase:585.3ms rendererCPU with187ms max Long Task.|Includes Playwright text fill, focus/layout/Review and swatch rendering. App-only attribution unresolved; not accepted as a production bottleneck or fixed.|

Profiles add overhead; these are finite measurements, not hard device budgets.
Main-thread TaskDuration excludes workers. rAF gaps can exceed50ms with no Long
Task: the practical baseline observed75ms during2048RGB and100ms during one
Preview-source import. This does not prove a universal stall-free app.

Completed successful receipts:

- `baseline-startup-batches-wholeapp-baseline-1792299907201.json`: both themes,
  1/2/4/8 distinct sprites,8+genuine effect with Auto, input/drop/paste handoffs.
- Completed first32 phases of
  `baseline-sheets-animation-preview-onebit-editor-wholeapp-baseline-1792299924168.json`:
  practical sheets/three GIFs,5 scalar-verified native outputs, Preview and all11
  tiny1-bit styles. The final editor pointer action failed and is separately retried.
- `baseline-editor-extended-overbudget-teardown-failure-fallback-wholeapp-baseline-1792300827121.json`:
  keyboard Review256/paging/manual/close;5 more scalar-exact native outputs including
  Keep and worker-unavailable GIF;4096/4097 cap/Cleanup replacements; high entropy;
  fresh visible384×384×48 over-budget playback;6 real share/remove/demo cycles;
  injected limiter/Cleanup fetch failures gate Save and Retry recovers.
- `baseline-largeonebit-wholeapp-baseline-1792301038091.json`: larger style cold/
  repeated preparation, Brightness rapid cancellation, binary-alpha cut control
  correctly absent, actual partial-glow64 cut8→64→192 cancellation/current paint.
  Large sampled Checker counts remained unknown as intended.

The6 forced-GC remove cycles measured JS heaps4.59→5.07MB, with diminishing final
growth; each returned to one demo figure. This does **not** prove a leak or a memory
bound: compiled code, automation, intentional caches and browser/native allocations
are not separated by these scalars, and no dead-source retaining path was established.

Remaining native limits: physical landscape was unavailable (rotation policy left
`free`); native picker UI/real paste/pinch gestures and clipboard transport were not
measured. File-input/drop/paste browser events are synthetic payload handoffs into
real app handlers. Native ZIP transport was intentionally omitted because the app
uses fixed `colorfetti.zip`; actual Codex Browser covers ZIP. Safari/iOS/Mac hardware
are not covered. No phone thermal/security/appearance preferences were changed.
