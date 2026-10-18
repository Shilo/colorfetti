import { decodeGif, decodeGifAsync, visitGifFrames, encodePaletteGif, encodeGifAsync } from '../../../src/lib/gif.js';
import { decodeImportedFile } from '../../../src/lib/image-import-client.js';
import { decodePaletteFile } from '../../../src/lib/palette-decode.js';
import { outNames, zipBytes } from '../../../src/lib/save.js';
import { unzipSync } from 'fflate';
import { fixture } from './fixtures.mjs';

const results = document.querySelector('#results'), receipt = document.querySelector('#receipt');
// Test-only transport interception, after the production iframe loads. App's
// real Save/Save all event handlers, settings capture, filenames and encoders
// run unchanged. Capture only the finished Blob the download anchor would offer.
const frame = document.querySelector('#app');
frame.addEventListener('load', () => {
  const target = frame.contentWindow, blobs = new Map(), create = target.URL.createObjectURL.bind(target.URL);
  target.URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
  const original = target.HTMLAnchorElement.prototype.click;
  target.HTMLAnchorElement.prototype.click = function () {
    const blob = this.download && blobs.get(this.href);
    if (!blob) return original.call(this);
    const name = this.download;
    void fetch('/capture?name=' + encodeURIComponent(name), { method: 'POST', body: blob }).then(() => {
      document.querySelector('#downloads').textContent = `Actual App Save/ZIP captured: ${name}, ${blob.size} bytes`;
    });
  };
});
document.querySelector('#run').onclick = async () => {
  const cases = [];
  try {
    for (const repeat of [null, 0, 2, 65535]) {
      const bytes = fixture({ repeat }), source = new File([bytes], 'repeat.gif', { type: 'image/gif' });
      const sync = decodeGif(bytes), asyncResult = await decodeGifAsync(bytes);
      const visit = await visitGifFrames(bytes, () => {});
      const artwork = await decodeImportedFile(source), palette = await decodePaletteFile(source);
      const frames = sync.frames.map(f => ({ indices: Uint16Array.from({ length: 2 }, (_, p) => f.data[p * 4] ? 1 : 0), delay: f.delay }));
      const saved = await encodePaletteGif({ w: 2, h: 1, colors: ['#000000', '#ffffff'], frames, loop: artwork.loop });
      const onebit = await encodeGifAsync({ w: 2, h: 1, first: '#000000', second: '#ffffff', loop: artwork.loop,
        frames: frames.map(f => ({ mask: Uint8Array.from(f.indices, value => value + 1), delay: f.delay })) });
      const name = outNames(['repeat.gif'], ['gif'])[0];
      const zipped = unzipSync(zipBytes([name], [saved]))[name];
      const actual = [sync.loop, asyncResult.loop, visit.loop, artwork.loop, decodeGif(saved).loop, decodeGif(zipped).loop, decodeGif(onebit).loop];
      const pass = actual.every(loop => loop === repeat) && palette.colors.length === 2 && palette.frameCount === 2
        && JSON.stringify(sync.frames.map(f => [...f.data])) === JSON.stringify(asyncResult.frames.map(f => [...f.data]));
      cases.push({ repeat, expectedTotalPlays: repeat === 0 ? 'infinite' : (repeat ?? 0) + 1, actual, pass, paletteColors: palette.colors });
    }
    const single = await decodeImportedFile(new File([fixture({ single: true })], 'single.gif', { type: 'image/gif' }));
    cases.push({ singleFrameStill: single.frames.length === 1 && single.loop === undefined && single.frames[0].delay === undefined,
      pass: single.frames.length === 1 && single.loop === undefined && single.frames[0].delay === undefined });
    const report = { userAgent: navigator.userAgent, date: new Date().toISOString(), cases, passed: cases.every(c => c.pass) };
    results.innerHTML = `<h2 class="${report.passed ? 'pass' : 'fail'}">${report.passed ? 'PASS' : 'FAIL'}: repeat preservation</h2><table><tr><th>Input repeats</th><th>Expected total plays</th><th>Decoder / async / visit / worker / Save / ZIP / 1-bit Save repeats</th><th>Result</th></tr>${cases.slice(0, 4).map(c => `<tr><td>${c.repeat ?? 'absent'}</td><td>${c.expectedTotalPlays}</td><td>${c.actual.map(v => v === null ? 'absent' : v).join(' / ')}</td><td class="${c.pass ? 'pass' : 'fail'}">${c.pass ? 'PASS' : 'FAIL'}</td></tr>`).join('')}</table><p>Single-frame GIF still semantics: ${cases.at(-1).pass ? 'PASS' : 'FAIL'}</p>`;
    receipt.textContent = JSON.stringify(report, null, 2);
    await fetch('/receipt', { method: 'POST', body: JSON.stringify(report) });
  } catch (error) { results.textContent = error.stack; }
};
document.querySelector('#wall').onclick = () => {
  const target = document.querySelector('#app').contentWindow, transfer = new DataTransfer();
  transfer.items.add(new File([fixture()], 'animexts-finite.gif', { type: 'image/gif' }));
  target.document.dispatchEvent(new target.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
};
