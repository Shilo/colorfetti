# Preview source-retention correction

Written before candidate native measurement. Baseline frozen5ae; candidate copies only the App close-handler correction, excluding concurrent filename/GIF/import work. No pixel, animation, cache budget, input timing or export algorithm changes.

Fresh controlled evidence: never opening Preview releases a removed48-frame256px clip to about0.595MB backing storage. Opening/closing Preview before removal retains22.977MB after11s and two forced GCs. Replacing the focus trigger with a tiny source's Preview releases the old clip, returning to0.616MB. A heap path roots the detached removed caption-preview button through App's stored trigger context, its delegated click/Tile props and image frames/backing buffers.

Candidate captures focus target/modality in local variables, clears the App's stored target/modality synchronously before tick, then restores focus/blur using the local target exactly as before. It does not manipulate Svelte private handlers. Shared/palette triggers and source deletion while a viewer is open remain separate hypotheses without this candidate's proof.

Acceptance: the same Preview-close-remove sequence must return below2MB backing storage after the same delay/GC, near never-Preview; source pixels/captions/settings and all export bytes remain unchanged; keyboard Preview close returns focus to its connected invoking control, pointer close blurs as before, repeated close/open and canceled refinement preserve behavior. No extra listener/timer/worker/cache. No repeated Preview workflow latency loss exceeding both5ms and5%. At most two correction/review rounds. Native heap/retained bytes are not universal whole-app memory bounds or speed claims.
