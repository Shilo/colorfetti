import { describe, it, expect } from 'vitest';
import { analyze, mask, colorize } from './recolor.js';
import { STYLES } from './presets.js';
import { preparePalette, quantize, colorize as palettePixels } from './quantize.js';
import { nativeInspectionQueue, sharedNativeInspectionQueue, renderNativeFrame } from './viewer-inspection.js';
import { nativeInspectionAllowed, NATIVE_VIEWER_PIXELS, NATIVE_VIEWER_MAX_AXIS, NATIVE_VIEWER_HEADROOM_BYTES } from './viewer-inspection-policy.js';

function fixture(w=67,h=41) {
  const data=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;data.set([(x*11+y*13)&255,(x*31+y*17)&255,(x*19+y*23)&255,(x+y)%7===0?0:(x+y)%9===0?111:255],p);}
  const original={data,width:w,height:h};return {original,img:analyze(original)};
}

describe('bounded selected native frame',()=>{
  it('admits2048² but rejects excess pixels, oversized axes and invalid geometry',()=>{
    expect(nativeInspectionAllowed(2048,2048)).toBe(true);
    expect(nativeInspectionAllowed(2049,2048)).toBe(false);
    expect(nativeInspectionAllowed(NATIVE_VIEWER_MAX_AXIS+1,1)).toBe(false);
    for(const dimensions of [[0,1],[-1,1],[1.5,1],[Infinity,2]])expect(nativeInspectionAllowed(...dimensions)).toBe(false);
  });
  it('reserves enough logical storage for coldIcon/mask plus a previous canvas and bounded metadata',()=>{
    // Independent allocation audit: Icon15P +maskP +priorcanvas4P;
    // spread coordinates8*(w+h) atmost16384/axis, glyph~65²*15 +paths32KiB,
    // palette/job metadata conservatively1MiB. Not a process-heap/GC/GPU assertion.
    const audited=20*NATIVE_VIEWER_PIXELS+16*NATIVE_VIEWER_MAX_AXIS+65**2*15+32768+1024**2;
    expect(audited).toBeLessThan(NATIVE_VIEWER_HEADROOM_BYTES);
  });
  for(const [style] of STYLES)it(`uses complete immutable analysis for${style}, includingNone`,async()=>{
    const frame=fixture(),originalData=frame.original.data.slice();
    const settings={family:'two-color',style,set:{},first:null,second:'#fafafa'};
    const native=await renderNativeFrame(frame,settings);
    const expected=colorize(mask({...frame.img,icons:{}},style,settings.set),settings.first,settings.second);
    expect(native.data).toEqual(expected);expect(native.width).toBe(67);expect(native.height).toBe(41);
    expect(frame.img.sprites).toBeUndefined();expect(frame.img.icons).toBeUndefined();expect(frame.original.data).toEqual(originalData);
  });
  it('preserves RGB/Oklab,Keep/Cut,dither and supplied frozenCleanup at original coordinates',async()=>{
    const frame=fixture(),palette=preparePalette(['#000000','#ffffff','#ff004d','#0099ff']);
    for(const metric of ['rgb','oklab'])for(const alphaMode of ['cut','keep'])for(const ditherStrength of [0,50,100]){
      const cleanup={result:{sentinel:true},apply:(result,frozen)=>{expect(frozen.sentinel).toBe(true);result.indices[0]=0;if(result.alpha)result.alpha[0]=255;}};
      const settings={family:'full-palette',palette,alphaCut:128,alphaMode,metric,dither:'4x4',ditherStrength,cleanup};
      const actual=await renderNativeFrame(frame,settings),expected=quantize(frame.original,palette,128,67,41,settings);
      cleanup.apply(expected,cleanup.result);expect(actual.data).toEqual(palettePixels(expected,palette).data);
    }
  });
  it('rejects unsupportednative sizes before reading buffers',async()=>{
    await expect(renderNativeFrame({original:{width:2049,height:2048}},{})).rejects.toThrow('4 megapixels');
  });
});

describe('native inspection queue',()=>{
  it('serializes replacement viewer owners after close until canceled old work actually settles',async()=>{
    const closedOwner=new AbortController(),openedOwner=new AbortController();
    let finishOld,active=0,peak=0,oldPublished=false,newStarted=false;
    const old=sharedNativeInspectionQueue.run(async()=>{
      active++;peak=Math.max(peak,active);
      await new Promise(resolve=>finishOld=resolve);active--;return 'old';
    },{signal:closedOwner.signal}).then(()=>oldPublished=true,error=>error.name);
    while(!finishOld)await new Promise(resolve=>setTimeout(resolve,0));
    closedOwner.abort();
    const fresh=sharedNativeInspectionQueue.run(async()=>{newStarted=true;active++;peak=Math.max(peak,active);active--;return 'fresh';},{signal:openedOwner.signal});
    await new Promise(resolve=>setTimeout(resolve,0));expect(newStarted).toBe(false);expect(active).toBe(1);
    finishOld();expect(await old).toBe('AbortError');expect(await fresh).toBe('fresh');
    expect(oldPublished).toBe(false);expect(peak).toBe(1);expect(active).toBe(0);
  });
  it('serializes active work and keeps only the latest pending request',async()=>{
    const queue=nativeInspectionQueue(),calls=[];let release;
    const active=queue.run(async()=>{calls.push('active');await new Promise(resolve=>release=resolve);return 1;});
    while(!release)await new Promise(resolve=>setTimeout(resolve,0));
    const removed=queue.run(()=>calls.push('removed')).catch(error=>error.name);
    const latest=queue.run(()=>{calls.push('latest');return 2;});
    expect(await removed).toBe('AbortError');expect(calls).toEqual(['active']);
    release();await active;await latest;expect(calls).toEqual(['active','latest']);
  });
  it('aborts queued work and refuses late active results',async()=>{
    const queue=nativeInspectionQueue(),controller=new AbortController();let release,ran=false;
    const active=queue.run(async()=>{await new Promise(resolve=>release=resolve);return 123;},{signal:controller.signal}).catch(error=>error.name);
    while(!release)await new Promise(resolve=>setTimeout(resolve,0));
    const nextController=new AbortController(),queued=queue.run(()=>{ran=true;},{signal:nextController.signal}).catch(error=>error.name);
    nextController.abort();controller.abort();release();
    expect(await active).toBe('AbortError');expect(await queued).toBe('AbortError');expect(ran).toBe(false);
  });
});
