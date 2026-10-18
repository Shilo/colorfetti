import omggif from 'omggif';
import { encodeGif, encodeGifAsync, encodePaletteGif, decodeGif } from '../../../src/lib/gif.js';
import { imageFixture, legacyFixture, sourceGif } from './fixtures.mjs';
const phase=__M7_PHASE__, frame=document.querySelector('#app');
frame.addEventListener('load',()=>{
  const target=frame.contentWindow,blobs=new Map(),create=target.URL.createObjectURL.bind(target.URL);
  target.URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};
  const original=target.HTMLAnchorElement.prototype.click;
  target.HTMLAnchorElement.prototype.click=function(){
    const blob=this.download&&blobs.get(this.href);if(!blob)return original.call(this);
    const name=this.download,label=document.querySelector('#label').value;
    void fetch('/capture?name='+encodeURIComponent(label+'-'+name),{method:'POST',body:blob}).then(()=>{
      document.querySelector('#downloads').textContent=`Actual App captured: ${label}/${name}, ${blob.size} bytes`;
    });
  };
});
async function nativeFrames(bytes){
  const decoder=new ImageDecoder({data:bytes,type:'image/gif'}),frames=[];
  try{
    await decoder.tracks.ready;
    for(let i=0;i<decoder.tracks.selectedTrack.frameCount;i++){
      const {image}=await decoder.decode({frameIndex:i});
      try{const data=new Uint8Array(image.allocationSize({format:'RGBA'}));await image.copyTo(data,{format:'RGBA'});
        frames.push({data,width:image.displayWidth,height:image.displayHeight});}finally{image.close();}
    }
  }finally{decoder.close();}
  return frames;
}
function samePixels(a,b){
  if(a.length!==b.length)return false;
  return a.every((f,i)=>f.width===b[i].width&&f.height===b[i].height&&f.data.every((v,p)=>
    p%4===3||f.data[p-p%4+3]?v===b[i].data[p]:true));
}
document.querySelector('#run').onclick=async()=>{
  const cases=[];
  try{
    for(const emptyFirst of [false,true]){
      const image=imageFixture(emptyFirst),baseline=sourceGif(image),output=await encodePaletteGif(image);
      const reader=new omggif.GifReader(output),rects=Array.from({length:reader.numFrames()},(_,i)=>{
        const f=reader.frameInfo(i);return[f.x,f.y,f.width,f.height,f.disposal];});
      cases.push({id:`Palette ${emptyFirst?'empty first':'large to small'}`,nativePixelsExact:samePixels(await nativeFrames(baseline),await nativeFrames(output)),
        timingLoopExact:JSON.stringify(decodeGif(baseline).frames.map(f=>f.delay))===JSON.stringify(decodeGif(output).frames.map(f=>f.delay))&&decodeGif(output).loop===image.loop,
        croppingActive:rects[emptyFirst?0:1][2]<image.w,rects,baselineBytes:baseline.length,outputBytes:output.length});
    }
    for(const [name,first,second]of[['both inks','#000000','#ffffff'],['first None',null,'#ffffff'],['second None','#000000',null]]){
      const image=legacyFixture(first,second),baseline=encodeGif(image),output=await encodeGifAsync(image),reader=new omggif.GifReader(output);
      cases.push({id:`1-bit ${name}`,nativePixelsExact:samePixels(await nativeFrames(baseline),await nativeFrames(output)),
        timingLoopExact:JSON.stringify(decodeGif(baseline).frames.map(f=>f.delay))===JSON.stringify(decodeGif(output).frames.map(f=>f.delay))&&decodeGif(output).loop===image.loop,
        croppingActive:reader.frameInfo(2).width===1,baselineBytes:baseline.length,outputBytes:output.length});
    }
    const report={phase,userAgent:navigator.userAgent,date:new Date().toISOString(),cases,passed:cases.every(c=>c.nativePixelsExact&&c.timingLoopExact&&c.croppingActive)};
    document.querySelector('#results').innerHTML=`<h2 class="${report.passed?'pass':'fail'}">${report.passed?'PASS':'FAIL'}: native decoded parity and cropped descriptors</h2><table><tr><th>Case</th><th>All alpha / visible RGB</th><th>Timing / repeats</th><th>Crop active</th><th>Full→current bytes</th></tr>${cases.map(c=>`<tr><td>${c.id}</td><td>${c.nativePixelsExact?'PASS':'FAIL'}</td><td>${c.timingLoopExact?'PASS':'FAIL'}</td><td>${c.croppingActive?'YES':'NO'}</td><td>${c.baselineBytes}→${c.outputBytes}</td></tr>`).join('')}</table>`;
    document.querySelector('#receipt').textContent=JSON.stringify(report,null,2);
    await fetch('/receipt',{method:'POST',body:JSON.stringify(report)});
  }catch(error){document.querySelector('#results').textContent=error.stack;}
};
document.querySelector('#wall').onclick=()=>{
  const target=frame.contentWindow,transfer=new DataTransfer();
  transfer.items.add(new File([sourceGif()],'crop-challenge.gif',{type:'image/gif'}));
  target.document.dispatchEvent(new target.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
};
