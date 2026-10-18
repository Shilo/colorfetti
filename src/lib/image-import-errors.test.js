import { describe, expect, it } from 'vitest';
import { importFailures, importFailureDuration } from './image-import-errors.js';

const message = (source, error, options) => {
  const failures = importFailures(); failures.add(source, error, options); return failures.message();
};

describe('bounded artwork import diagnostics', () => {
  it('allows longer bounded reports more reading time, with 9–30 second limits', () => {
    expect(importFailureDuration('brief')).toBe(9000);
    expect(importFailureDuration('x'.repeat(200))).toBe(15000);
    expect(importFailureDuration('x'.repeat(1000))).toBe(30000);
  });
  it('names invalid GIFs and never publishes the decoder exception', () => {
    expect(message({ name: 'sprite.gif' }, { code: 'GIF_INVALID', message: 'secret private file path' }))
      .toBe('1 file skipped. “sprite.gif”: invalid GIF data; open and re-export the file.');
  });
  it('offers a recovery action for the current wall memory budget', () => {
    expect(message({ name: 'large.gif' }, { code: 'ARTWORK_MEMORY_LIMIT' })).toContain('not enough artwork memory; remove images or try a smaller image or shorter animation');
  });
  it.each(['IMAGE_PIXEL_LIMIT', 'IMAGE_SIZE_LIMIT', 'GIF_PIXEL_LIMIT'])('classifies explicit pixel rejection %s', code => {
    expect(message({ name: 'large.gif' }, { code })).toContain('image exceeds the import limit; try a smaller image or shorter animation');
  });
  it.each([{ code: 'IMAGE_UNSUPPORTED' }, { name: 'NotSupportedError' }])('classifies explicit unsupported content %j', error => {
    expect(message({ name: 'art.bin' }, error)).toContain('unsupported image format; export as PNG or GIF');
  });
  it.each([new Error('too large private-url?token=secret'), { code: 'UNKNOWN' }, null])('keeps unclassified failures honest and private %j', error => {
    const text = message({ name: 'broken.png' }, error);
    expect(text).toContain('could not decode; open and re-export the file');
    expect(text).not.toMatch(/token|too large|UNKNOWN/);
  });
  it('does not infer unsupported content from a misleading filename or MIME', () => {
    expect(message({ name: 'art.txt', type: 'text/plain' }, new Error('bad data'))).toContain('could not decode');
  });
  it('does not leak URL credentials, host, query or fragment into a download failure', () => {
    expect(message('https://user:password@private.example/art%20work.png?signature=secret#private', new Error('secret'), { download: true }))
      .toBe('1 file skipped. “art work.png”: download failed; save the image and add the file.');
  });
  it('distinguishes download timeouts', () => {
    expect(message('https://host/path/', { name: 'TimeoutError' }, { download: true })).toContain('download timed out');
    expect(message('https://host/path/', { name: 'TimeoutError' }, { download: true })).not.toContain('host');
  });
  it('cancels quietly, including download cancellation', () => {
    expect(message({ name: 'cancel.png' }, { name: 'AbortError' })).toBe('');
    expect(message('https://host/private', { name: 'AbortError' }, { download: true })).toBe('');
  });
  it('keeps exact duplicate counts, Unicode and a truthful bounded remainder', () => {
    const failures = importFailures();
    for (let i = 0; i < 1000; i++) failures.add({ name: i < 2 ? '重复😀.png' : 'x'.repeat(10000) }, null);
    const text = failures.message();
    expect(text.match(/重复😀\.png/g)).toHaveLength(2);
    expect(text).toContain('1000 files skipped.'); expect(text).toContain('997 more failed.');
    expect(text.length).toBeLessThan(400);
  });
  it('removes path/control/bidi characters and handles missing names', () => {
    expect(message({ name: 'C:\\private\\\u061c\u202esprite\u0000\n.gif' }, null)).toContain('“sprite.gif”');
    expect(message({}, null)).toContain('“Unnamed image”');
    expect(message({ name: '\u0000\u202e' }, null)).toContain('“Unnamed image”');
  });
  it('does not split supplementary Unicode while limiting three worst-case labels', () => {
    const failures = importFailures();
    for (let i = 0; i < 20; i++) failures.add({ name: '😀'.repeat(10000) }, { code: 'ARTWORK_MEMORY_LIMIT' });
    const text = failures.message();
    expect(text).toContain('17 more failed.'); expect(text).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u);
    expect(text.length).toBeLessThan(650);
  });
});
