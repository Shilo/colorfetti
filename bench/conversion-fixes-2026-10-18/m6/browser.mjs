import{outNames,downloadName,pngBytes}from'../../../src/lib/save.js';
const phase=__M6_PHASE__,frame=document.querySelector('#app'),names=['a:b.png','a?b.png','a-b.png','A-B.JPG','CON.png','CON.note.png','café.png','cafe\u0301.PNG','a\u0000b.png','f'.repeat(400)+'.png'];
const bytes=pngBytes({w:2,h:1,first:'#000000',second:'#ffffff',mask:Uint8Array.of(1,2)});
let dragFile;
const post=(url,body)=>fetch(url,{method:'POST',body});
frame.addEventListener('load',()=>{
  const target=frame.contentWindow,blobs=new Map(),create=target.URL.createObjectURL.bind(target.URL);
  target.URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);
    if(blob instanceof target.File){dragFile=blob;document.querySelector('#drag-result').textContent=`Actual App drag prepared: ${blob.name}`;}
    return url;
  };
  const original=target.HTMLAnchorElement.prototype.click;
  target.HTMLAnchorElement.prototype.click=function(){
    const blob=this.download&&blobs.get(this.href);if(!blob)return original.call(this);
    const name=this.download;
    void post('/capture?name='+encodeURIComponent(name),blob).then(()=>{document.querySelector('#captures').textContent=`Actual App captured: ${name}, ${blob.size} bytes`;});
  };
});
document.querySelector('#run').onclick=async()=>{
  const outputs=outNames(names),encoder=new TextEncoder(),seen=new Set();
  const cases=outputs.map((name,i)=>{
    const key=name.normalize('NFC').toUpperCase(),collision=seen.has(key);seen.add(key);
    const portable=!/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\p{Bidi_Control}]/u.test(name)&&encoder.encode(name).length<=255
      &&!/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]) *(\.|$)/iu.test(name)&&!/[ .]$/.test(name);
    return{input:names[i],output:name,portable,unique:!collision,bytes:encoder.encode(name).length};
  });
  const report={phase,userAgent:navigator.userAgent,cases,passed:cases.every(c=>c.portable&&c.unique)};
  document.querySelector('#results').innerHTML=`<h2 class="${report.passed?'pass':'fail'}">${report.passed?'PASS':'FAIL'}: portable unique names</h2><table><tr><th>Source</th><th>Output</th><th>Portable</th><th>Unique</th><th>UTF-8 bytes</th></tr>${cases.map(c=>`<tr><td>${c.input.replace(/[<>]/g,'?').slice(0,40)}</td><td>${c.output}</td><td>${c.portable?'PASS':'FAIL'}</td><td>${c.unique?'PASS':'FAIL'}</td><td>${c.bytes}</td></tr>`).join('')}</table>`;
  document.querySelector('#receipt').textContent=JSON.stringify(report,null,2);await post('/receipt',JSON.stringify(report));
};
function drop(values){const target=frame.contentWindow,transfer=new DataTransfer();for(const name of values)transfer.items.add(new File([bytes],name,{type:'image/png'}));
  target.document.dispatchEvent(new target.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));}
document.querySelector('#first').onclick=()=>drop(names.slice(0,1));
document.querySelector('#rest').onclick=()=>drop(names.slice(1));
document.querySelector('#prepare').onclick=()=>{const target=frame.contentWindow,art=target.document.querySelector('.tile .art');
  if(!art){document.querySelector('#drag-result').textContent='Import an image first';return;}
  art.dispatchEvent(new target.PointerEvent('pointerenter',{pointerType:'mouse',isPrimary:true}));
};
document.querySelector('#drag').onclick=async()=>{
  const target=frame.contentWindow,art=target.document.querySelector('.tile .art'),source=art?.querySelector('.export-drag-image');
  if(!source||!dragFile){document.querySelector('#drag-result').textContent='Drag is not prepared yet';return;}
  art.dispatchEvent(new target.PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse',isPrimary:true,button:0}));
  const transfer=new target.DataTransfer();transfer.items.add(dragFile);
  const event=new target.DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});source.dispatchEvent(event);
  const downloadURL=transfer.getData('DownloadURL'),expected=downloadName({name:names[0]}),matches=downloadURL.startsWith(`image/png:${expected}:`);
  const report={phase,fileName:dragFile.name,downloadURL,prevented:event.defaultPrevented,matchesSaveName:matches};
  document.querySelector('#drag-result').textContent=`Actual App drag ${event.defaultPrevented?'REFUSED':'accepted'}: ${dragFile.name}; matches Save: ${matches}`;
  await post('/drag',JSON.stringify(report));source.dispatchEvent(new target.DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));
};
