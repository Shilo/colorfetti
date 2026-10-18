// Test-only finite interaction tracing. Never bundled into production.
(() => {
  if (window.__wholeAppProbe) return;
  const records=[], writes=[], longtasks=[],startup={};
  let active=null, raf=0, timer=0;
  const old=CanvasRenderingContext2D.prototype.putImageData;
  const node=document.createElement('script');node.type='application/json';node.id='whole-app-audit-receipts';document.documentElement.append(node);
  const env={userAgent:navigator.userAgent,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,input:'actual Codex Browser UI',cpuLimit:'No CDP CPU API; durations/LongTask/rAF only'};
  const persist=()=>{node.textContent=JSON.stringify({env,startup,navigation:performance.getEntriesByType('navigation').map(e=>({duration:e.duration,domContentLoaded:e.domContentLoadedEventEnd,load:e.loadEventEnd})),records});};
  const mounted=new MutationObserver(()=>{const b=document.querySelector('button:not([disabled])');if(b){startup.firstEnabledButtonAt=performance.now();startup.buttonLabel=b.getAttribute('aria-label')||b.textContent?.trim().slice(0,100);mounted.disconnect();}});mounted.observe(document.documentElement,{subtree:true,childList:true});
  const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longtasks.push({start:e.startTime,duration:e.duration});});observer.observe({type:'longtask'});
  CanvasRenderingContext2D.prototype.putImageData=function(...args){
    const value=old.apply(this,args);
    if(this.canvas.closest('.grid,.image-viewer')){startup.firstArtPaintAt??=performance.now();if(active)writes.push({at:performance.now(),width:this.canvas.width,height:this.canvas.height});}
    return value;
  };
  function finish(){
    if(!active)return;cancelAnimationFrame(raf);clearTimeout(timer);
    const t=performance.now(),g=active.frames.slice(1).map((v,i)=>v-active.frames[i]).sort((a,b)=>a-b);
    records.push({event:active.event,start:active.start,end:t,elapsed:t-active.start,rafCount:active.frames.length,rafMaxMs:g.at(-1)||0,rafP95Ms:g[Math.floor(g.length*.95)]||0,longtasks:longtasks.filter(x=>x.start>=active.start&&x.start<t),paints:writes.splice(0),wall:[...document.querySelectorAll('.grid figure')].map(f=>({name:f.querySelector('.caption-preview')?.textContent,caption:f.querySelector('.dim')?.textContent,width:f.querySelector('.art canvas')?.width,height:f.querySelector('.art canvas')?.height})),pressed:[...document.querySelectorAll('[aria-pressed=true]')].map(x=>x.getAttribute('aria-label')||x.textContent?.trim())});
    if(records.length>30)records.shift();longtasks.length=0;active=null;persist();
  }
  function frame(t){if(active){if(active.frames.length<2048)active.frames.push(t);raf=requestAnimationFrame(frame);}}
  function start(e){
    const target=e.target instanceof Element?e.target.closest('button,input,textarea')||e.target:null;
    if(!target)return;finish();
    active={event:{type:e.type,label:target.getAttribute('aria-label')||target.textContent?.trim().slice(0,100)||target.tagName,inputValue:target instanceof HTMLInputElement?target.value:undefined},start:performance.now(),frames:[]};
    raf=requestAnimationFrame(frame);timer=setTimeout(finish,2000);
  }
  for(const kind of ['click','change','paste','drop'])document.addEventListener(kind,start,true);
  window.__wholeAppProbe={dispose(){finish();observer.disconnect();mounted.disconnect();CanvasRenderingContext2D.prototype.putImageData=old;for(const kind of ['click','change','paste','drop'])document.removeEventListener(kind,start,true);delete window.__wholeAppProbe;}};
  persist();
})();
