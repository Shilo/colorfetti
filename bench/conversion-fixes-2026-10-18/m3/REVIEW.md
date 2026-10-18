# M3 actionable artwork import failures

The finding is reproduced. A fresh native picker import of valid.gif and a GIF with zero logical width preserved the valid tile but only said “1 file skipped” and listed formats. The decoder also treated zero dimensions as a size-limit failure. A useful fix does not require tolerant GIF decoding or exposing decoder exception text.

The candidate retains a count and at most three safe filename/recovery examples. Labels are bounded to 48 Unicode codepoints and discard paths, URL credentials/host/query/fragment, controls and bidi overrides. Invalid GIFs get specific re-export guidance. Explicit admission and unsupported-type categories get their own guidance; unknown errors stay “could not decode.” No MIME/extension guess claims content is unsupported. URL download/timeout failures offer saving and adding the file. Successful batch additions remain, cancellation stays quiet, and Remove all prevents later imports/errors.

## Challenge iterations

- Root challenged an unused maxPixels argument in the new GIF test. Corrected it to the actual visitGifFrames API, where maxPixels:0 now proves invalid geometry wins over a size limit. Sync and async decoding are also checked.
- Root challenged allocating an array for an entire pathological name. Truncation now stops after at most 49 Unicode codepoints; it never splits an emoji surrogate pair.
- Root challenged MIME guesses. The implementation does not use MIME/extension to diagnose unsupported content; a fresh valid GIF named.txt with application/octet-stream imports successfully.
- Root independently observed both picker files fail generically while the mutable /after build was being replaced, then repeated identically and passed. Asset mismatch is a plausible inference, not proven. Final candidate is an immutable after-v4 directory and all served build bytes are frozen in server memory. The native picker was repeated successfully against that final URL.
- Root challenged bounded-toast readability. Three pathological 48-emoji filenames and 17 remaining failures were fully visible at 375×720 in a desktop browser viewport. No physical phone was used. Viewport was restored.
- Root then challenged the 9-second timeout for a dense report. Agreed: both local/URL notices now last 9–30 seconds depending on their bounded length. The helper is unit-tested, and native import plus narrow browser checks were repeated on the rebuilt immutable after-v3 candidate. The long notice was still visibly present after 27.184 seconds; see long-notice.json and bounded-375-after-9s.png.
- A final self-challenge found that the explicit bidi list omitted Arabic Letter Mark U+061C. Replaced that list with the complete Unicode Bidi_Control property, extended the regression test, rebuilt after-v4, and repeated native and narrow browser checks with actual U+061C-prefixed failed filenames. The published notice contains no U+061C.
- A controlled 15-second URL response was canceled by actual Remove all / Remove actions after 601 ms. Server recorded an unfinished response closed by the client. After the delayed response would have arrived, the empty wall remained and no late toast appeared.

## Validation

135 tests passed across 7 focused suites, including strict GIF rejection, loop metadata, worker/client cancellation and recovery, drops, and new diagnostic/geometry/duration tests. Production build passed. Native file chooser checks were performed before and after. The controlled same-origin harness exercises actual app drop handlers for mixed URLs, 20 failed labels, cancellation and misleading valid metadata; it is not a simulated decoder implementation.

- Baseline URL: http://127.0.0.1:5202/before/
- Final candidate URL: http://127.0.0.1:5203/after-v4/
- Final harness URL: http://127.0.0.1:5203/harness.html
- Source/bundle SHA256: validation.json
- Focused tests: focused-tests.txt
- Native screenshots: before.png, after-native-final.png
- Additional screenshots: mixed-url-final.png, bounded-375-final.png, bounded-375-after-9s.png, canceled.png
- Cancellation server receipt: cancellation-server-events.json
- Browser states: browser-states.json

The candidate build includes concurrent M4 GIF and M5 contrast edits; this review claims M3 behavior only. Existing artwork admission currently has no bounded-memory error: upcoming M1 must emit ARTWORK_MEMORY_LIMIT, whose user guidance is already unit-covered. Unknown browser decode exceptions cannot reliably tell corruption from unsupported metadata; the copy intentionally preserves that uncertainty.

## Proposed contract text for coordinator

Replace the final Adding images bullet in the behavior spec:

> Failed artwork files are skipped while successful batch additions remain. After the batch, report the failure count and at most three filename excerpts with concise recovery guidance, plus the remaining failure count. Bound each excerpt to 48 Unicode codepoints, remove paths/control and bidi characters, and never display raw exceptions or URL credentials/host/query/fragment. Notices last 9–30 seconds depending on their bounded length. Distinguish explicit invalid GIF data, import-admission limits, unsupported-type diagnostics and URL download/timeout failures; unclassified decode failures say the image could not be decoded. Cancellation and Remove all suppress late images and error messages. Strict GIF validation is unchanged; zero logical dimensions are invalid GIF data, independently of a size limit.

Suggested performance addendum under Adding images:

> Failure reporting retains one count and at most three short diagnostic strings, without retaining failed files, decoded pixels or exception objects. Local and URL batches share the same bounded reporting policy. Reporting does not change serial import, quarter-second publication batching, cancellation or worker fallback.

Suggested CLAUDE brief:

> Artwork import reports bounded filename/recovery examples after a batch, preserves valid additions, and cancels quietly. Safe explicit categories distinguish invalid GIF data, admission limits, unsupported content and URL download failures; unknown decode causes remain generic. Raw exceptions and signed URLs never enter these notices. Zero GIF logical dimensions are GIF_INVALID, not oversized-image errors; strict decoding remains unchanged.
