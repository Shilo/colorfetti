# Actual Codex Browser evidence

These receipts come from the actual in-app browser through the CUA API, not the
auxiliary Edge automation used by the core/UI reviewers. Windows Chrome155,
1280×720/DPR1, visible document state. Test tabs were hidden from the user's work
surface but not visibility-throttled. New own localhost origins only.

## Retained complete snapshots

- `manual-baseline-styles.json`:51events, starting5ae build5392;1024/2048sources,
  all11exposed styles, Preview/zoom/Compare/close and rapidBrightness. Earlier
  first-phase batches/settings/editor were also exercised; the POST snapshots
  are finite and may lag the last observed DOM state. No missing history is
  silently reconstructed as a timing receipt.
- `manual-baseline-animations.json`:30events, starting5ae build5393;Keep/Copy,
  real6frameGIF,32/48frame motions,96frame over-budget clip, Preview pause/resume,
  fullGIFdownload and removal/return to demo.
- `manual-candidate-v3.json`:26events, isolated5ae+App fix5409;keyboard/pointer
  Preview,zoom/Compare,390×844 and819×448 responsive checks,2048coldIcon/Stencil.
  `manual-v3-preview-and-cold-icon.json` is an earlier complete24event snapshot.
- `manual-final-cumulative.json`:22events,18de3f7+App fix5406 (runtimeae97d0e);
  picker16px wizard/PICO8/nativePNG,256-color editor/64swatches/page2,keyboard
  Preview focus,palette stepping and Reset returning Auto while preserving source.
  `final-observations.json` retains semantic DOM checks, console and harness limits.

`codex-<run>.json` files are the unmodified server POST snapshots. The probe did
not await each POST before navigation, and server arrival order does not enforce
a monotonically growing snapshot. Complete final DOM JSON was therefore copied
directly through CUA before closing the owned tabs. The manual files are distinct
evidence; old raw files remain unchanged. Reproduction should wait for persistence
and compare DOM/file event counts, not infer completeness from an HTTP success.

## Profiling interpretation

Finite2500msobservation windows are not conversion latency. Events in one browser
task can share the same overlapping LongTask entry, so do not add durations or
call them isolated function timings. Actual Codex CUA exposes no renderer/worker
CDP CPU profiler or browser-process restart for this audit.

The early5392probe'sstart-only task filter and cleared histories omit tasks that
began just before click capture. Its empty task arrays **do not show no LongTasks**.
Earlier frame gaps remain observed: cold2048Icon216.8ms andStencil50ms.
The corrected v3 overlap/retained-history/takeRecords probe5409 observes:

|2048coldinteraction|Observed task|Maximum frame gap|
|---|---:|---:|
|Icon selection window|590ms|599.8ms|
|Stencil selection window|131ms|149.8ms|

These single instrumented desktop observations complement matched native trials,
not a cross-engine percentage, universal task bound or regression comparison.
Worker/listener/URL and heap fields are bounded diagnostics; heap fields do not
prove peak allocation or an OS-memory bound. Test-only rAF sampling is excluded
from the appRafCalls field but still has instrumentation cost.

## Output correctness

`output-verification.json` contains12 independently checked payloads:9entries from
the real native ZIP,1024PNG,partial-Keep PNG and256×256×48GIF. Every source dimension,
alpha and visibleRGB is checked against an independent scalar Oklab nearest oracle;
GIFframes/delays/loop use independent Sharp decode. HiddenRGB underalpha0 is ignored.
No application matcher or canvas readback supplies this oracle.

`final-output-verification.json`: currentfilename`dungeon-wizard-colorfetti.png`
has the exact215bytes/SHA256 of the independently checked baseline wizardPNG.
The validator/source/settings are `../verify-codex-downloads.mjs`; Keep entries
override the manifest's original common Cut128 settings via each entry'salphaMode.
Actual Copy completed a PNG clipboard write; native pixel readback is not claimed.
The initial empty browser clipboard was restored to empty text after the test.

`short-landscape.png` and `final-build.png` retain visual state. Phone-sized and
short-landscape DOM geometry found no horizontal overflow, with reachable Preview
and44pxsettings controls. Viewport override was reset. Pixel conversions remain
independently checked by downloaded bytes, not screenshots.

## Harness limits and cleanup

Final observations retain one Save attempt that first dismissed an open Palette
panel and a timed-out download wait; explicit Save with the panel closed works.
An earlier hidden Add locator, no-match checkbox locator (AX describes pressed
buttons as checkboxes), and CUA Escape not closing native dialog are qualified
automation limitations. Actual keyboard Enter close succeeds; native Android
Escape separately passes. These are not claimed application correctness failures.

Physical OS paste/drop/cross-app drag receivers, pinch, browser process-cold start,
worker/GPU CPU and exhaustive memory upper bounds are unmeasured. Four exact owned
tabs5/6/7/8 were closed after direct evidence capture; no user tabs were closed.
`../desktop-cleanup.json` records verified exact helper PIDs stopped, no audit-port
listeners remaining, viewport reset and retained known output downloads. No Downloads
enumeration or purge. Native settings/mappings cleanup is independently recorded.
