import omggif from 'omggif';
import { writeFileSync } from 'node:fs';
import { gifFrameBounds } from '../../../src/lib/gif-frame-bounds.js';
import { createPaletteGifWriter } from '../../../src/lib/gif.js';
import assert from 'node:assert/strict';
const result = { checked: 0, improved: 0, tied: 0, worsened: 0, firstWorse: null, shippingSizeGateChecked: 0, shippingGrew: 0 };
function encode(w, h, frame) {
  const storage = new Uint8Array(2048), writer = new omggif.GifWriter(storage, w, h, { palette: [0,0xffffff], loop: 0 });
  writer.addFrame(frame.x,frame.y,frame.w,frame.h,frame.indices,{ transparent:0,disposal:2,delay:10 });
  return storage.slice(0,writer.end());
}
for (let bits = 0; bits < 65536; bits++) {
  const indices = Uint8Array.from({ length:16 },(_,p)=>bits>>p&1), cropped = gifFrameBounds(indices,4,4,0);
  if (cropped.w === 4 && cropped.h === 4) continue;
  const full = encode(4,4,{x:0,y:0,w:4,h:4,indices}), small = encode(4,4,cropped);
  result.checked++;
  if (small.length < full.length) result.improved++;
  else if (small.length === full.length) result.tied++;
  else { result.worsened++; result.firstWorse ??= { bits, indices:[...indices], bounds:[cropped.x,cropped.y,cropped.w,cropped.h], fullBytes:full.length, cropBytes:small.length }; }
  const writer=createPaletteGifWriter({w:4,h:4,table:[0,0xffffff],transparent:0,loop:0});
  writer.add(indices,100);const shipping=writer.end();result.shippingSizeGateChecked++;
  if(shipping.length>full.length)result.shippingGrew++;
  assert(shipping.length<=full.length);
}
writeFileSync(new URL('crop-size-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
