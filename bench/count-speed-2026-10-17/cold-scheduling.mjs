import { writeFile } from 'node:fs/promises';
import { sourceColorSummary } from '../../src/lib/source-color-summary.js';
const data=new Uint8ClampedArray(2048*2048*4);
for(let p=0;p<data.length;p+=4){data[p]=(p/4)%8*32;data[p+3]=255;}
const trials=[];
for(let trial=0;trial<5;trial++){
  let last=performance.now(),maxTimerGapMs=0,ticks=0;
  const timer=setInterval(()=>{const now=performance.now();maxTimerGapMs=Math.max(maxTimerGapMs,now-last);last=now;ticks++;},1);
  const start=performance.now();const summary=await sourceColorSummary({width:2048,height:2048,data});
  clearInterval(timer);
  trials.push({trial,totalMs:performance.now()-start,maxTimerGapMs,ticks,colors:summary.rgb.length});
}
const receipt={kind:'Node timer probe only; first trial is a cold JS engine, not a browser latency guarantee',trials};
console.log(JSON.stringify(receipt,null,2));
await writeFile(new URL('cold-scheduling.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
