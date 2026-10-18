import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const base = '.tmp/codex-performance-adversarial-review-2026-10-18/current/dist';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function entries(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const file = path.join(directory, item.name), relative = prefix + item.name;
    return item.isDirectory() ? entries(file, relative + '/') : [{ file: relative, bytes: statSync(file).size, sha256: digest(readFileSync(file)) }];
  });
}
const changes = ['src/lib/gif.js', 'src/lib/image-import-client.js', 'src/lib/image-import-worker.js', 'src/lib/gif-decode.js'];
const result = {
  sourceAtStart: '6f8238a', initialTrackedWorktreeClean: true,
  scope: 'Fresh suite/build and Codex Browser smoke on the then-clean current checkout; this is distinct from the original frozen ae97d0e audit. Later concurrent GIF edits are preserved, excluded from the immutable served build, and not endorsed by this review.',
  testsFinishedUtc: statSync('bench/codex-performance-adversarial-review-2026-10-18/tests-current.log').mtime.toISOString(),
  buildFinishedUtc: statSync('bench/codex-performance-adversarial-review-2026-10-18/build-current.log').mtime.toISOString(),
  laterConcurrentFiles: changes.map(file => ({ file, observedModifiedUtc: statSync(file).mtime.toISOString() })),
  assets: entries(base).sort((a,b) => a.file.localeCompare(b.file)),
  phoneUsed: false, freshMemoryMeasurement: false,
  cleanup: { ownedBrowserTabClosed: true, viewportReset: true, ownServerPort: 5414, ownServerStopped: true, twoExactOwnedDownloadsHashCheckedAndRemoved: true, userTabsAndOtherProcessesPreserved: true }
};
writeFileSync('bench/codex-performance-adversarial-review-2026-10-18/current-build-manifest.json', JSON.stringify(result, null, 2) + '\n');
console.log({ sourceAtStart: result.sourceAtStart, assets: result.assets.length, laterConcurrentEditsAfterBuild: result.laterConcurrentFiles.every(item => item.observedModifiedUtc > result.buildFinishedUtc) });
