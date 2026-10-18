import { describe, expect, it } from 'vitest';
import { sourceColorSummary, summaryImage } from './source-color-summary.js';
import { quantize } from './quantize.js';

const source = values => ({ width: values.length, height: 1, data: Uint8ClampedArray.from(values.flat()) });
describe('bounded immutable-source RGB summaries', () => {
  it('retains highest alpha per visible RGB and reuses completed immutable summaries', async () => {
    const original = source([[1,2,3,1],[1,2,3,128],[1,2,3,127],[4,5,6,255],[8,9,10,0]]);
    const summary = await sourceColorSummary(original);
    expect([...summary.rgb]).toEqual([0x010203, 0x040506]);
    expect([...summary.alpha]).toEqual([128,255]);
    expect(await sourceColorSummary(original)).toBe(summary);
    expect([...summaryImage(summary,128).data]).toEqual([1,2,3,128,4,5,6,255]);
    expect([...summaryImage(summary,129).data]).toEqual([4,5,6,255]);
    expect(summaryImage(summary,256)).toBe(null);
  });
  it('allows 4096 colors and bypasses high entropy without returning approximate counts', async () => {
    const values = Array.from({length:4097},(_,i)=>[i>>16,i>>8&255,i&255,255]);
    const accepted = await sourceColorSummary(source(values.slice(0,4096)));
    expect(accepted.rgb.length).toBe(4096);
    const bypass = source(values);
    expect(await sourceColorSummary(bypass)).toBe(null);
    expect(await sourceColorSummary(bypass)).toBe(null);
  });
  it('matches full nearest membership with Keep and every Cut boundary in both metrics', async () => {
    const original = source(Array.from({length:1024},(_,p)=>[p%7*35,p%5*50,p%3*90,p%256]));
    const summary = await sourceColorSummary(original);
    const palette = ['#000000','#ffffff','#ff0000','#00ff00','#0000ff'];
    for (const metric of ['rgb','oklab']) for (const alphaMode of ['cut','keep']) for (const cut of [1,64,128,255]) {
      const full = quantize(original,palette,cut,undefined,undefined,{metric,alphaMode});
      const small = summaryImage(summary,alphaMode === 'keep' ? 1 : cut);
      const used = small ? quantize(small,palette,cut,undefined,undefined,{metric,alphaMode}).used : new Uint8Array(256);
      expect([...used]).toEqual([...full.used]);
    }
  });
  it('represents fully empty sources exactly, ignoring hidden RGB', async () => {
    const summary = await sourceColorSummary(source([[20,30,40,0],[255,255,255,0]]));
    expect(summary.rgb.length).toBe(0); expect(summaryImage(summary)).toBe(null);
  });
  it('checks cancellation before warm-cache return and during a large cold scan', async () => {
    const original = {width:2048,height:2048,data:new Uint8ClampedArray(2048*2048*4).fill(255)};
    const controller = new AbortController();
    const pending = sourceColorSummary(original,{signal:controller.signal}); controller.abort();
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
    const summary = await sourceColorSummary(original);
    expect(summary.rgb.length).toBe(1);
    await expect(sourceColorSummary(original,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  });
  it('shares one cold scan across simultaneous independent callers', async () => {
    let reads=0;
    const data=new Uint8ClampedArray(2048*2048*4).fill(255);
    const original={width:2048,height:2048,get data(){reads++;return data;}};
    const [first,second]=await Promise.all([sourceColorSummary(original),sourceColorSummary(original)]);
    expect(first).toBe(second);expect(reads).toBe(1);
  });
  it('rejects an aborted queued caller without scanning or canceling another subscriber', async () => {
    const data=new Uint8ClampedArray(2048*2048*4).fill(255),first={width:2048,height:2048,data};
    let reads=0;
    const queued={width:1,height:1,get data(){reads++;return Uint8ClampedArray.of(0,0,0,255);}};
    const ongoing=sourceColorSummary(first),controller=new AbortController();
    const canceled=sourceColorSummary(queued,{signal:controller.signal});controller.abort();
    await expect(canceled).rejects.toMatchObject({name:'AbortError'});
    expect((await ongoing).rgb.length).toBe(1);expect(reads).toBe(0);
    expect((await sourceColorSummary(queued)).rgb.length).toBe(1);expect(reads).toBe(1);
  });
  it('does not poison an independent queued request when the scanning owner aborts', async () => {
    const original={width:2048,height:2048,data:new Uint8ClampedArray(2048*2048*4).fill(255)};
    const controller=new AbortController();
    const canceled=sourceColorSummary(original,{signal:controller.signal});
    const valid=sourceColorSummary(original);controller.abort();
    await expect(canceled).rejects.toMatchObject({name:'AbortError'});
    expect((await valid).rgb.length).toBe(1);
  });
});
