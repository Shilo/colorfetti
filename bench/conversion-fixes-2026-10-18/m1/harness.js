import { createArtworkAdmission, artworkCost, gifDecodeHold } from '../../../src/lib/artwork-admission.js';
import { decodeImportedFile, takeImportedFrames, releaseImported } from '../../../src/lib/image-import-client.js';
import { reanalyzeItems } from '../../../src/lib/image-reanalysis.js';
import { holdArtworkExport } from '../../../src/lib/artwork-export-lease.js';
import { capturedAnalysisAdmission, capturedAnalysisCost } from '../../../src/lib/artwork-analysis-capture.js';
import { convertedAnimation } from '../../../src/lib/converted-animation.js';

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
    const releaseCaptured = holdArtworkExport([item], { source: 'luma' });
    const captureBytes = capturedAnalysisCost([item]);
    const lazyExport = convertedAnimation({ ...item, frames: [{ original: item.original, img: item.img, delay: 100 }] },
      { first: '#000000', second: '#ffffff', style: 'solid', set: {} });
    let current = item;
    const generations = [item];
    for (const source of ['red', 'blue']) { current = (await reanalyzeItems([current], { source }))[0]; generations.push(current); }
    const buffers = new Set();
    for (const generation of generations) for (const value of Object.values(generation.img)) if (ArrayBuffer.isView(value)) buffers.add(value.buffer);
    const actualGenerationsBytes = [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const capturedGenerationCovered = capturedAnalysisAdmission.used === captureBytes && retained + captureBytes >= actualGenerationsBytes
      && lazyExport.getFrame(0).mask.length === 65 * 64;
    releaseCaptured();
    const block = capturedAnalysisAdmission.reserve(capturedAnalysisAdmission.limit);
    let capturedLimitRejected = false;
    try { holdArtworkExport([item], { source: 'luma' }); }
    catch (error) { capturedLimitRejected = error.code === 'ARTWORK_MEMORY_LIMIT'; }
    block.release();
    const recoveredCapture = holdArtworkExport([item], { source: 'red' });
    const captureRecovery = capturedAnalysisAdmission.used === captureBytes * 2;
    recoveredCapture();
    const exactPixels = original.every((value, at) => current.original.data[at] === value);
    release(); if (budget.used) throw new Error('Removed source lease did not settle.');
    const next = await decodeImportedFile(file, { budget }); releaseImported(next);
    const cancel = new AbortController(), first = decodeImportedFile(file, { budget }), second = decodeImportedFile(file, { budget, signal: cancel.signal });
    const canceled = Promise.allSettled([first, second]); cancel.abort();
    const canceledResults = await canceled;
    releaseImported(canceledResults[0].value);
    const receipt = { pass: chargedAfterRemoval && exactPixels && capturedGenerationCovered && capturedLimitRejected && captureRecovery
        && capturedAnalysisAdmission.used === 0 && budget.used === 0 && canceledResults[1].reason?.name === 'AbortError',
      mode: fallback ? 'fallback' : 'worker', workersCreated: workers, concurrent: results.map(x => x.status), rejection: results[1].reason.code,
      sourceBytesExact: exactPixels, removalBorrowerRemainedCharged: chargedAfterRemoval,
      capturedGenerationCovered, actualGenerationsBytes, sourcePlusCapturedBytes: retained + captureBytes,
      capturedLimitRejected, captureRecovery, finalCapturedBytes: capturedAnalysisAdmission.used,
      capturedLimit: capturedAnalysisAdmission.limit, capturedPeak: capturedAnalysisAdmission.peak,
      finalBytes: budget.used, peak: budget.peak, limit: budget.limit };
    if (!receipt.pass) throw new Error(JSON.stringify(receipt));
    output.textContent = JSON.stringify(receipt, null, 2);
  } catch (error) { output.textContent = 'FAIL: ' + error.message; }
};
