# Caption reliability: reproduction and policy finding

## Baseline review

Baseline: `5794b26`, isolated production build served on port 5351. The shared
working tree was not used as the acceptance baseline. The automated browser was
headless Edge with Chromium's sandbox enabled. Codex Browser and USB Android
acceptance remain the orchestrator's responsibility.

The reported disappearance is reproducible, but the reproduced case is an
intentional limitation in the previous metadata policy rather than evidence of a
new publication race:

| Step | Caption |
| --- | --- |
| Import a 2048×2048 Kenney sheet | Dimensions only |
| Open Preview, await exact inspection | 26 colors |
| Close Preview, change Matching to RGB | Dimensions only |
| Open Preview again | 25 colors |

The sampled wall cannot establish the exact full-source count. Its completion
deliberately retires the old-settings caption. Preview explicitly inspects every
source pixel and restores it. Merely keeping the old count permanently, or using
sampled counts as if exact, would produce incorrect metadata.

## Existing lifecycle behavior challenged

The retained-record fix in `6f40ba8` is still necessary and survived the tests:

- Exact 32×24 two-color sprite: caps 4/8/16/32/3/64/9/5; Oklab/RGB; Cleanup
  On/Off; dither 4×4/Off; desktop/phone/landscape-sized resize; Original hold;
  four Preview round trips. No blank caption transition was observed.
- Repeated PICO-8, Black & White, Auto, Resurrect 64 and ENDESGA 32 switches
  retained the exact two-color caption. A second 16×16 import obtained an
  independent eight-color caption.
- Six-frame real GIF: complete frame-union counts remained available after
  cap changes, ending at eight colors.
- An RGB/Oklab settings change and Reuse request in the same event turn retained
  the identity of the pending full-source inspection. Sampled completion could
  not overwrite its record; the editor opened with the current exact result.
- Delaying the inspection module by 350ms, then closing Preview before it loaded,
  prevented late publication. Reopening successfully inspected the source.
- Eight focused unit tests passed in `palette-usage` and `palette-usage-progress`.

The first restricted-shell browser launch and Vitest execution were blocked by
Windows temporary-file restrictions. Both passed on host execution; the browser
sandbox remained enabled. No app source was changed to address test setup.

Artifacts: `bench/caption-reliability-2026-10-17/reproduce.mjs` and `baseline.json`.
These tests cover normal completion and controlled cancellation. They do not
establish a universal absence of races, browser memory bounds, Android behavior,
or native image accuracy; those require the integrated acceptance pass.

## Proposed product change, not a speculative bug fix

To satisfy a count independent of viewport size, automatic wall metadata must
be computed from full-source information. The proposed integration shares one
serial, cancellable inspection per item/settings identity among wall, Preview and
Reuse. Stale keys never publish, queued cancellation skips source work, and only
tiny completed metadata is retained. The last exact caption can remain marked
updating until the current exact result arrives. Closing Preview must not cancel
work still required by the wall.

## Candidate implementation and second check

The orchestrator approved the shared serial inspection after the helper's
performance evaluation. `App.svelte` now schedules one source/settings metadata
request per live user item, guards pending Auto generation, and yields a posted
task between queued items. Requests check cancellation before their first task,
before loading inspection code, and after loading it. Existing full-source
preparation/conversion remains responsible for subset/Cleanup/dither decisions;
the new bounded RGB summary speeds exact nearest membership without approximating
it. Preview and Reuse join the same pending record. Closing Preview does not
cancel metadata still needed by the wall. Old settings/source requests cannot
publish. Sampled wall completions leave the old exact caption pending instead of
retiring it. No converted frame cache was added.

The first integrated candidate was frozen on port 5358. The retained baseline
`baseline.json` was not overwritten. `candidate.json` repeats the tiny sprite,
preset/Auto, second source and six-frame animation cases. The large sheet now
shows 26 colors automatically on import and 25 after RGB Matching, before any
Preview visit. The prior retained-count/pending-record race test still opens
Reuse with the current 26-color Oklab result.

`native-accuracy.mjs` independently decodes real native ZIP downloads with Sharp;
it does not use app conversion modules to derive expected counts. Every caption
matched its downloaded PNG across nine real assets, including the sampled
2048×2048 sheet. The check repeats after rapidly superseding cap, Matching,
Cleanup and dithering requests, again matching all nine counts. This proves
metadata/export agreement for those cases, not universal aesthetic quality or a
new claim that the underlying recoloring algorithm is independently optimal.

The first candidate run included an obsolete baseline-only cancellation
assertion, which expected a sampled wall to stay unknown. That assertion correctly
failed after automatic counts were enabled; the script now runs it only against
the historical policy. The corrected candidate run passed all four cases.

The automatic queue changes were released to the demo-count agent for its
separate integration. Final combined review, Codex/Android checks and the final
commit are owned by the orchestrator. These source changes remain subject to
that acceptance; this document does not mark the whole task complete.
