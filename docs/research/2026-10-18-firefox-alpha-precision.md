# Firefox translucent-color precision — October 18, 2026

## Result

Firefox's measured 14→34-color PNG/WebP acquisition problem can be prevented.
The new fallback requests a non-premultiplied ImageBitmap and copies it through
VideoFrame without painting it into a 2D canvas. Both original partial-alpha
controls now match every independent source RGBA byte, retain 14 colors, and Save
matches the same source pixels. The broader corpus covers all 256 alpha values,
indexed PNG/tRNS, all five PNG row filters, orientation and managed profiles.

The healthy primary ImageDecoder path remains first. A small tagged-sRGB runtime
probe must verify the new route before it receives a user file. Unsupported or
nonconforming implementations retain the existing fallback. No colors are merged,
rounded heuristically or reconstructed from already damaged bytes.

## Exact cause and falsification

Installed Firefox 157.0.1, build 20261005135250, identifies source revision
`737ec77d798755890b062aab541a90d6c75afd19`. Its source explains the observed loss:

- [ImageDecoder.cpp](https://hg.mozilla.org/releases/mozilla-release/file/737ec77d798755890b062aab541a90d6c75afd19/dom/media/webcodecs/ImageDecoder.cpp#l209)
  starts decoding with default surface flags, without NO_PREMULTIPLY_ALPHA.
- [ImageBitmap.cpp](https://hg.mozilla.org/releases/mozilla-release/file/737ec77d798755890b062aab541a90d6c75afd19/dom/canvas/ImageBitmap.cpp#l2210)
  explicitly requests NO_PREMULTIPLY_ALPHA when Blob decoding receives
  `premultiplyAlpha: 'none'`; default color management remains enabled.
- [VideoFrame.cpp](https://hg.mozilla.org/releases/mozilla-release/file/737ec77d798755890b062aab541a90d6c75afd19/dom/media/webcodecs/VideoFrame.cpp#l1717)
  wraps the ImageBitmap surface directly. Starting from a straight-alpha bitmap
  avoids the earlier lossy premultiplication.

Eight-bit premultiplication approximately stores `round(RGB × alpha / 255)`.
At alpha 1, 256 possible channel values collapse into two stored values. Dividing
that byte by alpha cannot recover the original channel. The fix prevents the
initial loss rather than attempting to reverse it.

The actual installed Firefox diagnostic compared multiple independent routes:

| Route | Visible RGBs in each original partial control | Source comparison |
| --- | ---: | --- |
| Default ImageDecoder copy | 36 | Premultiplied RGB; alpha intact |
| Default bitmap → 2D canvas | 34 | Rounded RGB; alpha intact |
| Default bitmap → VideoFrame | 36 | Same earlier premultiplication persists |
| Straight bitmap → 2D canvas | 34 | Painting reintroduces the loss |
| Straight bitmap → VideoFrame RGBA copy | 14 | Every source RGBA byte exact |
| Straight bitmap → WebGL texture/FBO copy | 14 | Also exact, but unnecessary |

The WebGL alternative was rejected because the direct native copy works without
adding GPU contexts, texture limits, context-loss handling or privacy-sensitive
WebGL readback. Ordinary GIF import remains on its independent exact indexed path.

## Implementation and runtime guard

`image-decode.js` lazily loads `image-bitmap-decode.js` only for a recognized still
format when primary native acquisition cannot supply suitable pixels and
VideoFrame exists. The new route uses:

1. `createImageBitmap(blob, {premultiplyAlpha:'none', colorSpaceConversion:'default'})`.
2. `new VideoFrame(bitmap, {timestamp:0})`.
3. Explicit `copyTo` RGBA/sRGB with verified packed layout.

Before the actual file, each request decodes a real 4×2 PNG with an explicit sRGB
chunk. It has distinct rows, midtone RGBs and alpha 0/1/2/64/127/128/254/255. Every
alpha and visible RGB byte must agree with known values. Fully transparent hidden
RGB is outside the visible-color contract. A failed probe never enables this route.

This is a behavior check, not a Firefox version or user-agent assumption. The
probe's PNG structure, CRCs, sRGB tag, dimensions and decoded rows are independently
validated in unit tests. There is no shared probe promise, persistent user pixel
cache or cancellation state that a canceled import could poison.

The explicit sRGB tag matters: Firefox's
[PNG decoder](https://hg.mozilla.org/releases/mozilla-release/file/737ec77d798755890b062aab541a90d6c75afd19/image/decoders/nsPNGDecoder.cpp#l708)
applies its sRGB transform in the default tagged-only color-management mode.
An untagged control could miss a display-profile transformation. The finite
probe is a practical compatibility guard, not proof that every ICC/monitor
transformation is identical across browsers. Native profile management stays on.
[SurfaceCache](https://hg.mozilla.org/releases/mozilla-release/file/737ec77d798755890b062aab541a90d6c75afd19/image/SurfaceCache.h#l55)
includes surface flags in cache identity, so an earlier premultiplied decode does
not substitute for the requested straight decode.

Probe resources close before the actual bitmap opens. Source pixel limits apply
before VideoFrame/application pixel allocation. Each bitmap and frame closes on
success, copy failure, unsupported presentation/layout and cancellation. Aborts
remain authoritative and cannot restart canvas recovery. ImageBitmap has already
applied presentation orientation; the frame must match its extent and require no
additional rotation or flip. The new path never applies EXIF a second time.

## Independent fixtures and measured output

The public fixture generator retains the previous 23 manifest entries and all
51 prior artifact hashes. Three new independent controls add:

- Tagged-sRGB RGBA PNG and lossless WebP with every alpha 0–255 for sixteen RGBs.
- An odd-width 37×29, four-bit indexed PNG with tRNS, fourteen visible RGBs,
  eight alpha levels and all five row filters.

FFmpeg independently verifies all visible RGB and every alpha byte against the
generated inputs. Optional `--profile` writes separate paired linear-ICC PNGs:
identical RGB, one partial-alpha and one opaque. Java ICC color management produces
independent managed references; these do not masquerade as raw FFmpeg profile
goldens in the strict production manifest.

Actual Firefox results using the implemented source module:

| Control | Before | Fixed | Independent RGBA byte differences after fix |
| --- | ---: | ---: | ---: |
| Original partial PNG | 34 colors | 14 colors | 0 |
| Original partial WebP | 34 colors | 14 colors | 0 |
| Opaque PNG | 15 colors | 15 colors | 0 |

For the non-sRGB linear-ICC PNG, root independently decoded its opaque counterpart
through the browser's ordinary color-managed bitmap/canvas path. Comparing the
partial file with that opaque RGB at each visible pixel isolates alpha precision
from cross-CMS rounding. The old route changed 3019 visible pixels, maximum RGB
delta 157; the fixed route changed **zero RGB or alpha bytes**. This proves the
tested profile transform was retained rather than bypassed.

Fifteen paired small-file timing samples observed 0–1 ms medians at Firefox's
coarse timer resolution. They do not establish a meaningful percentage speedup
or universal latency bound; the new per-request verification adds a tiny decode
only to fallback imports. The new module is about 1 KiB gzip and is not loaded
by healthy primary native imports.

## Validation and review

Before the final adversarial review, the complete suite passed **1186 tests,
two existing skips, 68 test files**; production build passed. The new helper's
25 tests cover actual probe structure, exact source bytes, invalid capabilities,
changed probe RGB/alpha, geometry/layout, pixel limits, resource errors and aborts
during probe/source decode/copy, including a successful subsequent request.

The production acceptance harness again requires strict independent source RGBA
for partial files, including Firefox. Its previous browser-rounded reference
override has been removed. Five partial-alpha PNG/WebP controls are independently
pixel checked through real Auto/Keep/Save, and all sixteen low-color palette
imports match independent source RGB sets. GIF, GCE scope, malformed files, EXIF,
JPEG/BMP/WebP/PNG opaque output, generated palette/caps, persistence and ZIP remain
in the same acceptance run.

The 21 acceptance groups passed in Firefox and Edge at desktop and 390×844 with
the touch-UI shim, Codex Browser desktop and phone layout, and isolated Brave with
default Shields. One Firefox automation startup timed out before a session;
repeating with a fresh isolated profile passed. No application assertion failed.
Chrome was unavailable; Safari/iOS and physical touch hardware are not claimed.

Local receipts are under `.tmp/gif-palette-diagnostic/`: `cross-browser-qa/`
contains `firefox-precision-options.json`, `firefox-fixed-source-baseline.json`,
`firefox-precision-profile.json`, `firefox-precision-timing.json` and the
`*-precision-production.json` / `*-precision-phone.json` results; `precision-qa/`
contains Codex/Brave reports and independently decoded exports. The generator's
`precision-corpus/fixture-validation.json` records unchanged legacy hashes and
the new fixture validation.

A fresh sub-agent reviewed the completed implementation and acceptance results,
then independently passed 111 focused tests and twelve additional cancellation,
concurrency, limit and cleanup challenges. It audited all seven browser reports
and independently decoded the five source/export pairs with FFmpeg: 42,033
source pixels matched visible RGB and every alpha byte. Artifact SHA-256 checks
confirmed it examined the saved browser outputs. Its review is recorded locally
in `.tmp/gif-palette-diagnostic/firefox-precision-final-review.md`.

Root challenged the review's native-format assumptions, probe-to-source abort
boundary, pixel-limit propagation and exactness wording. Both agreed that explicit
RGBA/sRGB `copyTo` is the API conversion boundary; adding a speculative source-format
allowlist without a failing example would unnecessarily reject supported behavior.
The additional experiments established no actionable defect, so no production
change followed this final review. Direct-module every-byte exactness for the
original controls remains distinct from Save's visible-RGB-plus-all-alpha contract.

The old canvas fallback can still round RGB or be privacy-perturbed if native
capability verification fails. This fix establishes exact preservation for the
tested supported route, not universal codec/profile/browser immunity.
