import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import * as before from './recolor-baseline.js';
// Deliberately inspect the archived rejected candidate, not shipped runtime.
import * as after from './candidate-recolor.js';
import { defaults, STYLE_SETTINGS } from '../../src/lib/settings.js';
import { bounds } from './prototype.mjs';
const styles=Object.keys(STYLE_SETTINGS), ball=after.previewBall();
let cases=0,seed=31979;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let i=0;i<15;i++) {
 const width=1+rand()%39,height=1+rand()%31,data=new Uint8ClampedArray(width*height*4);
 for(let p=0;p<data.length;p++)data[p]=rand()>>>24;
 const pixels={width,height,data},old=before.analyze(pixels),now=after.analyze(pixels);
 for(const style of styles)for(const dimensions of [[width,height],[Math.ceil(width/3),Math.ceil(height/2)]])for(const set of [defaults(style),{...defaults(style),threshold:112,shading:50,scale:3,matrix:8,spacing:6,direction:'\\',thickness:3,diffusion:'stucki'}]) {
  assert.deepEqual(after.mask(now,style,set,...dimensions),before.mask(old,style,set,...dimensions));cases++;
 }
 for(const style of ['checker','bayer','hatch','noise','atkinson']) {
  const prototype=bounds(now,style),production=after.patternRoleBounds(now,style);
  assert.deepEqual(production,prototype.exact||style!=='atkinson'?{lower:prototype.lower,upper:prototype.upper}:null);
 }
}
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const timings=[];
for(const style of styles) {
 const opt=defaults(style),samples={before:[],after:[]};
 for(let warm=0;warm<2000;warm++){before.mask(ball,style,opt);after.mask(ball,style,opt);}
 for(let rep=0;rep<16;rep++)for(const which of rep%2?['before','after']:['after','before']) {
  const fn=which==='before'?before.mask:after.mask,start=performance.now();
  for(let n=0;n<1000;n++)fn(ball,style,opt);
  samples[which].push((performance.now()-start)/1000);
 }
 timings.push({style,beforeMs:median(samples.before),afterMs:median(samples.after)});
}
const result={byteIdenticalCases:cases,tinyMaskMedianMs:timings};
await writeFile(new URL('./parity-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
