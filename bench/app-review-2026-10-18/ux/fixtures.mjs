// Review-only fixtures. No production source is modified.
import { writeFile } from 'node:fs/promises';
import { pngBytes } from '../../../src/lib/save.js';
import { encodeGif } from '../../../src/lib/gif.js';
const folder = new URL('./', import.meta.url);
await writeFile(new URL('twenty-frames.gif', folder), encodeGif({
  w: 1024, h: 1024, first: '#000000', second: '#ffffff', loop: 0,
  frames: Array.from({length:20}, (_,i) => ({mask:new Uint8Array(1024*1024).fill(i%2+1),delay:500})),
}));
await writeFile(new URL('play-once.gif', folder), encodeGif({
  w:32,h:32,first:'#000000',second:'#ffffff',loop:null,
  frames:[{mask:new Uint8Array(1024).fill(1),delay:2000},{mask:new Uint8Array(1024).fill(2),delay:100}],
}));
await writeFile(new URL('play-once-slow.gif', folder), encodeGif({
  w:32,h:32,first:'#000000',second:'#ffffff',loop:null,
  frames:[{mask:new Uint8Array(1024).fill(1),delay:1000},{mask:new Uint8Array(1024).fill(2),delay:3000}],
}));
await writeFile(new URL('broken.png', folder), Uint8Array.of(137,80,78,71,13,10,26,10,0));
await writeFile(new URL('wide.png', folder), pngBytes({w:2048,h:2048,first:'#000000',second:'#ffffff',
  mask:Uint8Array.from({length:2048*2048},(_,i)=>i%2048<1024?1:2)}));
