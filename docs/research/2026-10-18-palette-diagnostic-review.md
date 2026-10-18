# Palette diagnostic and adversarial review — October 18, 2026

## Conclusion

The supplied GIF has **29 visible RGB colors across four frames**. The supplied
Colorfetti GIF preserves every visible pixel, alpha byte, 200 ms frame delay and
loop value. Its reordered palette is valid. The palette importer had two separate
defects: it sampled only frame one, and its canvas readback allowed Brave's default
fingerprinting protection to introduce false RGB variants. Both are now removed
from the GIF path. This conclusion includes an actual isolated Brave reproduction,
known-byte controls, independent decoders and the installed browser's source.

| Observation | Meaning | Correctness |
| --- | --- | --- |
| Aseprite source final index 36 | 37 slots; 31 distinct stored RGBs, including transparency/padding; all 29 visible colors present | Correct table, not a count of visible colors |
| Colorfetti Auto caption 29 | Visible RGB union of the entire animation | Correct |
| Aseprite output final index 31 | 32 slots; 30 distinct stored RGBs, including transparency/padding; 29 used visibly | Correct table and output |
| Imported HEX 51 | 25 true first-frame RGBs plus 26 false variants; four later colors absent | Incorrect acquisition; saving those 51 explicit HEX entries itself was faithful |

Full stored-table comparisons are in [the initial investigation](2026-10-18-gif-palette-consistency.md).

## Direct diagnosis of the 26 false colors

The original GIF's per-frame visible RGB counts are **25, 27, 18, 27**. All alpha
values are 0 or 255. The file contains NETSCAPE looping and graphic-control
extensions, with no ICC/profile extension. Windows GDI+ independently confirmed
the source counts. The output GIF's complete decoded RGBA agrees with the source.

All 26 extra HEX entries have one unique nearest first-frame RGB parent. They map
to 15 parents. Twenty-five flip one channel's least-significant bit; `#dccdb3`
flips R and G bits relative to `#ddccb3`. No higher bit changes. The absent later
colors are `#887263`, `#945f35`, `#3c4442` and `#6f5b52`.

The user confirmed Brave default Shields, without privacy extensions, and
authorized an isolated command-line Brave diagnostic. Tests used installed Brave
1.97.59 (executable file version 155.1.97.59), a separate temporary profile,
default Shields and the browser sandbox. The normal Brave profile was untouched.

One directly observed run of the old GIF bitmap/canvas path produced **25 → 51
visible RGBs**: 256 total pixels changed, 44 visible pixels changed, every RGB
change was XOR 1, and no alpha byte changed. Other fresh sessions produced
different counts. Repeated reads and separate canvases with the same content
within a session produced identical changes.

A control wrote known opaque RGBA bytes with `putImageData`, then read them with
`getImageData`: **15 → 63 colors**. There was no image decoder, profile conversion,
animation, partial alpha or CSS involved. Native GIF `ImageDecoder.copyTo` agreed
with all independently decoded source frames. Opaque PNG/BMP/WebP controls showed
the same canvas perturbation mechanism while native pixels agreed with independent
FFmpeg references. These controls distinguish readback intervention from a GIF
decoder, alpha or color-profile defect.

The installed version's annotated tag resolves to
`c7357bfd2a76c2467ba1ae62593a81ae92c05205`:

- Its [canvas getImageData hook](https://github.com/brave/brave-core/blob/c7357bfd2a76c2467ba1ae62593a81ae92c05205/chromium_src/third_party/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc#L13)
  calls `BraveSessionCache::PerturbPixels` before bytes reach JavaScript.
- The [perturbation implementation](https://github.com/brave/brave-core/blob/c7357bfd2a76c2467ba1ae62593a81ae92c05205/third_party/blink/renderer/core/farbling/brave_session_cache.cc#L353)
  derives choices from session/origin/content, makes 512 selections, selects RGB
  channels and XORs a channel's least-significant bit with a key bit. Repeated
  selections can affect two channels of one pixel. Alpha is never selected.
- The [default protection mapping](https://github.com/brave/brave-core/blob/c7357bfd2a76c2467ba1ae62593a81ae92c05205/components/brave_shields/core/browser/brave_shields_utils.cc#L788)
  selects balanced farbling with default fingerprinting protection enabled.

This directly establishes the mechanism and explains the historical HEX signature.
The historical session seed is unavailable: matching its total of 51 does **not**
reconstruct its exact spatial perturbations or prove identical new RGB sets.

The final repeated diagnostic again showed the mechanism: old GIF readback
25→48 and known opaque bytes 15→62, only RGB LSB changes, no alpha changes,
all four native GIF frames exact and no diagnostic errors. This new session's
different total is expected and retained in `isolated-brave-final-repeated.json`.

## Fixes agreed after challenging the review

The initial fix was committed separately as `6f8238a`, before the follow-up review.
GIF palette import now unions every composited frame using the same indexed
decoder as artwork, including single-frame GIFs, and retains compressed bytes for
rescans. Palette membership uses exact RGB, without rounding or merging variants.

| Review challenge | Evidence and agreed change |
| --- | --- |
| Metadata validation alone cannot prevent manufactured GIF colors | Two framed malformed GIFs showed omggif silently filling a short stream and reading index 3 beyond a two-entry palette as unrelated file RGB. Replace only its private LZW/blit with one validating pass; retain its framing parser. |
| A second full validation decode adds cost and memory | The new blitter validates dictionary references, exact output count, indices and termination while copying RGB once. Fixed dictionary/stack total 20 KiB; no expanded index image. |
| Strict end-code checking can reject writer-compatible files | A final code-width growth case from omggif needs a narrowly bounded terminal EOI exception. Positive and neighboring invalid cases are tested; native Codex Browser also accepted the 18-pixel fixture. |
| Catch-all worker recovery could restore canvas corruption | Classify integrity failures as `GIF_INVALID`; never route recognized GIFs through canvas. Runtime/transport failures recover from the immutable File with the same exact decoder. |
| Other still formats still used noisy readback | Extend the existing native PNG path to JPEG/WebP/BMP where supported; preserve browser color management. |
| Filename and MIME can disagree | Recognized MIME first, then a distinct recognized extension. Prototype property names cannot become type hints. Cancellation checked before each attempt and after negative support probes. |
| EXIF transform fallback still invokes noisy canvas | Proven pure rotations/flips now permute native bytes, clockwise rotation then horizontal flip, with no resampling. Physical/presented dimensions must agree. |
| Independent JPEG/profile decoders disagree legitimately | Preserve reference provenance. Compare browser Original to an independent platform invocation using the same input mode; retain independent pixel goldens for low-color lossless/control exports. |

Ordinary packed sRGB RGBA/BGRA frames copy their native bytes, with BGRA channel
swapping only. Other known spaces request managed RGBA/sRGB. Unknown/all-null
color space retains the old canvas route because Firefox may expose premultiplied
BGRA that neither native copy mode unpremultiplies correctly. Pure orientation
adds one RGBA output buffer only when needed and yields/cancels cooperatively.

## JPEG and profile controls

Opaque PNG, BMP, lossless WebP and the low-color JPEG control matched independent
FFmpeg RGBA through native acquisition and real Auto/Save output. Partial-alpha
PNG/WebP controls cover alpha 0, 1, 2, 64, 127, 128, 254 and 255; Keep saves every
visible RGB and alpha byte exactly. Palette imports add no variants.

Gradient JPEGs deliberately test a different contract. FFmpeg, browser JPEG
decoding and browser YUV-to-RGB copying can produce different legitimate RGBs.
For the subsampled 96×64 JPEG in actual Codex Browser, the same native API exposed
packed BGRX with **6142 colors from File.stream()**, but I420 with **5490 colors
from an ArrayBuffer**. Colorfetti's Original correctly matched its streaming path,
6142. The acceptance harness initially used the buffered path and falsely failed;
it now records both input modes and compares the matching acquisition path. No
source change was made to force one decoder's count onto another.

Gradient EXIF 2–8 cases check oriented dimensions and native RGB unions. An
embedded linear-RGB ICC fixture uses an independently generated Java LCMS managed
sRGB reference, explicitly labeled as such. Small browser/LCMS rounding differences
are not treated as defects or justification to bypass the profile. Native-vs-canvas
comparisons separately isolate readback changes.

## Reproduction and evidence

The public diagnostic uses synthetic GIF/known-byte controls by default; optional
local files are served only on loopback and never enter the repository:

```powershell
node bench/make-palette-diagnostic-fixtures.mjs --output .tmp/palette-diagnostic-fixtures --profile
npm run build
node bench/gif-canvas-diagnostic-server.mjs --gif 'C:/path/source.gif' --hex 'C:/path/palette.hex' --stills .tmp/palette-diagnostic-fixtures --port 5317
node bench/gif-palette-qa-server.mjs --stills .tmp/palette-diagnostic-fixtures/manifest.json --out .tmp/palette-qa --port 5323
```

The fixture generator requires FFmpeg; `--profile` additionally requires JDK 11+.
Omit that flag for the independent FFmpeg controls. `/qa` exercises unmodified
production code using real DOM handlers and captures actual downloaded blobs;
the local server independently decodes PNG/GIF/ZIP output. `/qa?touch=1` supplies
a coarse-pointer/no-hover capability shim, to combine with a phone viewport.
It exercises touch UI branches, not physical touch hardware. Add `--downloads`
to the QA server only when reproducing the supplied private file comparisons.

Raw local evidence is retained under `.tmp/gif-palette-diagnostic/`: the
`forensics/pixel-report.json` includes all 26 mappings and source tables;
`isolated-brave-still-formats.json` contains the observed 25→51 run;
`isolated-brave-advanced-repeated.json` contains advanced native/canvas controls;
`review.md` and `final-review.md` record independent challenges and resolutions;
`qa-final/` contains production acceptance reports and decoded export artifacts.

## Validation and limits

The repeated complete suite passed **1156 tests, two existing skips, 67 test
files**; production build passed. Independent adversarial checks included:

- 100 random compositing clips, 956 frames; an independent scalar model agreed.
- 1000 known-index writer GIFs, 1,642,516 source pixels, agreed exactly.
- 20 distinct bounded repository GIFs, 503 frames / 38,942,976 logical pixels,
  agreed with the previous decoder on valid files.
- 40 independently FFmpeg-encoded GIFs, 102 frames / 209,715 logical pixels,
  agreed with independent FFmpeg RGBA.
- 112 orientation cases, 2,238,208 RGBA bytes, agreed with independent matrix
  transpose/reverse operations, including nonsquare and degenerate dimensions,
  RGBA/BGRA and partial alpha. Cancellation closed native resources without fallback.

Final production acceptance passed **20 check groups in each of three runs**:
Codex Browser at 1280×720, Codex Browser at 390×844 with the touch-UI capability
shim, and isolated Brave at 1280×900 with default Shields. Every run used the
supplied GIF/Aseprite/HEX files plus the public 23-fixture still corpus and had
zero unexpected runtime errors. The seven low-color EXIF controls also passed
independent visible-RGBA PNG Save comparisons, beyond gradient dimensions/counts.
Phone document and app scroll widths both equaled their client widths, 375px.
An additional real file-chooser import visibly showed 29 colors and the every-frame
notice. Receipts: `qa-final/codex-desktop-results.json`,
`qa-final/codex-phone-results.json`, `isolated-brave-final-qa.json` and
`qa-final/palette-29-phone.png`, under the local diagnostic directory above.

No regression was found in the tested flows. This does not establish universal
browser/profile support: native API absence, unknown color metadata, scaling and
unsupported copy formats retain potentially perturbed canvas fallback for non-GIFs.
Parser-unsupported GIF features now fail explicitly. One huge GIF frame remains
synchronous; per-frame parser metadata is not bounded by the scanner's 2 MiB
membership bitmap. Safari/iOS and physical touch hardware were not tested here.

## Cross-browser follow-up and fresh independent review

The user requested another independent challenge and testing in other installed
browsers, then authorized isolated command-line profiles. Edge 155.0.4283.62 and
Firefox 157.0.1 were available. Google Chrome was not found in the standard
system/user installation paths or registered App Paths, so no branded Chrome
result is claimed. Codex Browser supplies additional Chromium coverage.

The fresh reviewer found a valid-GIF defect in GifReader's existing metadata:
graphic-control transparency, disposal and delay incorrectly persisted into
later image descriptors without a control of their own. A two-frame 1×1 GIF
should display opaque blue then opaque red, but the app lost red. Root required
a native browser countercheck before accepting the finding: Edge and Firefox
both returned the expected opaque pixels, independently agreeing with FFmpeg.
Native raw delays differed (Edge 0, Firefox 100 ms on the uncontrolled frame);
the app retains its existing 0/1-centisecond → 100 ms playback rule.

The agreed narrow repair scans only structured extension framing between known
image offsets, skipping length-prefixed comment/application payloads. Without a
real graphic control it resets the three inherited fields. No second LZW decode,
new GIF feature or whole parser fork is introduced. Tests cover missing controls,
local tables, misleading control-like payload bytes, disposal 3, explicit controls
across extensions and malformed extension bounds. Palette acquisition, artwork
and Save now independently preserve both colors in production. This is separate
from the original 26 false colors: the supplied sprite already has frame controls.

Root rejected a separate proposal to paint an uncovered logical GIF background:
that would contradict already measured native browser transparency. The reviewer
agreed to leave it unchanged. Strict validation claims refer to frame LZW/index
integrity, not rejection of every malformed container accepted by GifReader.

Firefox's partial-alpha control exposed a **pre-existing acquisition limitation**:
native BGRA reports all-null color metadata and exposes premultiplied RGB. The
existing bitmap/canvas path unpremultiplies it but cannot recover the original
low-alpha RGB bytes. Both partial PNG and WebP controls have 14 raw visible RGBs
and 34 acquired RGBs. A direct earlier/current module comparison using
`6f8238a:src/lib/image-decode.js` found **zero changed bytes**, and alpha remained
exact. Opaque PNG remained 15 colors and byte exact. This is not presented as
raw-source preservation in Firefox or as a regression introduced by this work.

For native-absent/all-null partial-alpha paths only, the harness independently
acquires stable browser-managed pixels twice and compares Save to those pixels.
It still compares every acquired alpha byte with FFmpeg and records raw/acquired
counts, changed visible pixels and maximum RGB deltas. The two Firefox fixtures
each report 9472 changed visible pixels, maximum channel delta 219, alpha changes
0; the largest RGB differences occur at extremely low alpha. Healthy native
Chromium paths retain strict independent FFmpeg pixel oracles. GIF and opaque
controls are never relaxed. Firefox Original gradient counts also compare with
an independent browser-managed acquisition, rather than skipping those counts.

After the source repair, **1161 unit tests passed, two existing skips, 67 files**;
production build and QA syntax checks passed. The reviewer independently checked
66 GIF clips / 310 frames / 378107 logical pixels against FFmpeg, including 30
clips with omitted controls. All agreed after the fix. Root and reviewer agreed
on the source fix, the rejected background change and the conditional Firefox
oracle with its disclosed limits.

The expanded **21 acceptance groups** passed with no unexpected runtime errors
in Edge and Firefox at 1280×900 and 390×844, Codex Browser at desktop and 390×844,
and isolated Brave with default Shields at 1280×900. Phone runs use the touch-UI
capability shim, not physical hardware. Receipts remain local under
`.tmp/gif-palette-diagnostic/cross-browser-qa/` (`edge-final.json`,
`firefox-final.json`, both `*-phone-final.json`, `firefox-source-baseline.json`,
`firefox-native-controls.json`, native GCE probes), `cross-browser-final/`
(`codex-desktop.json`, `codex-phone.json`, `brave-desktop.json`, `palette-29-phone.png`) and
`isolated-brave-final-qa.json`. Fresh review details are in
`.tmp/gif-palette-diagnostic/cross-browser-review.md`.
