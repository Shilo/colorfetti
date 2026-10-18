# Independent whole-app performance challenge

Reviewer made no production edits. **D1 is rejected**, despite desktop kernel/renderer wins: matched physical Android target gains missed the predeclared 10% integrated gate, and tiny warm native renderer CPU crossed the adverse floor. Production quantize source/tests were independently confirmed restored to `217cb64360784c066e944f8121858d7726f0e4f2` with `git diff --exit-code <baseline> -- src/lib/quantize.js src/lib/quantize.test.js`.

| Evidence | Result / limit |
|---|---|
| `measurement-checklist.md` | Initial measurement validity/harness risks and fresh follow-through; historical results are not current coverage. |
| `profile-review.{mjs,json}` | Independent aggregation and exact source attribution of profiler-owned frozen desktop traces; not another performance run. |
| `candidate-d1-review.md` | Two bounded rounds, source correction, scalar/frozen correctness, every first/warm adverse result, final native no-ship rationale. |
| `quantize-differential{.mjs,-results.json}` | 4,896 cases / 433,728 output pixels; 2,856 scalar nearest, 816 async, eight cancellation checks; all pass. After rollback, rerun explicitly uses retained rejected `quantize.candidate.js`, never production against itself. |
| `lifecycle{.mjs,-results.json}` / `lifecycle-review.md` | Fresh baseline six still mount/Preview/remove cycles; twelve settled windows have zero app rAF/timer/canvas work; visible animation progresses. No leak absence or whole-app heap bound claim. |
| `queue-cancellation{.mjs,-results.json}` | Fresh baseline built-app pending Reuse + settings replacement/source removal: stale drafts suppressed, later current drafts match 8/7 exact caption colors. Artificially held module makes pending state deterministic; not network timing. |
| `focused-tests.json` | 153 passed, two existing GC-dependent skips on the exploratory D1 source: fallback/message errors, summary/Original/usage queues, shared subscribers, hover ownership, snapshots, generic ZIP atomicity. |
| `palette-export-tests.json` | 22 passed after source rollback: exact RGBA8, partial-alpha GIF preflight refusal, compressor cancellation, deferred export snapshots, complete ZIP failure atomicity. |
| `setup-notes.md` | Restricted Windows Edge startup failure distinguished from approved host rerun; Chromium sandbox stayed enabled. |

The reviewer independently read the final native 160-trial receipt at `../android/d1-pairs/results-all-wholeapp-d1-1792300555382.json`; it records all per-case output hashes equal, independent decoded checks and zero runtime errors. Warm native 1024/2048 CPU improves only 4.1%/6.8%; tiny warm CPU rises 70.039→74.118 ms (+4.079 ms/+5.82%, four of five pairs worse). All raw observations remain. This is a measured no-ship decision, not a discovered output bug or an invitation to tune another predicate.

Actual Codex Browser and USB Android operations were performed by their exclusive coordinator/device owners. Reviewer browser runs were auxiliary sandboxed Edge only. No additional source optimization, claimed leak, security preference change, push or deployment was performed by this reviewer. Existing independent mobile-caption CSS/spec work is outside this audit's ownership.
