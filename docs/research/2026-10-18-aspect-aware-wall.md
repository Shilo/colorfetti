# Aspect-aware image wall — October 18, 2026

## Problem and decision

Square artwork areas preserve a regular wall, but waste substantial space around
rectangular sources. The supplied `aurora-1x.png` is 256×1: the old square frame
separated its thin painted strip from its caption by hundreds of empty pixels.
The change must improve image visibility while keeping titles, actions, alignment,
source order and the existing conversion/export behavior predictable.

Use **ordered, balanced rows with bounded artwork frames**, plus full-width shallow
rows for exceptionally wide sources. Preserve each source's proportions inside its
frame. The bounds apply to the presentation frame, never to the image pixels.

## Research and alternatives

| Layout | Useful property | Fit for this application |
| --- | --- | --- |
| Square grid | Regular columns and baselines | Retains the reported empty-space problem and limits wide-image display width. |
| Masonry or CSS columns | Packs varying natural heights tightly | Produces staggered caption baselines; tall strips dominate columns. Column flow and dense packing also complicate the relationship between visual, source and keyboard order. |
| Pure justified rows | Shared row heights and uncropped source proportions | Works well for ordinary photographs, but extreme portrait cards become too narrow for titles/actions and 256:1 sources collapse row height or dominate row width. |
| Bounded, balanced rows | Consistent row baselines with readable card widths | Chosen for ordinary images. A modest amount of containment space is preferable to cropped pixels, unreadable titles or arbitrary packing. |
| Exceptional full-width strip rows | Maximizes strip width and keeps its caption nearby | Chosen only for source ratios at least 12:1; normal images before and after remain in contiguous ordered segments. |

Primary sources informed the design rather than supplying universal size rules:

- [Flickr's justified-layout documentation](https://flickr.github.io/justified-layout/)
  accepts aspect ratios or source dimensions and returns geometry. Its target row
  height, tolerance, spacing and incomplete-row controls demonstrate the useful
  tradeoffs of aligned, uncropped rows.
- [Flickr's justified-view announcement](https://blog.flickr.net/en/2012/02/28/announcing-justified-view/)
  explicitly describes preserving original aspect ratios without cropping.
- [W3C Technique C27](https://www.w3.org/WAI/WCAG22/Techniques/css/C27)
  explains why visual presentation and DOM order should agree. Keeping contiguous
  source slices in successive rows avoids a visual/focus ordering mismatch.
- [CSS Grid Level 3, reordering and accessibility](https://www.w3.org/TR/css-grid-3/#reordering)
  describes possible backtracking in masonry placement, especially with spanning
  items. This is a Working Draft; the implementation uses explicit JavaScript
  geometry and established CSS rather than depending on experimental masonry.

The specific bounds and strip threshold are application design choices evaluated
against the app's images, captions and available workspace, not recommendations
claimed by those sources.

## Geometry and strip threshold

Ordinary rows use source ratios bounded to 1:2–4:1 for frame allocation, readable
minimum card widths of 164px on touch and 180px on mouse, and a 56px minimum artwork
area. Pixels remain contained at their actual ratio. Rows share an artwork height
and caption baseline; incomplete rows are centered and grow by at most 20% above
the candidate target. Normal collections prefer larger readable rows that fit;
otherwise the wall scrolls. A single image fits its natural ratio independently.

Sources at least 12:1 receive a full-width strip row, with artwork height equal to
the natural fitted height or 56px, whichever is larger. The 56px floor keeps a
usable comparison/Preview target without retaining a square's empty area.

An initial 8:1 threshold isolated ordinary wide test artwork too often and forced
avoidable scrolling. Raising the threshold to 12:1 retains 8:1 sources in balanced
rows while still recognizing extreme strips. In a representative 1400×730 mixed
wall, the exceptional strip frame changed from 868×217 to 1400×56. The resulting
collection height increased from 563px to 706px and still fit without scrolling.
This trades some overall packing density for substantially wider strip visibility
and much less empty space within that strip's own frame.

Breakouts remain in their original sequence. Their fixed shallow heights do not
lower the minimum-normal-row-height optimization score. All normal segments are
evaluated together against the same complete wall-height budget; separate segments
do not each receive the full available height. Consecutive strip rows retain one
consistent gutter without inserting an empty ordinary row.

## Captions, actions and focus

Mouse captions retain their original single-line 27px title bar: filename left,
count then resolution right. Their footer allowance is 35px, including the 8px gap.
Touch captions retain 52px with stacked name/metadata and a 44px More target,
using the existing 62px allowance. The filename can ellipsize; its complete label
remains available through its accessible name and tooltip. Empty-example Add
captions retain their original special layout.

Desktop actions remain a horizontal hover/focus capsule, including on thin strips
and narrow portrait cards. At widths up to 248px their buttons use 28px targets;
below 180px they use 24px and tighter gaps. This keeps the capsule within the
minimum 56px artwork height without replacing desktop actions with a touch sheet.
Touch buttons remain 44px. Resizing retains the focused desktop action.

The first implementation incorrectly applied the stacked 52px title bar to mouse
input and showed mobile More on smaller desktop cards. The user identified this
regression. The correction removes those universal overrides and the geometry-
dependent desktop/mobile action switch, restores input-specific layout allowances,
and restores desktop metadata alignment/order. Earlier tests checked containment
but encoded the changed presentation as expected behavior, so they missed this
regression. The harness now explicitly asserts single-line desktop captions, no
desktop More, retained hover actions, and stacked captions/44px More on touch.

Removal through the touch sheet continues to select a visible next focus target.

## Integration and performance boundaries

`workspace.js` calculates geometry from dimensions. `App.svelte` passes that geometry
to stable keyed Tile siblings in one parent; row regrouping does not remount images,
restart GIFs or discard conversion ownership. The parent retains the complete
computed height so absolute card positions participate in the wall's scroll extent.
Wall-only geometry selectors leave the Preview viewer's independent sizing intact.

Tile already measures both artwork axes and derives conversion sampling from the
actual contained image size. `shown()`, draft budgets, pixel conversion, full-source
counts, original comparison and exports keep their existing pipelines. The wall's
checker-grid representative scale now derives from both fitted axes rather than
assuming a square. Unchanged source dimensions do not trigger geometry work when
analysis objects are replaced.

## Desktop-caption regression correction

The corrected build is `index-LcxoJT56.js` / `index-j25o39me.css`. Its caption
and action presentation is selected by input mode, never by source aspect ratio
or a small desktop viewport. The correction removes the geometry-driven switch
to touch controls instead of adding another breakpoint.

- `codex/desktop-restored-results.json`: 30 passing Codex browser states, two
  populations across 15 viewport sizes, explicitly checking single-line captions,
  no desktop More button, visible horizontal hover controls and capsule bounds.
- `desktop-restored-unit-tests.txt`: all 82 files pass, 1,371 tests pass, two skip.
  The additional wall test checks separate 35px mouse/62px touch footer allowances.
- `geometry-fuzz.json`: the updated 10,000-case probe passes with both footer sizes.
- `results/firefox-desktop-restored-quick.json`: 13/13 groups pass, no page errors.
- `results/webkit-desktop-restored-quick.json`: all 13 functional groups pass;
  the same desktop strip/resize notifications documented in the initial baseline
  comparison remain recorded rather than suppressed.

Browser assertions now check 26–27px desktop caption height (browser font metrics
can differ by half a pixel), filename and metadata on one line, count before
resolution, retained hover actions and their bounds, and focus retention during
resizing. Touch assertions require the stacked 52px caption, 44px More target and
hidden hover capsule. Preview tests use uncovered artwork coordinates so they
exercise the image rather than intentionally overlaid Save/Copy controls.

The full Chromium rerun (`results/desktop-restored-full.json`) passed all 162
groups with zero page errors, including all 144 layout groups, 12 Preview/export
groups and six desktop hover/focus/removal groups. Earlier reports below describe
the first implementation and must not be used to justify the rejected desktop
presentation. Build and whitespace checks also passed for the correction.

## Initial validation before the desktop-caption correction

The local reproducible fixture generator and browser harness are
`bench/aspect-wall-2026-10-18/fixtures.mjs` and
`bench/aspect-wall-2026-10-18/qa.mjs`. The fixture manifest includes 16 sources:
square, 4:3/3:4, 16:9/9:16, 3:1/1:3, 8:1/1:8, 256:1/1:256,
transparent, 1×1, long-name, and wide/tall animated GIF examples.

The Codex browser viewport record,
`bench/aspect-wall-2026-10-18/codex/viewport-results.json`, records 122 passing
wall states: six image combinations across 15 viewport sizes, another 30 states
with Palette/Recolor panels open, and the actual supplied strip at desktop and
phone widths. The sets cover all 16 fixtures, six squares, seven mixed sources,
six extremes, six portraits and six landscapes. `codex/empty-results.json` adds
15 passing empty-example/Add-caption checks. The actual source's Preview zoom,
Fit and return to the wall were exercised separately. These use the final
production build (`index-BjSFpT11.js`, `index-XMPMrX6n.css`). Codex viewport changes
do not switch its desktop pointer type; touch checks below are separate.

The full production Edge 155.0.4283.62 run (`results/full.json`) passed all 162
groups with zero page errors: 144 image-population/layout groups across 12
viewport/input configurations, 12 Preview/export groups, and six keyboard-focus/
sheet-removal groups. It imported 948 image placements and checked 144 exported
source dimensions across individual Palette saves and Palette/1-bit ZIPs. Each
layout group additionally exercises both panels, live resize, stable Tile nodes,
source order, row baselines, gutters, caption bounds, 44px More targets and
scroll reachability. Phone cases emulate touch at DPR 2–3. Desktop, tablet,
portrait and short landscape viewports range from 320×568 to 1920×1080.

Firefox 153.0's representative suite (`results/firefox-quick.json`) passed all
13 groups with zero page errors, covering desktop, phone-width/touch and landscape
populations plus Preview/exports and desktop focus/removal. Firefox omits the
unsupported Playwright `isMobile` flag. WebKit 26.5 passed all 13 geometry and
functional groups, with two recorded ResizeObserver notifications. Its report
deliberately retains `pass:false` because those events are not filtered out.

Both WebKit notifications reproduce in the unchanged app at HEAD `765f76f0`.
The same baseline QUICK suite reproduces the desktop/single-strip notification;
a separate matched 1280×900 → 320×360 focus/resize sequence produces exactly one
identical notification in both baseline and candidate. No new notification or
functional regression was demonstrated. Evidence is
`results/webkit-baseline-quick.json`, `results/webkit-phased-quick.json` and
`results/webkit-resize-observer-compare.json`; the matched sequence is reproducible
with `resize-observer-compare.mjs`. These existing WebKit resize notifications
remain a known limitation rather than being hidden or described as a clean
error-free WebKit run.

All 82 Vitest files passed: 1,370 tests passed and two were skipped
(`unit-tests.txt`). The 17 wall tests include ratio/viewport matrices, every
ordered triple of six key ratios, strip positions/consecutive strips, square
regressions, transitional sizes and 5,000-item geometry. The reproducible seeded
probe (`geometry-fuzz.mjs` / `geometry-fuzz.json`) passed 10,000 cases containing
303,012 images and 83,703 ultra-wide-strip checks. `npm run build` and
`git diff --check` also passed.

The retained `results/baseline-quick.json` / initial `results/quick.json` are
intermediate reports. Their compact-focus failure led to the two-direction focus
repair; the final full run explicitly passes that case. Two additional test-fixture
errors were corrected: a 300px viewport did not actually cross the compact-action
threshold, and two tall images were not compact at a wide viewport. Final focus
fixtures explicitly enter compact mode before asserting focus or opening More.

## Limits

Browser mobile viewports and Chromium touch emulation are not physical-device
verification. This change has not been verified on physical Android, iOS or Safari.
Finite fixture combinations cannot prove every possible ratio, viewport and
interaction sequence free of defects.

A 256:1 image displayed 350px wide is about 1.37px tall. Removing empty frame space
and increasing available width help, but a layout cannot make that image thick
while keeping its entire width visible and preserving its proportions. Existing
Preview zoom remains the way to inspect those pixels. Extreme tall images likewise
retain some lateral containment space so their captions remain readable. Repeated
exceptional strips can produce a longer scrolling wall; this is the explicit
tradeoff for maximizing each strip's display width.
