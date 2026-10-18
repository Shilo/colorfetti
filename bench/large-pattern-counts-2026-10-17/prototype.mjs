// Research prototype only. Production must share the existing tone and tile
// setup with mask rather than maintain these formula copies.
import { autoThreshold } from '../../src/lib/recolor.js';
export function bounds(img, style, opt = {}) {
  const t = opt.threshold ?? autoThreshold(img, style), shading = (opt.shading ?? 100)/100;
  const tones = Float64Array.from({length:256}, (_, l) => {
    const tone = l <= t ? (t > img.lo ? 0.5*(l-img.lo)/(t-img.lo) : 0) : 0.5+0.5*(l-t)/(img.hi-t);
    return shading ? Math.min(1, Math.max(0, 0.5+(tone-0.5)/shading)) : tone>0.5 ? 1 : 0;
  });
  const min = style==='checker' ? 0.25 : style==='hatch' ? 1/((opt.spacing??3)+1) : style==='bayer' ? 0.5/(opt.matrix??4)**2 : 0.5/256;
  const max = 1-min;
  let lower=0, upper=0;
  for(let l=0;l<256;l++) if(img.hist[l]) {
    const v=tones[l];
    if(!Number.isFinite(v)) return {lower:0,upper:3,exact:false};
    if(style==='atkinson') {
      if(v!==0 && v!==1) return {lower:0,upper:3,exact:false};
      lower |= v===1 ? 2 : 1; upper=lower;
    } else {
      const r=v<=min ? 1 : v>max ? 2 : 3;
      upper |= r;
      if(r!==3) lower |= r;
    }
  }
  return {lower,upper,exact:lower===upper};
}
