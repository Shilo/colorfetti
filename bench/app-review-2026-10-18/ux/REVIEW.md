# Functionality and UX review — October 18, 2026

Four discrete observations were checked with CUA in the current static build at
`http://127.0.0.1:5192/`, 1280×720. This is not an automated pass count.
`ui-receipt.json` records build identity, exact observations, screenshots,
fixture metadata and limitations. No production source was changed by this review.

## Priorities

| Priority | Finding | Evidence and actual consequence | Improvement |
| --- | --- | --- | --- |
| P2 | GIF preview ignores finite/no-loop playback | `src/Tile.svelte:356` always wraps modulo frame count; no `item.loop` read exists in Tile. `play-once-slow.gif` has no loop extension (`loop:null`), dark1000ms then white3000ms. The third wall tile is white in `loop-sequence-0.png`, dark again in `loop-sequence-2.png`, and white in `loop-sequence-4.png`, with no navigation/settings changes. Fully in-view tile rect was x853,y101.5,402². Save of a separate play-once fixture retained null loop and exact2000/100ms delays. Preview therefore gives a different playback impression from the downloaded file. | Honor source repeat count; provide Replay and an explicit preview Loop override if continuous comparison is useful. Export must keep source metadata unless the user changes it deliberately. |
| P2, capability/disclosure | Maximum zoom cannot necessarily inspect exported pixels | For a20-frame1024² GIF, Fit and maximum16× both kept a720² canvas, displayed11520² at maximum. There is no sampling disclosure, numeric zoom, or actual-size control. `src/lib/viewer-layout.js:12–14` budgets refinement across the entire clip; `src/ImageViewer.svelte:21` uses it. This is documented intentional memory behavior, not a new conversion bug. A user judging one-pixel loss, Cleanup or source-pixel dithering can see enlarged samples instead of the actual exported pattern. | Keep the memory bound. Disclose sampled dimensions, show zoom relative to source pixels, add actual size, and offer explicit full-resolution inspection of one paused frame or a cropped region. Do not allocate a full converted animation to solve inspection. |
| P2 | Import errors discard the actionable cause | `src/App.svelte:659–670` catches every noncancel failure, increments only a count, and tells the user which formats are supported. A malformed `broken.png` produced “1 file skipped. Colorfetti reads PNG, GIF, WebP, JPEG and BMP images.” There is no filename or decode reason, and the toast expires. | Retain a bounded per-batch failure list with filename and a safe cause category (unsupported/corrupt/browser decode/resource failure); show actionable recovery and a dismissible persistent detail. Preserve successful files and cancellation. |
| P3 | Preview commandeers Space on native toolbar buttons | `src/ImageViewer.svelte:44–47` captures Space even when Close/Zoom/Save has focus. Browser confirmation: Space on Close leaves the viewer open and compares; Enter closes. This differs from the standard button interaction and is especially surprising after tabbing through tools. | Reserve compare-on-Space for artwork/dialog background; let native buttons use Space normally. Retain Enter and Escape. [W3C Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) specifies Space and Enter activation. This review does not label it a blanket WCAG2.1.1 failure because Enter remains usable. |

## Output-review improvements, separately from bugs

The highest-value larger UX experiment is a focused animation inspection workflow:
Pause/Play, previous/next frame, frame/delay display, and an explicitly named Copy
first frame or Copy current frame action. Today Tile only runs a timer
(`src/Tile.svelte:347–357`), while Copy always calls `still(item,asked)` on the first
frame (`src/App.svelte:889–899`). Viewer and wall tooltips only promise a PNG
(`src/ImageViewer.svelte:70`, `src/Tile.svelte:403`). A user can therefore see a
particular animation frame and copy a different one without an upfront explanation.
First-frame Copy is an established product contract; changing that default would
be a deliberate design decision, while naming it accurately is a smaller improvement.
Frame inspection also makes temporal Cleanup/dither regressions much easier to judge.

For transparent art, add a display-only proofing background in Preview: checker,
white, black and custom game/UI background. Current proofing is the theme-bound
checker (`src/glass.css:6`, `src/glass.css:24`, `src/canvas.css:17`). Surrounding color
changes perceived contrast and exposes alpha fringes; a destination preview would
help users judge Keep/Cut and dark outlines while preserving exported alpha. This
is an output-review capability proposal, not evidence that the current RGB mapping
is incorrect or that a background-dependent matcher should replace it.

## Resilience hypothesis requiring a targeted test

Base matching/dither preview rejection is caught only with a console error at
`src/Tile.svelte:300`. Limiter/Cleanup have explicit retained-picture failure and
Retry/export ownership, but this catch does not participate. A transient allocation
or rendering rejection could leave an old preview with no visible explanation and
an independently successful export. No natural failure or injected browser witness
was produced; do not present this as a confirmed corruption bug. A targeted
fault-injection acceptance check is appropriate before expanding failure ownership.

## Research boundaries

The October16 navigation/usability contracts and October15 remaining-work audit
were read. This review does not reopen rejected Auto-at-K/alpha-weighting/matching
experiments as if they were pending improvements, nor recommend replacing Oklab
from a UX inspection alone. No physical touch, iOS or Safari behavior was checked.
Production exploration was superseded by local-build checks. The original
Playwright probe was canceled without a result and removed; `fixtures.mjs` only
generates synthetic files. Browser actions used CUA for the recorded evidence.
