import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { analyze, mask, unify } from '../../src/lib/recolor.js';
import { maskRoles } from '../../src/lib/onebit-usage.js';
import { bounds } from './prototype.mjs';
const styles=['checker','bayer','hatch','noise','atkinson'];
let seed=123456789;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed;};
function image(w,h,mode=0) {
 const data=new Uint8ClampedArray(w*h*4);
 for(let p=0;p<w*h;p++) { const l=mode===1?127:mode===2?0:mode===3?255:random()&255; data.set([l,l,l,(random()%5)?255:0],p*4); }
 return analyze({width:w,height:h,data});
}
let cases=0,exact=0,ambiguous=0;
for(let n=0;n<70;n++) {
 const img=image(1+random()%63,1+random()%57,n%5);
 for(const style of styles) for(const threshold of [null,0,1,127,254,255]) for(const shading of [0,1,50,100]) {
  const opt={threshold,shading,scale:1+random()%4,matrix:[2,4,8][random()%3],spacing:3+random()%4,direction:['/','\\','-','|'][random()%4],diffusion:['atkinson','floyd','stucki'][random()%3]};
  const expected=maskRoles(mask(img,style,opt)), actual=bounds(img,style,opt);
  assert.equal(actual.lower & expected,actual.lower,`${style} lower overclaim`);
  assert.equal(actual.upper | expected,actual.upper,`${style} upper underclaim`);
  if(actual.exact) {assert.equal(actual.lower,expected);exact++;} else ambiguous++;
  cases++;
 }
}
const animation=[image(31,27,2),image(31,27,1),image(31,27,3)];
unify(animation);
for(const img of animation) for(const style of styles) {
 const actual=bounds(img,style),expected=maskRoles(mask(img,style));
 assert.equal(actual.lower&expected,actual.lower);assert.equal(actual.upper|expected,actual.upper);
 if(actual.exact) assert.equal(actual.lower,expected);
 cases++;
}
const large=image(2048,2048),timings=[];
for(const style of styles) {
 const start=performance.now(), answer=bounds(large,style), elapsed=performance.now()-start;
 const before=performance.now(), expected=maskRoles(mask(large,style)), oracleMs=performance.now()-before;
 if(answer.exact) assert.equal(answer.lower,expected);
 timings.push({style,answer,histogramMs:elapsed,oracleMs});
}
const result={cases,exact,ambiguous,timings};
await writeFile(new URL('./result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
