import { afterEach, describe, it, expect, vi } from 'vitest';
import omggif from 'omggif';
import { createPaletteGifWriter, decodeGif, encodeGif, encodeGifAsync, encodePaletteGif } from './gif.js';
import { imageFixture, legacyFixture } from '../../bench/conversion-fixes-2026-10-18/m7/fixtures.mjs';
afterEach(() => vi.restoreAllMocks());

function fullReference(image) {
  const storage = new Uint8Array(4096 + image.frames.length * image.w * image.h * 2);
  const writer = new omggif.GifWriter(storage,image.w,image.h,{palette:image.table,loop:image.loop??undefined});
  for(const frame of image.frames)writer.addFrame(0,0,image.w,image.h,frame.indices,
    {disposal:2,delay:frame.delay/10,...(image.transparent===null?{}:{transparent:image.transparent})});
  return storage.slice(0,writer.end());
}
function encoded(image) {
  const writer=createPaletteGifWriter(image);
  for(const frame of image.frames)writer.add(frame.indices,frame.delay);
  return writer.end();
}
describe('bounded GIF crop size selection',()=>{
  it('rejects the known smaller-area/larger-LZW counterexample and retains its exact full bytes',()=>{
    const image={w:4,h:4,table:[0,0xffffff],transparent:0,loop:2,frames:[{delay:100,
      indices:Uint8Array.of(0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0)}]};
    const output=encoded(image),reference=fullReference(image);
    expect(output.length).toBe(64);expect(output).toEqual(reference);
    expect(new omggif.GifReader(output).frameInfo(0)).toMatchObject({x:0,y:0,width:4,height:4});
  });
  it('retains the original frame on equal compressed sizes',()=>{
    const image={w:2,h:1,table:[0,0xffffff],transparent:0,frames:[{delay:100,indices:Uint8Array.of(0,1)}]};
    expect(encoded(image)).toEqual(fullReference(image));
  });
  it.each([[50,2,37,2,74,2],[25,4,25,3,75,2],[50,2,38,2,76,1]])(
    'limits candidate work at75%% area: %s×%s with %s×%s rect (%s%%)',(w,h,rw,rh,_,calls)=>{
      const original=omggif.GifWriter,add=vi.fn();
      vi.spyOn(omggif,'GifWriter').mockImplementation(function(...args){const writer=new original(...args),real=writer.addFrame;
        writer.addFrame=(...frame)=>{add(...frame);return real(...frame);};return writer;});
      const indices=new Uint8Array(w*h);for(let y=0;y<rh;y++)indices.fill(1,y*w,y*w+rw);
      encoded({w,h,table:[0,0xffffff],transparent:0,frames:[{indices,delay:100}]});
      expect(add).toHaveBeenCalledTimes(calls);
    });
  it('preserves exact bytes for a full opaque256-color table',()=>{
    const image={w:16,h:16,table:Array.from({length:256},(_,i)=>i*65793),transparent:null,loop:0,
      frames:[{indices:Uint8Array.from({length:256},(_,i)=>i),delay:100}]};
    expect(encoded(image)).toEqual(fullReference(image));
  });
  it.each([false,true])('preserves logical frames and disposal with emptyFirst=%s',async emptyFirst=>{
    const image=imageFixture(emptyFirst),output=await encodePaletteGif(image),reader=new omggif.GifReader(output);
    expect([reader.width,reader.height,reader.numFrames(),reader.loopCount()]).toEqual([64,48,6,2]);
    for(let i=0;i<reader.numFrames();i++)expect(reader.frameInfo(i).disposal).toBe(2);
    expect(reader.frameInfo(2)).toMatchObject({x:0,y:0,width:1,height:1});
    expect(reader.frameInfo(3)).toMatchObject({x:63,y:47,width:1,height:1});
    expect(reader.frameInfo(4)).toMatchObject({x:0,y:0,width:64,height:48});
    if(emptyFirst)expect(reader.frameInfo(0)).toMatchObject({x:0,y:0,width:1,height:1});
  });
  it.each([['#000000','#ffffff'],[null,'#ffffff'],['#000000',null]])('retains legacy synchronous reference pixels for inks %j/%j',async(first,second)=>{
    const image=legacyFixture(first,second),before=image.frames.map(f=>f.mask.slice()),reference=encodeGif(image),output=await encodeGifAsync(image);
    expect(decodeGif(output)).toEqual(decodeGif(reference));expect(output.length).toBeLessThanOrEqual(reference.length);
    expect(image.frames.map(f=>f.mask)).toEqual(before);
  });
  it('does not add candidate frames or retain a growing candidate cache across1000frames',()=>{
    const w=8,h=8,frames=Array.from({length:1000},(_,i)=>{const indices=new Uint8Array(w*h);indices[i%64]=1;return{indices,delay:100};});
    const image={w,h,table:[0,0xffffff],transparent:0,loop:2,frames},reference=fullReference(image),output=encoded(image);
    expect(output.length).toBeLessThan(reference.length);expect(new omggif.GifReader(output).numFrames()).toBe(1000);
    expect(decodeGif(output)).toEqual(decodeGif(reference));
  });
  it('bounds requested and transient grown output capacity by this frame and its committed prefix',()=>{
    const original=omggif.GifWriter,growths=[];let capacity=1024;
    vi.spyOn(omggif,'GifWriter').mockImplementation(function(...args){const writer=new original(...args),set=writer.setOutputBuffer;
      writer.setOutputBuffer=next=>{growths.push({old:capacity,next:next.length,prefix:writer.getOutputBufferPosition()});capacity=next.length;return set(next);};return writer;});
    const w=8,h=8,indices=new Uint8Array(64);indices[9]=1;
    encoded({w,h,table:[0,0xffffff],transparent:0,frames:Array.from({length:1000},()=>({indices,delay:100}))});
    expect(growths.length).toBeGreaterThan(1);
    for(const growth of growths){
      const need=growth.prefix+2*w*h+1024+2+1024; // one-pixel candidate
      expect(growth.next).toBeLessThan(2*need);
      expect(growth.old+growth.next).toBeLessThan(3*need);
    }
  });
});
