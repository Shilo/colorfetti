# Caption counts: final acceptance — October 17, 2026

Baseline `5794b26`; implementation through `f2da4dd`. Separate agents owned
reliability, layout, speed, 1-bit semantics, Original, demo and slider research.
A fresh reviewer challenged the combined implementation in two rounds. Parent
review independently reran the marker counterexample and focused/full suites,
reviewed queue/publication identities and decoded native outputs.

## User-visible result

- Palette counts no longer depend on opening Preview or the wall's sampling size.
  Previous exact text stays visible while current metadata updates; errors clear it.
- Desktop right-aligned metadata puts count before resolution; touch and demo
  place resolution first. Dimensions stay against their aligned edge.
- 1-bit reports actual visible RGBs, including zero/one colors and None, rather
  than counting enabled ink choices.
- Original comparison selects a separately cached source count. Space, local hold
  and Compare reuse it. Animations consistently describe the whole-clip union.
- The empty example uses the same caption and counting machinery as real items;
  switching theme cannot reuse the other source's count under id0.
- No slider behavior, image conversion algorithm or export pixel rule changed.

## Performance challenge and correction

The initial 1-bit implementation could generate a full-source mask only for
metadata. The reviewer measured incremental 2048-sheet costs even after existing
sampled structural preparation: about 60 ms Cutout, 47 ms Lines and 46 ms Atkinson in
cold Node trials. Parent agreed that yield-before did not solve this cost.

The accepted correction limits missing automatic masks to 262,144 pixels/frame.
Larger sources use exact cached rendering data or proven saturation from
coordinate-preserving samples. Pattern/diffusion samples cannot prove exact
membership. Unknown stays unknown; later exact rendering/Preview return can
refresh it. Source conversion and export are unchanged. The parent and reviewer
verified the notification path, cancellation and no reactive update loops.

Nearest-only Palette counts use a bounded weak RGB/max-alpha summary and the
existing matcher. Original uses that summary when possible, with an exact
transient 2 MiB bitset for high entropy. Concurrent requests serialize cold summary
scans. Settings/Space/hold do not repeatedly scan original bytes. Spatial output
counts retain true export conversion, so they still incur work.

Host warm 2048 count 0.11 ms versus 37.26 ms reference, with cold 11.7 ms. These are
Node kernel timings, not phone frame-rate promises. Cold-engine timer overshoot
near 19 ms is retained in evidence rather than hidden by warm measurements.

## Validation

| Surface | Evidence |
|---|---|
| Full suite | 1050 passed, 2 GC-dependent skipped; production build passed |
| Responsive fixture | 20 viewport/input combinations, 3 caption contexts, absent / 2 / 256 counts and pending states |
| Independent combined UI | 9 scenario groups: rapid settings, multiple sources, Original, ordering/anchor, large sample proof, unknown→exact Preview recovery; no page errors |
| Desktop native outputs | All 11 1-bit styles, transparent inks on a 6-frame GIF, transparent source zero and Shape None fallback, Compare/Space/hold, portrait/landscape geometry |
| Palette native ZIPs | 18 caption/output count comparisons over 9 real assets, including 2048 sheet, nearest and rapid cap/Matching/Cleanup/dither replacement |
| Demo | 10 scenario groups; independently derived light Black & White 2 vs dark 1, Original 6, Auto/fixed, import/remove, desktop/touch |
| Actual Codex Browser |Fresh final-build tab: wizard and 2048 sheet imported; sheet 26 colors became 25 after RGB Matching without Preview; both 1-bit Cutout captions 2; earlier actual Original 2 → 9 verified |
| USB Pixel 8 Pro / Brave 155 | 448×819 portrait; seven-source wall including 2048sheet and real GIF; RGB change updated exact captions without Preview; Compare 2 → 9 → 2; six caps+Matching/Cleanup/dither changes produced 0 blank transitions; 1-bit GIF/None count 1 |
| Native Android Save |Uniquely named test PNG pulled by exact pathname; independent Sharp decode and scalar nearest oracle matched every RGBA byte, 16×16 and 2 colors |

The final native seven-source import/count readiness observation was about 549 ms,
including file transport/control overhead. The observed import and tiny-settings
windows recorded no >50ms Long Task entries; this is a bounded observation, not
proof that arbitrary large artwork or all future interaction has no long tasks.

Receipts: `bench/caption-acceptance-2026-10-17/`,
`bench/caption-integrated-review-2026-10-17/`, and the per-task research/bench files.

## Test setup corrections and limits

- Restricted Windows temp/profile creation blocked initial Vitest/Edge startup;
  approved host runs passed with Chromium's browser sandbox enabled.
- Root's first touch geometry assertion sampled an import/layout transition with
  zero bounds. Waiting for the imported wall's nonzero layout produced correct
  bounds; the independent reviewer also passed the actual integrated geometry.
- Final source-readiness checks explicitly match imported filenames, preventing
  the live demo from satisfying a one-image count assertion. The added transparent
  source reports zero and its saved PNG independently confirms zero colors. Shape
  with first None correctly keeps its established fallback to the other ink; an
  initial assertion expecting zero was a test assumption, not an app defect.
- A rebuilt dist invalidated lazy chunks in an old Codex tab. Repeating in a fresh
  tab loaded the final build and both imports passed; no source fix was made for
  this mutable-local-server test setup.
- Android initially had no authorization. After acceptance, the active Brave
  socket was process-specific. CDP attachment also redirected downloads to an
  unusable host path; restoring default native download behavior fixed the test.
  No browser sandbox/security preference was weakened.
- Automatic review rejected a broader Downloads/screen diagnostic due to potential
  unrelated private content. It was not run. The replacement inspected only the
  exact uniquely named app-test download; app screenshots were scoped to our page.
- No physical landscape rotation, Safari/macOS/iOS or universal memory/frame-time
  guarantee is claimed. Touch landscape was tested in sandboxed desktop Edge.
- Large unproven 1-bit counts intentionally remain absent until exact evidence.
  A larger mask-worker/cooperative conversion rewrite needs a separate study.
- The efficiency slider marker remains deferred: with dithering, All can use two
  colors while Max 2 changes every pixel. Used count cannot honestly mean a
  no-further-effect cap. No setting or marker was added.

All requested production changes and the review correction are separate local
commits. Nothing was pushed or deployed.
