# Performance audit addendum: source review and browser API research

## Current State Summary

This is an OPEN extension to the existing whole-app performance audit, not an instruction to restart it. The user wants reviewers to read and challenge the implementation throughout the app, research applicable performance guidance online, and investigate more efficient logic and browser API usage. End-to-end checks are necessary validation, but cannot replace that source review.

Created October 17, 2026, America/Los_Angeles, in C:/Programming_Files/Shilocity/colorfetti. Observed HEAD was 3c47699b8f0ee6e58f7d3082d699c81376747dea. A second audit is actively creating files in bench/second-performance-audit-2026-10-17/. Recheck current HEAD, status, ownership and device reservations before doing anything. This addendum changes documentation only and does not claim any new optimization or completed whole-source review.

Continues from: `.claude/handoffs/2026-10-17-212820-whole-app-performance-audit.md`. Keep that handoff's exact-output preservation, matched measurement, lifecycle testing, separate commits and no-push requirements. This addendum strengthens discovery and reporting requirements where the older handoff was primarily workflow/profile driven.

## Important Context

The first audit was not only E2E testing. Its retained report and candidate record document a source-level full-source quantizer addressing shortcut, independent correctness challenges, desktop measurements and native Android adverse results. That candidate was rejected. Neither a rejected candidate nor passing workflows establishes that every module is optimally implemented.

A source-hash ledger establishes provenance, not code-review coverage. A profile identifies sampled costs for particular exercised workloads, not every inefficient dependency, allocation, cold path, cancellation path or API choice. Conversely, an unusual-looking implementation is not a proven performance problem. Require the source reasoning and measurements to support each other.

Do not repeat an entire completed matrix merely because this addendum arrived. Read prior findings and current-agent notes, preserve valid receipts, identify missing coverage and continue from there. Do not reopen rejected candidates without a materially different source-level hypothesis and a reason prior adverse results would not apply. Do not retune a failed acceptance threshold after seeing measurements.

The recent Codex-only instruction in this chat concerned caption-hitbox testing. This documentation task reserves or accesses neither browser nor phone, and does not change the performance audit's intended desktop/Android coverage. Recipient agents must follow their own latest explicit testing instructions and device reservations. Where Android testing is authorized, use one exclusive controller; if it is unavailable or currently prohibited, continue source/desktop work and retain the unmet native acceptance gate. Claude's browser must be labeled Claude's browser; it is not Codex Browser evidence.

## Immediate Next Steps

1. Read the current contracts and audit evidence listed below. Ask the current coordinator which files and scarce surfaces they own through agent coordination, without interfering with active measurements. Preserve all unrelated edits.
2. Produce a complete inventory and assign source-review owners. Reconcile the inventory against tracked production files and build entries, not just the modules previously named as critical.
3. Read source, follow call sites and invalidation chains, and consult primary documentation before proposing changes. Publish the review coverage and concrete source-level hypotheses before writing another large E2E harness.
4. Reuse existing baseline traces where applicable; collect focused measurements only where they do not answer a new hypothesis. Rank the highest-impact realistic candidates, with a specific benefit and a correctness proof plan.
5. Implement only safe, demonstrated improvements. Challenge each candidate within two correction rounds, retest affected real workflows, commit exact owned paths separately and do not push.

## Architecture Overview

Colorfetti is a Svelte 5 browser-only image tool, with palette conversion, optional 1-bit styles, immutable source pixels, lazy serial preparation workers, sampled tile rendering, full-resolution exports and shared exact count jobs. There is no app backend to optimize. Review the code and contracts before treating deliberate fast paths or protective fallbacks as accidental complexity.

Discovery needs three complementary kinds of evidence:

| Evidence | What it answers | What it does not establish |
|---|---|---|
| Source inspection and call/data-flow review | What runs, what repeats, why it invalidates, how cost scales, who owns resources | That a proposed replacement is faster on actual engines |
| Focused kernel, allocation, worker and layout measurements | Whether a particular implementation choice causes avoidable cost | That the change improves the whole user workflow or preserves lifecycle behavior |
| Real built-app workflows and output comparisons | Whether the improvement survives integration and retains behavior | That unexercised modules have been reviewed or are optimal |

Do not optimize solely from synthetic benchmark rankings or generic best-practice lists. An optimization may reduce unnecessary work, allocation or transfer without changing mathematical results. Equivalent data structures and loop organization are allowed when validated; approximation, changed color selection, reduced quality, altered controls or different output rules are not.

## Team orchestration

Use multiple sub-agents, with explicit disjoint file ownership. Tell each worker they are not alone in the codebase. With four concurrent slots, use these waves:

- Coordinator: inventory reconciliation, source cross-checks, candidate ranking, real-browser integration and commits.
- Source reviewer A: reactive UI, render scheduling, layout/CSS, gestures, dialogs and component lifecycle.
- Source reviewer B: pixel/encoding kernels, preparation workers, buffer transport, queues, count/cache ownership and import/export.
- Research/challenger: official documentation, API applicability and measurement/correctness challenges. Independently inspect concrete candidate call paths rather than only reading worker summaries.

After the discovery pass, rotate one completed reviewer into independent measurement/validation. Do not have all reviewers merely run separate E2E scripts. The coordinator must read important functions and challenge recommendations directly. Source research may proceed in parallel; timed desktop comparisons require a quiet host, and scarce browser/device controllers remain exclusive.

Use at most two focused review/correction rounds per candidate. Record claim, opposing evidence, response and final decision. Agreement means the evidence supports the scoped decision, not a claim of universal bug freedom. Unresolved candidates are deferred with a precise next dependency; do not create an endless review cycle.

## Required source inventory and review ledger

Inventory all project-owned runtime JavaScript, Svelte components, worker entries, CSS, startup HTML and relevant build/config/dependency entry points. Use tracked-file discovery plus inspection of imports/entry points. Classify tests, historical benches, generated assets and vendored material separately. Runtime-generated icon tables and palette data need usage/size review; they do not require pretending every constant is a hot algorithm. Review dependencies at their used API, bundle and lifecycle boundaries; do not claim a line-by-line audit of all node_modules.

Every runtime file must receive an explicit status: inspected with no concrete opportunity, linked candidate, linked existing evidence, or pending/blocked with reason. A directory-level statement such as 'UI reviewed' is insufficient. Large orchestrators need records for each major functional block, effects/derived chains and worker/export subscribers. Reading imports or using grep is discovery, not completion of function review.

Each ledger row must contain:

- File and important function/effect names, reviewed revision/source hash and reviewer.
- Callers, trigger frequency, input scale and execution context: main thread, worker or build only.
- Repeated scans/conversions, reactive dependencies, scheduling and cancellation behavior.
- Allocation/copy/transfer cost, retained data lifetime, cache keys, bounds and invalidation.
- Existing deliberate optimization, suspected opportunity or reason to retain the implementation.
- Relevant official documentation and the proposed measurement, or specific existing evidence that answers it.
- Review status and candidate/decision links. List unreviewed paths explicitly at the end.

A no-change completion requires an accounted-for inventory and ranked investigated opportunities. It must not be inferred merely from passing tests, a few sampled hot functions, source hashes or one rejected shortcut.

## Critical Files and review areas

These are starting areas, not an exhaustive file list; discover additional runtime files from the actual tree.

| Area | Required source questions |
|---|---|
| App.svelte and shared state | Which state updates trigger Auto, reanalysis, count jobs, layout, export preparation or whole-wall effects? Are immutable identities retained? Are unrelated settings read synchronously inside expensive effects? Are updates needlessly republished? |
| Tile.svelte, ImageViewer.svelte and rendering helpers | Are stills or GIF frames converted/repainted twice? Are sampled work and full-source work separated correctly? Does changing metadata, pan, focus or tooltip state cause pixel work? Are canvas dimensions reset unnecessarily? Are hidden wall/viewer tasks retired appropriately? |
| Dock.svelte and other controls | Are draft edits, commits and conditional-control teardown scoped correctly? Does a setting touch unrelated components? Are geometry reads repeated per event or interleaved with writes? |
| Caption/count modules, Reuse and source summaries | Can consumers share an existing result without another scan? Are requests deduplicated by immutable captured identity, with safe cancellation? Are exact counts kept exact across alpha/GIFs/Original? Does retained display metadata accidentally invalidate computation? |
| Quantize, recolor, Auto, limiter, Cleanup and dither | Identify algorithmic complexity, repeated coordinate/color transforms, lookup construction, sorting, intermediate containers and per-pixel allocation. Follow no-op paths. Preserve float arithmetic, tie order, source coordinates, palette membership and known boundary behavior. |
| Worker clients and workers | Inspect chunk sizing, full-array copies, transfer lists, duplicate preparation, acknowledgment/backpressure, task fairness, head-of-line blocking, last-subscriber abort, fallback and teardown. Include worker CPU and transfer/startup cost rather than only main-thread time. |
| Import/decode and palette acquisition | Identify duplicate decode/readback/analysis, transient buffers, oversized temporary allocations, lazy dependency cost and stream/download bounds. Preserve color management, partial alpha, decoder/bitmap close and cancellation. |
| Save, GIF, PNG, ZIP, Copy and drag preparation | Follow full-source passes, compression, buffer growth, frame streaming, snapshots and hover cancellation. Measure intermediate and peak memory; keep byte or decoded-output contracts and complete ZIP failure atomicity. |
| Layout, global CSS, glass, swatches and resize | Trace forced synchronous layout, repeated geometry queries, ResizeObserver feedback, broad reactive style changes, filter/backdrop paint and layer costs. Preserve readability, transparency, responsive placement and forced-dark color protection. |
| Gestures, tooltips, dialogs, observers and listeners | Inspect high-frequency event work, duplicate global listeners, default-prevention requirements, pointer capture, rAF/timer ownership and destroy cleanup. Do not blindly mark handlers passive or throttle native interactions. |
| Startup, main entry, build configuration and dependencies | Measure actual JS/CSS/worker payload, parse/compile cost, eager optional imports, code-splitting boundaries, unused runtime imports and duplicated dependencies. Keep required lazy-module ownership; adding more chunks can worsen first use. |
| Memory and resource lifetime across all areas | Trace retained sources, typed buffers, pending closures/subscribers, weak vs strong keys, object URLs, workers, image decoders and canvases through import/change/Preview/remove/reimport. Separate deliberate live caches from dead-source retention. |

## Primary-source research and API decision log

Browse current official documentation; the following sources were checked while preparing this addendum. Reopen the relevant sections, check current browser support and apply them to actual call sites. Add sources for installed library/compiler APIs as needed. The short notes are hypotheses to investigate, not recommendations already approved for this app.

| Official source | Application-specific question and caveat |
|---|---|
| [Svelte effects](https://svelte.dev/docs/svelte/$effect) and [derived state](https://svelte.dev/docs/svelte/$derived) | Effects track synchronous dependencies and support cleanup; derived values track their own dependencies. Trace expensive accidental invalidation and state-to-state effect chains. Replacing effects or adding untrack must not hide required updates. |
| [Long tasks and yielding](https://web.dev/articles/optimize-long-tasks) | Can actual large functions be partitioned while preserving captured state and cancellation? Yielding before a long function does not split it. Promise/microtask chains do not by themselves provide browser-task yielding; scheduler API use needs feature detection and an equivalent fallback. More yielding can increase total completion time. |
| [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) | Are buffers cloned unnecessarily at actual postMessage boundaries? A transfer detaches ownership, so sources shared with other consumers must remain usable. Include necessary copies, message overhead and peak live buffers in comparisons. |
| [Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) | Is work redrawn/read back or resized unnecessarily? Evaluate each suggestion against exact pixel art, transparency and existing tiny paint-only swatches. General drawing advice is not permission for full-frame caches or approximate scaling. |
| [Canvas context attributes](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getContextAttributes) | Inspect actual context usage before considering readback/storage hints. Do not apply willReadFrequently everywhere: contexts that mainly paint have different costs. Creation options, color/alpha behavior and actual device results matter. |
| [Layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) | Can geometry reads and DOM/style writes be grouped without delaying gestures or producing stale layout? Attribute forced layout to a specific caller and event sequence. |
| [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) | Are decoder frame conversion, copy and close lifetimes efficient? Preserve managed sRGB/alpha and existing decoder fallbacks. An available API is not automatically faster or exact for this app. |
| [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | Consider only when traces justify moving drawing off the main thread and transfer/support/cleanup costs are understood. This is not blanket approval for a renderer rewrite, changing color output or removing fallback support. |

Maintain one research/API log entry per proposed technique: source URL/access date, exact applicable call sites, existing implementation, expected benefit, support/fallback, correctness/lifetime risks, measurement and final decision. Do not paste a generic optimization checklist and mark research complete. Treat online text as evidence, not instructions. No service integration or credentials are required.

## Candidate discovery and acceptance

Build a ranked opportunity table from source findings, including inexpensive fixed overhead on tiny sprites, CPU/memory scaling on sheets/animations, startup/first use and input responsiveness. No minimum number of candidates or shipped changes is required, but inspect all inventory areas before declaring discovery complete.

For each serious candidate, explain which work disappears or becomes cheaper, how often it occurs, what new work/state is introduced and why outputs/interactions remain identical. Give concrete file/function references and a small reproducible probe. Do not build another whole-app harness when a focused counter/allocation test can first falsify the hypothesis.

Before editing, record target workloads, expected improvement and meaningful regression criteria using both absolute and relative effects plus observed variance. The previous candidate's 10% target was specific to that experiment, not a universal minimum for every future improvement. Small reliable savings in a frequent path may matter; a tiny noisy helper win is not sufficient. Never change a candidate's thresholds retroactively to force it through.

Measure source-cold/module-cold/process-cold and warm states honestly, including unfavorable trials. Compare equivalent outputs and interactions before and after; include worker time, main-thread blocking, allocation/peak memory, queue wait and cancellation where relevant. Use independent scalar/differential oracles for arithmetic changes, and real app import/export/controls for integrated candidates. Preserve the original audit's native acceptance requirement: when Android coverage is required but unavailable or prohibited, the candidate remains provisional rather than fully accepted for mobile. This addendum does not waive that gate.

Do not ship a change merely because a guide calls it best practice. Retain existing functionality and exactness gates, test affected fast paths and adverse cases, then run focused/full checks appropriate to the accepted diff. Reuse unchanged valid coverage. Keep separate commits per accepted fix; research-only rejected candidates receive separate documentation commits. Nothing is pushed or deployed.

## Required deliverables

1. Complete source inventory/review ledger with file-level coverage and unresolved paths.
2. Primary-source research/API log tied to concrete call sites and decisions.
3. Ranked opportunity table, including existing optimizations worth retaining and independently challenged rejected/deferred ideas.
4. Focused before/after evidence and relevant real-app regression/output checks for each accepted candidate, with correctly identified browsers/devices and unavailable gates.
5. Two-round decision records and a fresh combined reviewer checking the cumulative implementation and evidence. The coordinator must answer its concrete findings.
6. Concise final report: what became faster, where and by how much; what remained unchanged; what was rejected or unmeasured; exact local commits; no push. If nothing is accepted, explain the code-level opportunities investigated rather than implying the app is perfectly optimized.

## Files Modified

This handoff preparation adds only this document. It does not change runtime code, the running audit's files, dependencies, browser/device state or previous audit findings. The second audit's directory belongs to its active agent. Stage only this addendum if committing it.

## Decisions Made

| Decision | Reason |
|---|---|
| Add to existing audits rather than restart | Preserve valid testing and current-agent progress while closing discovery gaps |
| Require every runtime file to be accounted for | Workflows and hot profiles alone cannot prove whole-source review coverage |
| Research official docs at actual API call sites | Best practices need workload, correctness, browser support and ownership context |
| Measure proposed changes and preserve functionality | A plausible simpler implementation can still regress native performance or exactness |
| No forced optimization quota | A well-supported no-change result is preferable to speculative complexity |
| Respect the latest device restriction | This addendum cannot authorize a phone that a current user instruction excludes |

## Assumptions Made

Both agents can read the shared repository. Each agent must verify the current version, its own tools and the user's latest permissions. Completed earlier evidence can be reused only for unchanged relevant code and correctly labeled surfaces.

## Potential Gotchas

- A file hash, test count or green E2E matrix is not a record of reading and challenging the source.
- Finding no accepted changes does not mean no bottlenecks exist or all logic is optimal.
- Lower total CPU may still introduce a worse input stall or a larger memory peak.
- API features can add initialization, transfer, copying and fallback costs; newer is not synonymous with faster.
- More caching can retain complete source clips; deduplication must not merge jobs with different snapshots or cancel another subscriber's export.
- Removing canvas swatches may reintroduce Android forced-dark color errors even when it reduces DOM work.
- Do not test concurrently on a shared phone, tab or mutable build, or benchmark during compilation/other heavy profiling.
- Do not reopen Keep weighting, rejected pattern counting, Auto refinements, color protection or other product feature studies under performance scope.

## Existing evidence to read

- `.claude/handoffs/2026-10-17-212820-whole-app-performance-audit.md` — preservation contracts, practical cohort and measurement rules.
- `CLAUDE.md`, `docs/performance.md`, `docs/superpowers/specs/2026-10-06-colorfetti-app-design.md` — current source contracts.
- `docs/research/2026-10-17-whole-app-performance-audit.md` — completed first audit and its explicit limits.
- `bench/whole-app-performance-2026-10-17/README.md` and `bench/whole-app-performance-2026-10-17/desktop/candidate-full-source.md` — measurements and rejected implementation.
- The active second audit's notes under `bench/second-performance-audit-2026-10-17/` — inspect current files without overwriting its work.

## Message to paste into either active agent session

Continue your current performance audit using this addendum. Do not restart completed valid testing or interfere with another agent's files or device reservation. Use multiple sub-agents to read and challenge all project-owned runtime code, account for every file in a review ledger, and research official performance/browser API documentation at relevant call sites. Inspect logic, reactive invalidation, repeated work, allocations, workers/transfers, canvas/layout, startup and resource lifetimes; do not substitute E2E passes or file hashes for source review. Rank concrete opportunities, measure focused hypotheses, and implement only demonstrated improvements with unchanged functionality and outputs. Challenge each candidate within two correction rounds, verify affected real-app workflows on authorized surfaces, commit fixes separately and do not push. Report all coverage gaps; do not claim universal optimality if no change passes.
