import{outNames,zipBytes}from'../../../src/lib/save.js';import{writeFileSync}from'node:fs';import{createHash}from'node:crypto';
const sources=['a:b.png','a?b.png','a-b.png','A-B.jpg','CON.png','CON.note.png','NUL.tar.gz','COM¹.png','COM¹.note.png','LPT².note.png',
  'LPT³.png','CON .note.png','café.png','cafe\u0301.png','σ.png','ς.png','Σ.png','日本語👨‍👩‍👧‍👦.png','a\u0000b.png','a\u202eb.png','a\u0085b.png',
  'f'.repeat(400)+'.png','😀'.repeat(100)+'.png','😀'.repeat(100)+'b.png','x'.repeat(238)+' .tail.png',' .png','../a:b.png'];
const names=outNames(sources),payloads=names.map((_,i)=>Uint8Array.of(i,255-i,17,34));
const expected=names.map((name,i)=>({source:sources[i],name,sha256:createHash('sha256').update(payloads[i]).digest('hex')}));
writeFileSync(new URL('programmatic.zip',import.meta.url),zipBytes(names,payloads));
writeFileSync(new URL('windows-expected.json',import.meta.url),JSON.stringify(expected,null,2)+'\n');
console.log(JSON.stringify({entries:names.length,maxUtf8Bytes:Math.max(...names.map(name=>Buffer.byteLength(name)))}));
