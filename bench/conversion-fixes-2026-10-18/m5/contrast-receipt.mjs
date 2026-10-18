import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const dir=resolve('bench/conversion-fixes-2026-10-18/m5');
function parse(value){
  if(value.startsWith('color(srgb ')){
    const [rgb,alpha]=value.slice(11,-1).split('/');
    return [...rgb.trim().split(/\s+/).map(Number).map(n=>n*255),alpha===undefined?1:Number(alpha)];
  }
  const channels=value.match(/[\d.]+/g).map(Number);
  return [...channels.slice(0,3),channels[3]??1];
}
function over(fg,bg){return fg.slice(0,3).map((n,i)=>n*fg[3]+bg[i]*(1-fg[3]));}
function luminance(rgb){return rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);}
function contrast(fg,bg){const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
const measurements=[];
for(const file of readdirSync(dir).filter(f=>f.endsWith('-computed.json')).sort()){
  const raw=JSON.parse(readFileSync(resolve(dir,file),'utf8'));
  const controls=Array.isArray(raw)?raw:raw.controls;
  for(const control of controls){
    const stack=control.backgrounds;
    const end=stack.findIndex(layer=>parse(layer.color)[3]===1);
    if(end<0)throw Error('No opaque backing: '+file);
    const background=stack.slice(0,end+1).reverse().reduce((bg,layer)=>{
      if(layer.backgroundImage!=='none')throw Error('Unmodeled background image: '+file);
      return over(parse(layer.color),bg);
    },[0,0,0]);
    const color=parse(control.color);
    color[3]*=Number(control.opacity);
    const foreground=over(color,background);
    measurements.push({capture:file,theme:raw.theme??'light',viewport:raw.viewport??{width:1280,height:720},label:control.label,disabled:control.disabled,selected:control.selected,hover:control.hover??false,focusVisible:control.focusVisible??false,background,foreground,ratio:contrast(foreground,background),required:control.disabled?null:4.5});
  }
}
const after=measurements.filter(m=>m.capture.startsWith('revised-')&&!m.disabled);
if(after.some(m=>m.ratio<4.5))throw Error('Enabled after contrast below4.5:1');
const result={date:'2026-10-18',method:'WCAG sRGB relative luminance, alpha-composed CSS ancestor backgrounds stopped at the opaque palette-editor backing. Text opacity included. Disabled labels measured but exempt. This is a computed-style audit, not screenshot pixel sampling.',variants:{'before-':'Original baseline build on5206','after-':'Initial two-role correction on5207','prerevision-':'Related existing Cancel/hint defect found during challenge on5207','revised-':'Final four-role correction on5208'},limitations:['Forced-colors emulation and pointer-coarse emulation are not exposed by this Codex browser capability set. Existing UA forced-color adjustments and inherited app system-color adapters remain unchanged.','Viewport checks use a desktop Chromium browser at1280x720 and390x844, not a physical phone.','Some raw captures include a .16s color/surface transition in progress; final and intermediate enabled values pass.'],finalControlObservations:measurements.filter(m=>m.capture.startsWith('revised-')).length,worstEnabledAfter:after.reduce((a,b)=>a.ratio<b.ratio?a:b),measurements};
writeFileSync(resolve(dir,'contrast-results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({count:measurements.length,worstEnabledAfter:result.worstEnabledAfter},null,2));
