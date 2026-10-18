import{pngBytes,palettePngBytes,palettePngBytesAsync}from'../../../src/lib/save.js';
import{keepFixture,boundaryFixture,legacyFixture,legacyAsPalette,sourcePng}from'./fixtures.mjs';
const phase=__M8_PHASE__,frame=document.querySelector('#app');
frame.addEventListener('load',()=>{const target=frame.contentWindow,blobs=new Map(),create=target.URL.createObjectURL.bind(target.URL);
  target.URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};const original=target.HTMLAnchorElement.prototype.click;
  target.HTMLAnchorElement.prototype.click=function(){const blob=this.download&&blobs.get(this.href);if(!blob)return original.call(this);const name=this.download,label=document.querySelector('#label').value;
    void fetch('/capture?name='+encodeURIComponent(label+'-'+name),{method:'POST',body:blob}).then(()=>{document.querySelector('#captures').textContent=`Actual App captured: ${label}/${name}, ${blob.size} bytes`;});};});
async function native(bytes){const decoder=new ImageDecoder({data:bytes,type:'image/png'});try{const{image}=await decoder.decode();try{const out=new Uint8Array(image.allocationSize({format:'RGBA'}));await image.copyTo(out,{format:'RGBA'});return out;}finally{image.close();}}finally{decoder.close();}}
function same(a,b){return a.length===b.length&&a.every((v,p)=>p%4===3||a[p-p%4+3]?v===b[p]:true);}
function info(bytes){const chunks=[];for(let p=8;p<bytes.length;){const n=new DataView(bytes.buffer,bytes.byteOffset+p).getUint32(0);chunks.push(new TextDecoder().decode(bytes.subarray(p+4,p+8)));p+=n+12;}return{depth:bytes[24],type:bytes[25],srgb:chunks.includes('sRGB'),bytes:bytes.length};}
document.querySelector('#run').onclick=async()=>{const cases=[];try{
  for(const[id,image]of[['keep128',keepFixture()],['keep256',boundaryFixture(256)],['keep257',boundaryFixture(257)],['tinyKeep',{w:1,h:1,colors:['#c1482e'],indices:Uint16Array.of(0),alpha:Uint8Array.of(128)}]]){
    const sync=palettePngBytes(image),asyncBytes=await palettePngBytesAsync(image),expected=await native(sourcePng(image));
    cases.push({id,...info(sync),nativeVisibleRgbAndAlphaExact:same(expected,await native(sync)),asyncMatches:sync.length===asyncBytes.length&&sync.every((v,p)=>v===asyncBytes[p])});}
  for(const kind of['opaque','none','three']){const image=legacyFixture(kind),bytes=pngBytes(image);cases.push({id:'legacy-'+kind,...info(bytes),nativeVisibleRgbAndAlphaExact:same(await native(sourcePng(legacyAsPalette(image))),await native(bytes))});}
  {const image=legacyFixture('opaque',2048,2048),bytes=pngBytes(image);cases.push({id:'legacy-large-4MP',...info(bytes),nativeVisibleRgbAndAlphaExact:same(await native(sourcePng(legacyAsPalette(image))),await native(bytes))});}
  const report={phase,userAgent:navigator.userAgent,cases,passed:cases.every(c=>c.nativeVisibleRgbAndAlphaExact!==false&&c.asyncMatches!==false&&c.nativeDecoded!==false)};
  document.querySelector('#results').innerHTML=`<h2 class="${report.passed?'pass':'fail'}">${report.passed?'PASS':'FAIL'}: native PNG decoding</h2><table><tr><th>Case</th><th>PNG type</th><th>Bits</th><th>sRGB</th><th>Bytes</th><th>Native pixels / sync-async</th></tr>${cases.map(c=>`<tr><td>${c.id}</td><td>${c.type}</td><td>${c.depth}</td><td>${c.srgb}</td><td>${c.bytes}</td><td>${c.nativeVisibleRgbAndAlphaExact??c.nativeDecoded} / ${c.asyncMatches??'sync'}</td></tr>`).join('')}</table>`;
  document.querySelector('#receipt').textContent=JSON.stringify(report,null,2);await fetch('/receipt',{method:'POST',body:JSON.stringify(report)});
}catch(error){document.querySelector('#results').textContent=error.stack;}};
document.querySelector('#keep').onclick=()=>{document.querySelector('#label').value='keep';const target=frame.contentWindow,transfer=new DataTransfer();transfer.items.add(new File([sourcePng(keepFixture())],'keep128.png',{type:'image/png'}));
  target.document.dispatchEvent(new target.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));};
document.querySelector('#legacy').onclick=()=>{document.querySelector('#label').value='legacy4m';const target=frame.contentWindow,transfer=new DataTransfer();transfer.items.add(new File([sourcePng(legacyAsPalette(legacyFixture('opaque',2048,2048)))],'legacy4m.png',{type:'image/png'}));
  target.document.dispatchEvent(new target.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));};
