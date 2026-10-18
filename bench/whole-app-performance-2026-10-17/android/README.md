# Native Android audit

Final status: **D1 REJECTED; baseline exploration complete with explicit native
gaps**. `findings.md`, successful raw receipt names there, `d1-summary.md` and
`cleanup.json` supersede the initial coverage-plan statuses below. The device
reservation is released; owned pages/files/forwards are cleaned up and original
rotation, download behavior and test-origin storage are restored.

Exclusive controller: Android profiler. New audit baseline:
`217cb64360784c066e944f8121858d7726f0e4f2`.

Device authorization and availability were freshly checked: USB Pixel 8 Pro
`37211FDJG00267`, `device`; keyguard not showing/input not restricted, screen on.
Brave PID 16561 matches `chrome_devtools_remote_16561`. Forward 9351 belongs to
this audit; preexisting 9333 and 9334 are preserved. Reverse 5371 belongs to this
audit. Initial rotation is `free`; USB charging, battery temperature 34.0°C.
Engine reports Chrome/155.0.8059.85. No personal tab or Downloads enumeration.

`native.mjs` attaches only to the active process-specific socket, opens one owned
tab, records native viewport/orientation and restores test-origin storage. Files
and File allocations are staged before the measured app input handoff. Input,
drop and paste payloads are synthetic trusted test fixtures; native picker UI and
physical paste gestures are not claimed. The actual app import handler/native
decoder/worker/conversion/UI are exercised.

Runs use an immutable production build served by the root audit server at 5371.
Run only in a coordinated window without host build/profile/fixture transport:

```powershell
node bench/whole-app-performance-2026-10-17/android/native.mjs startup batches sheets animation preview onebit editor
```

Diagnostic fixture preparation and expanded functional modes (run fixture generation
outside a timing window):

```powershell
node bench/whole-app-performance-2026-10-17/android/synthetic.mjs --overbudget
node bench/whole-app-performance-2026-10-17/android/native.mjs editor extended overbudget teardown failure fallback
```

`fixtures/manifest.json` freezes deterministic formulas, exact hashes and the CC0
motion assembly parent hash. The384px clip exceeds8MiB of nominal two-byte indices;
this is an index-budget check, not a whole-app memory bound. `failure` aborts only
owned-page limiter/Cleanup worker script fetches, then removes the route and retries.
`fallback` removes Worker only in the owned test page and closes that page afterward.

The supplied mode arguments allow bounded reruns. `QA_URL` changes the isolated
build origin; `QA_LABEL` labels receipts and exact unique output names. Native
Save restores download behavior to native default, checks only its exact unique
pathname, pulls only that file and removes only that created file. Every retained
PNG/GIF is independently decoded; nearest uses a scalar Oklab oracle rather than
screen readback. Screen captures are app scoped via the owned page and cannot
prove export pixels (native Brave can perturb readback).

Finite ranked native matrix (results are recorded in raw run receipts):

| Rank | Workflow | Declared coverage and limit |
|---|---|---|
| 1 | Practical import | 1/2/4/8 distinct CC0 sprites, 8+genuine six-frame effect; named current-paint readiness; input/drop/paste handoff |
| 1 | Palette | Fixed Resurrect64 and shared Auto; Oklab/RGB; low-color sheets1024/2048; dither4/8 replacement; Keep; caps/Cleanup cancellation;4096/4097 and256-color palette |
| 1 | Native export | Individual PNG/GIF, every visible RGB and alpha byte, dimensions, GIF frame delays/loop compared with decoded source |
| 1 | Animation | Genuine effect and motion128/32frames,256/48frames;384×384×48 over-budget index playback; fresh visible progress; source qualifications retained |
| 2 | Startup/demo | Repeat document dark/light empty demo and idle; process-cold startup not claimed |
| 2 | Preview | Open/zoom/pan/Original/Fit/close/return; synthetic pointer pan; true pinch/trackpad/hold gestures pending |
| 2 | 1-bit | All eleven styles tiny;1024/2048 cold/repeated Cutout/Stencil/Icon/Atkinson/Checker; Brightness replacement and partial-glow cut reanalysis; large pattern counts remain unknown; no independent full-output style oracle |
| 2 | Editor | Open/paste256/page/manual method/close/idle; saved library and external Lospec integration pending |
| 3 | Recovery/teardown | Limiter/Cleanup worker-fetch failure blocks Save; Retry restores; Worker-unavailable GIF fallback native-output exact;6share-remove/demo/forced-GC cycles; exact cleanup. No whole-browser heap or process memory claim |
| 3 | Native limits | Physical landscape, native picker/paste/pinch/clipboard transport, saved library/external Lospec, native ZIP atomicity remain unverified. Repeated heap scalars do not establish dead-source retention or absence of leaks. |

Existing practical fixture manifest, hashes, source URLs and CC0 licenses are in
`../../practical-workloads-2026-10-16/manifest.json`; inputs are reused unchanged.
Motion GIFs are assemblies, not artist-authored walk cycles. The genuine effect
was transformed to binary alpha with assigned timing. Expected pixels follow
decoded fixture bytes.

Renderer TaskDuration includes posted tasks better than ScriptDuration; neither
includes all worker CPU. Native Save wall time includes automation, native
download-manager wait and exact-file transport, not just conversion. Instrumented
rAF runs only during each window, so idle CPU cannot establish app polling.
Source import paint is not full-source count readiness. Candidate acceptance
requires separate matched A/B repetitions and output equality; baseline observations
alone do not establish an optimization.

The final decision and ranked source attribution are in `findings.md`; D1 is
REJECTED on the predeclared native warm integrated Save gate. All160 matched
native output trials are retained as hashes/decoded contracts; duplicate byte
copies are reduced to one baseline/candidate percase. `native-output-manifest.json`
links each exact native test filename to its retained copy, and `cleanup.json`
records restoration and removed owned forwards/reverses. No native kernel test
was run after the integrated gate failed.

Fresh broad baseline results are indexed in `baseline-summary.md`, with raw
receipts and exact native outputs in this directory. Native observed viewport is
448×819 at DPR2.25, physical portrait. There were no observed Long Tasks>50ms in
the completed practical stages, but single-window maximum rAF gaps reached75ms
for2048 RGB and100ms for a later Preview-source import. Zero Long Tasks cannot
establish uniformly smooth input. Failed harness receipts remain explicit:
Save/Palette strict-selector ambiguity (subsequently scoped),256-color Review
pointer interception during auto-scroll (keyboard path passed, exact cause not
proved), and awaiting an Opacity chip correctly absent for binary-alpha sheets
(corrected to assert absence and test a partial-alpha source separately). Larger
1-bit source-cold structural passes do have Long Tasks; see `findings.md`.
