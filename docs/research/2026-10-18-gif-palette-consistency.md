# GIF palette consistency — October 18, 2026

## Supplied files and independent findings

The original `idle_rotations_4dir (2).gif` and supplied Colorfetti export are
92×92, four-frame animations. Both have 25, 27, 18 and 27 unique visible RGBs per
frame, and **29 across the whole clip**. Every decoded RGBA byte, delay (200 ms
per frame), dimension and loop value matches between them. The supplied export
did not lose or change artwork colors. A separate Windows GDI+ decode confirmed
the source's per-frame counts and union; the app's GIF decoder was not the only
count oracle.

| Representation | Stored slots | Unique stored RGB | Visible artwork RGB |
| --- | ---: | ---: | ---: |
| Original GIF global table | 32 | 27 | First frame: 25 |
| Original GIF, all global/local tables | Four 32-slot tables | 31 | Whole clip: 29 |
| `palette.aseprite` | 37 (indices 0–36) | 31 | Contains all 29 artwork colors |
| Export GIF global table | 32 | 30 | Whole clip: 29 |
| `output_palette.aseprite` | 32 (indices 0–31) | 30 | Contains all 29 artwork colors |

The original Aseprite document begins with the original GIF's global table and
adds a duplicate transparent green plus four RGBs from local frame tables. Its
37 slots include six black entries and two green entries. All 31 unique stored
RGBs agree with the GIF's complete table union. Green is the transparent index;
black padding is unused, leaving 29 visible RGBs. The displayed final index 36
therefore does not mean 36 visible colors.

The output Aseprite table matches the exported GIF's global table entry for
entry. Slot 0 is transparent and duplicates slot 1's RGB; two black padding entries
are unused. There are 29 visible RGBs, 30 distinct stored RGBs and 32 stored slots.
The displayed final index 31 likewise does not mean 31 visible colors.

The Auto palette sorts its exact source RGBs deterministically. Export compacts
used colors into one global table and pads it to a legal power-of-two size.
Those table/index changes preserve the visible RGBA pixels; source local table
indices are not a preservation contract.

## Confirmed defects and changes

`Auto copy (1).hex` contains 51 distinct RGBs. Exactly 25 are true colors of the
original GIF's first frame; the other 26 differ by small channel perturbations.
The four colors that first appear later are absent: `#887263`, `#945f35`,
`#3c4442`, `#6f5b52`.

Palette-image import previously decoded GIFs through `createImageBitmap` and
canvas readback. Artwork animations used an independent indexed decoder. The
first-frame-only palette path both omitted later colors and exposed palette
acquisition to browser readback perturbations. The later isolated Brave diagnostic
directly reproduced 25 first-frame colors becoming 51 and identified default-Shields
RGB least-significant-bit perturbation in the installed version's source. All 26
historical extras have that signature. The old Codex Browser canvas path returned 25;
this difference between browsers was diagnostic evidence, not a reason to dismiss
the supplied HEX. See [the full diagnostic review](2026-10-18-palette-diagnostic-review.md)
for controls, exact provenance, follow-up fixes and final validation. The fix removes
GIF canvas readback; it does not merge similar colors heuristically.

GIF palette import now uses artwork's indexed compositor
and unions every frame, with an explicit editor notice. Every color and Find
solid colors rescan compressed GIF bytes without retaining a decoded clip.
RGB membership remains exact past 4096 colors while review strings stay bounded.
Transparent/unused entries never become image colors.

Single-frame artwork GIFs also previously made a worker→native bitmap/canvas→
worker round trip. They now analyze and transfer the existing exact indexed
pixels once, with the same exact cooperative fallback and still-image PNG Save
semantics. The follow-up review also extends native still decoding to PNG/JPEG/WebP/BMP,
handles pure orientation without canvas and strictly rejects malformed GIF pixels.

The sub-agent challenged disposal/background handling with a partial opaque
GIF. GDI+ paints an uncovered global background there, but actual Codex Browser
`createImageBitmap` and native `ImageDecoder` expose transparency instead.
Both native frames agreed with Colorfetti's compositor. No background behavior
was changed based on the conflicting non-browser oracle; a worker regression
test records the independently observed browser result.

## Validation

The actual Codex Browser file-picker flow imported the original artwork with 29
colors, downloaded a pixel-exact four-frame GIF, imported its palette with 29
colors, and downloaded a HEX whose exact RGB set equals the complete source
clip. Every→Solid→Every produced 29→8→29; saving the imported palette retained 29.
A 390×844 viewport showed the count, swatches, new scope notice, HEX backup,
Close and Save without horizontal page overflow.

The included acceptance harness serves unmodified production JS/CSS inside an
iframe, uses real DOM event handlers and validates captured PNG/GIF/ZIP data
outside the app encoders. Run:

```powershell
npm run build
node bench/gif-palette-qa-server.mjs --downloads C:/Users/name/Downloads --port 5306
```

Open `/qa` in Codex Browser and run the checks. Omit `--downloads` to use only
synthetic fixtures. `/qa?touch=1` supplies a test-only coarse-pointer/no-hover
capability shim before app startup; combine with a phone viewport. This checks
touch UI branches, not physical touch hardware. Reports and captured exports
are written under `.tmp/gif-palette-qa/`. `/probe` independently displays native
browser background behavior for the challenged partial-frame fixture.

Unit coverage includes exact local-table unions, disposal 1/2/3, interlacing,
shared borrowed-buffer sequencing, per-frame solid eligibility, MIME/extension
routing, malformed/oversized data, cancellation/read failures, bounded review
with an exact 4352-color union, Auto and GIF round trips, worker recovery and
mixed queued native PNG/GIF imports. Existing conversion and export suites run
alongside these focused regressions.

Initial-commit validation (`6f8238a`): **1091 unit tests passed, 2 pre-existing tests skipped**, across
66 passing test files; production build passed. The actual Codex Browser passed
all 15 acceptance checks at desktop 1280×720 and phone 390×844 with the touch-UI
capability shim, with zero runtime errors. Phone document and iframe scroll
widths equaled their client widths (375px after the vertical scrollbar).
Both runs confirmed exact supplied GIF pixels/timing, palette imports 29/29,
Aseprite unique counts 31/30, preserved HEX 51, solid 8→every 29, malformed-import
draft retention, 510/4335-color limits, saved-palette restoration, cap 8→All,
exact single-GIF PNG Save, exact mixed ZIP and 1-bit return to Palette.
`desktop-results.json`, `phone-results.json`, `probe.json`, screenshots and
decoded export checks are retained under `.tmp/gif-palette-qa/`. The independent
review challenged and verified the same changes; source RGB preservation is
tested rather than inferred from equal color counts.

One large GIF LZW frame remains synchronous during palette import;
scanning and between-frame work yield cooperatively. The fix does
not establish a universal frame-time bound. Safari/iOS and physical touch
hardware were not validated in this task.
