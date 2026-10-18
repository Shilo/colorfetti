# Accepted: release the completed Preview focus target

Runtime delta: only `src/App.svelte`'s ImageViewer `onclose`. Capture trigger and
modality locally, clear App's stored trigger/modality before awaiting `tick`, then
perform the existing focus/blur using the local capture. No Svelte private handler
mutation, extra cache/listener/task, source pixels or conversion algorithm change.

The written plan is `preview-trigger-plan.md`. Baseline source is exact5ae; isolated
candidate5409 changes only App. Final5406 includes known filename/discovery commits
18de3f7 plus this exact App hash, excluding concurrent dirty GIF/import work.

## Demonstrated memory benefit

`io-android/retention-probe-1792320293818.json` and the retained heap/paths show a
48-frame256×256 source rooted through App's obsolete focus button after Preview
close and source removal. After11s andtwoGC, backingStorage is22,976,754B. Without
Preview it is595,193B; replacing the saved trigger with a tiny Preview releases the
old source to615,727B. `review/retention-source-challenge.md` independently confirms
the compiled App context/handler/Tile/frames strong path.

`io-android/retention-preview-trigger-fixed-1792320712815.json`: candidate595,933B,
passing the original<2,000,000B gate and releasing22,380,821B for this fixture.
Final cumulative5406 returns595,853B versusneverPreview595,151B. All runs report
zero errors. This is bounded last-preview retention, not an unbounded leak,
process-PSS reduction or a peak-memory bound.

## Correctness and adverse checks

`io-android/preview-trigger-final-decision.json` retains both five-pair rounds:
40native closes, correct keyboard Escape focus return, native-touch Close blur,
unchanged captions, andfour independently decoded native PNGs with identical bytes
and exact alpha/visibleRGB. Actual Codex Browser Enter-open/Enter-close returns the
connected caption trigger. Zoom/Compare/close,390×844/819×448 layouts, final editor
256color review/paging and native/desktop final output smoke also pass.

The first harness header incorrectly said8ms/10%; original5ms AND5% governs the
assessment. Raw files remain unchanged. Close-event→next-task paired latency:
firstkeyboard−0.4ms/pointer−0.2ms; repeat−11.3ms/+0.1ms. This is only the observed
close portion, not end-to-end click latency. No paired median exceeds that gate.

RendererCPU is directionally adverse and is **not dismissed**. First pointer
pairedmedian+6.684ms/+21.25%,3/5worse; unchanged authorized repeat+4.615ms/+16.57%,
4/5worse. The predeclared repeat criterion requires>5ms AND5% and4/5worse, so it
does not reproduce at that absolute threshold. Keyboard CPU paired+2.229ms then
+1.179ms is below5ms. Those broad CDP-action→settled-focus windows are not pure
handlerCPU. No third retry, CPU-speed claim, blanket no-regression claim or
universal latency claim is made. Accept the demonstrated memory release with
these explicit small-CPU uncertainties and preserved exact focus/output behavior.

## Final validation

Before runtime edit, plain66-file baseline suite:1058passed/twoexistingGCskips.
After, isolated cumulative18de3f7+App suite:66files,1071passed/twoexistingGCskips;
production build passes. The additional13tests belong to concurrent filename
commits, not this memory fix. The initial final snapshot lacked the brand QA CLI
dependency called by an existing test; exact18de3f7 CLI was added, the failed log
retained and the suite rerun without any runtime/dist change. Workspace TEMP/TMP
are child-process-only. Native cumulative PNG/GIF/ZIP/Copy/focus and actual Codex
PNG/editor/focus witnesses are indexed in the full audit report. No push.
