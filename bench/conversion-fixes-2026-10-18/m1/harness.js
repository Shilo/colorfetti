import { createArtworkAdmission, artworkCost, gifDecodeHold } from '../../../src/lib/artwork-admission.js';
import { decodeImportedFile, takeImportedFrames, releaseImported } from '../../../src/lib/image-import-client.js';
import { reanalyzeItems } from '../../../src/lib/image-reanalysis.js';

const fallback = new URL(location.href).searchParams.has('fallback'), NativeWorker = globalThis.Worker;
let workers = 0;
if (fallback) globalThis.Worker = undefined;
else globalThis.Worker = class extends NativeWorker { constructor(...args) { super(...args); workers++; } };
document.querySelector('#mode').textContent = fallback ? 'Mode: cooperative no-worker fallback.' : 'Mode: actual browser module worker.';
document.querySelector('#run').onclick = async () => {
  const output = document.querySelector('#result'); output.textContent = 'Running…';
  try {
    const blob = await (await fetch('/fixtures/small.gif')).blob();
    const file = new File([blob], 'small.gif', { type: 'image/gif' });
    const retained = artworkCost(65, 64), scratch = gifDecodeHold(65 * 64, file.size);
    const budget = createArtworkAdmission(retained * 2 + scratch - 1);
    const results = await Promise.allSettled([decodeImportedFile(file, { budget }), decodeImportedFile(file, { budget })]);
    if (results[0].status !== 'fulfilled' || results[1].reason?.code !== 'ARTWORK_MEMORY_LIMIT') throw new Error('Concurrent admission invariant failed.');
    const published = takeImportedFrames(results[0].value), frame = published.frames[0];
    const item = { id: 1, name: 'small.gif', by: 'luma ', admission: published.admission, ...frame };
    const original = item.original.data.slice();
    const release = item.admission.hold(); item.admission.release();
    const chargedAfterRemoval = budget.used === retained;
    let current = item;
    for (const source of ['red', 'blue', 'green']) current = (await reanalyzeItems([current], { source }))[0];
    const exactPixels = original.every((value, at) => current.original.data[at] === value);
    release(); if (budget.used) throw new Error('Removed source lease did not settle.');
    const next = await decodeImportedFile(file, { budget }); releaseImported(next);
    const cancel = new AbortController(), first = decodeImportedFile(file, { budget }), second = decodeImportedFile(file, { budget, signal: cancel.signal });
    const canceled = Promise.allSettled([first, second]); cancel.abort();
    const canceledResults = await canceled;
    releaseImported(canceledResults[0].value);
    const receipt = { pass: chargedAfterRemoval && exactPixels && budget.used === 0 && canceledResults[1].reason?.name === 'AbortError',
      mode: fallback ? 'fallback' : 'worker', workersCreated: workers, concurrent: results.map(x => x.status), rejection: results[1].reason.code,
      sourceBytesExact: exactPixels, removalBorrowerRemainedCharged: chargedAfterRemoval, finalBytes: budget.used, peak: budget.peak, limit: budget.limit };
    if (!receipt.pass) throw new Error(JSON.stringify(receipt));
    output.textContent = JSON.stringify(receipt, null, 2);
  } catch (error) { output.textContent = 'FAIL: ' + error.message; }
};
