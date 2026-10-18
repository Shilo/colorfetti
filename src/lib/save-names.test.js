import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { outNames, downloadName, zipBytes } from './save.js';

const utf8 = new TextEncoder();
function expectPortable(names) {
  const keys = names.map(name => name.normalize('NFC').toUpperCase());
  expect(new Set(keys).size).toBe(names.length);
  for (const name of names) {
    expect(name).not.toMatch(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\p{Bidi_Control}]/u);
    expect(name).not.toMatch(/[ .]$/);
    expect(name).not.toMatch(/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]) *(\.|$)/iu);
    expect(utf8.encode(name).length).toBeLessThanOrEqual(255);
    expect(name).not.toMatch(/[\uD800-\uDFFF]/u);
  }
}
describe('portable export filenames', () => {
  it('sanitizes forbidden characters before case-insensitive collision numbering', () => {
    expect(outNames(['a:b.png','a?b.png','a-b.png','A|B.jpg','a/b.png','a\\b.png']))
      .toEqual(['a-b-colorfetti.png','a-b-2-colorfetti.png','a-b-3-colorfetti.png','A-B-4-colorfetti.png','a-b-5-colorfetti.png','a-b-6-colorfetti.png']);
  });
  it('preserves valid CON suffixes but protects genuinely reserved first-dot stems', () => {
    const names=['CON.png','nul.jpg','COM1.png','LPT³.png','CON.note.png','nUl.tar.gz','COM¹.preview.png','lpt².test.gif','CON .note.png'];
    expect(outNames(names)).toEqual(['CON-colorfetti.png','nul-colorfetti.png','COM1-colorfetti.png','LPT³-colorfetti.png',
      'image-CON.note-colorfetti.png','image-nUl.tar-colorfetti.png','image-COM¹.preview-colorfetti.png','image-lpt².test-colorfetti.png','image-CON .note-colorfetti.png']);
    expectPortable(outNames(names));
  });
  it('trims empty/dot/space bases and trims again at a truncated boundary', () => {
    expect(outNames(['',' .png','...','.png',null,undefined]))
      .toEqual(['image-colorfetti.png','image-2-colorfetti.png','image-3-colorfetti.png','image-4-colorfetti.png','image-5-colorfetti.png','image-6-colorfetti.png']);
    const name=outNames(['x'.repeat(238)+' .more.png'])[0];
    expect(name).toBe('x'.repeat(238)+'-colorfetti.png');
  });
  it('preserves ordinary Unicode and emoji joiners while normalizing equivalent Unicode collisions', () => {
    const names=['café.png','cafe\u0301.png','CAFÉ.png','日本語👨‍👩‍👧‍👦.png','σ.png','ς.png','Σ.png'];
    expect(outNames(names)).toEqual(['café-colorfetti.png','café-2-colorfetti.png','CAFÉ-3-colorfetti.png',
      '日本語👨‍👩‍👧‍👦-colorfetti.png','σ-colorfetti.png','ς-2-colorfetti.png','Σ-3-colorfetti.png']);
    expectPortable(outNames(names));
  });
  it('replaces C0/C1 and bidi controls and lone surrogates without breaking paired emoji', () => {
    const inputs=Array.from({length:32},(_,i)=>`a${String.fromCharCode(i)}b.png`);
    inputs.push('a\u007fb.png','a\u0085b.png','a\u009fb.png','a\u202eb.png','a\u2066b.png','a\ud800b.png','a\udfffb.png','a😀b.png');
    const names=outNames(inputs);expectPortable(names);
    expect(names.at(-1)).toBe('a😀b-colorfetti.png');
  });
  it('bounds every sibling including multi-digit ordinals and truncation-created collisions', () => {
    const inputs=Array.from({length:1200},(_,i)=>'😀'.repeat(100)+i+'.png');
    const names=outNames(inputs);expectPortable(names);
    expect(names[0]).toBe('😀'.repeat(60)+'-colorfetti.png');
    expect(names[999].endsWith('-1000-colorfetti.png')).toBe(true);
  });
  it('keeps PNG/GIF namespaces independent, respects numbered inputs and never changes source labels', () => {
    const names=Object.freeze(['a:b.png','a?b.gif','a-b-2.png','a|b.jpg','a:b.gif']);
    const output=outNames(names,Object.freeze(['png','gif','png','png','gif']));
    expect(output).toEqual(['a-b-colorfetti.png','a-b-colorfetti.gif','a-b-2-colorfetti.png','a-b-3-colorfetti.png','a-b-2-colorfetti.gif']);
    expect(names[0]).toBe('a:b.png');expectPortable(output);
    expect(downloadName({name:names[0]})).toBe(output[0]);
    expect(downloadName({name:names[1],frames:[{},{}]})).toBe(output[1]);
  });
  it('flattens paths without letting a dot in a directory remove a later basename', () => {
    expect(outNames(['dir.v1/file.png','dir.v1/file','../../a:b.png']))
      .toEqual(['dir.v1-file-colorfetti.png','dir.v1-file-2-colorfetti.png','..-..-a-b-colorfetti.png']);
  });
  it('retains every ZIP entry and exact bytes after sanitization-created collisions', () => {
    const names=outNames(['a:b.png','a?b.png','a-b.png','a\u0000b.png']);
    const payloads=names.map((_,i)=>Uint8Array.of(i,255-i)),unzipped=unzipSync(zipBytes(names,payloads));
    expect(Object.keys(unzipped)).toEqual(names);
    names.forEach((name,i)=>expect(unzipped[name]).toEqual(payloads[i]));
  });
});
