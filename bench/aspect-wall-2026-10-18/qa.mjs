// Full production-app browser QA. Run after implementing/building the wall:
// node bench/aspect-wall-2026-10-18/qa.mjs
// BASE_URL=http://... uses an existing server. QUICK=1 runs representative cases.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { unzipSync } from 'fflate';
import { generateFixtures } from './fixtures.mjs';

const require=createRequire(import.meta.url);
const playwright=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const engine=process.env.ENGINE||'edge';assert(['edge','firefox','webkit'].includes(engine),'ENGINE must be edge, firefox or webkit');
const reportTag=process.env.REPORT_TAG||'';assert(/^[a-z0-9-]*$/.test(reportTag));const outputPrefix=`${engine==='edge'?'':engine+'-'}${reportTag?reportTag+'-':''}`;
const fixtures=await generateFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));
const out=new URL('./results/',import.meta.url);await mkdir(out,{recursive:true});
// Keep ephemeral browser profiles inside the authorized workspace on Windows.
const browserTemp=fileURLToPath(new URL('../../.tmp/aspect-wall-browser/',import.meta.url));await mkdir(browserTemp,{recursive:true});process.env.TEMP=browserTemp;process.env.TMP=browserTemp;
const quick=process.env.QUICK==='1';
let server,base=process.env.BASE_URL;
if(!base){server=await preview({preview:{port:0,host:'127.0.0.1'}});base=`http://127.0.0.1:${server.httpServer.address().port}`;}
const browser=await (engine==='edge'?playwright.chromium:playwright[engine]).launch({headless:true,...(engine==='edge'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',chromiumSandbox:true}:engine==='firefox'?{executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/firefox-1538/firefox/firefox.exe'}:{executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/webkit-2336/Playwright.exe'})});
const report={date:new Date().toISOString(),engine,browser:browser.version(),base,notes:['Browser automation complements manual Codex browser visual review.','Touch cases use browser touch emulation; Firefox uses touch-capable narrow viewports without unsupported isMobile emulation. These are not physical-device or Safari tests.','Images enter through the actual hidden artwork file input; no application state or rendering override.'],checks:[],errors:[]};
const contexts=[
  ['desktop',1440,1000,false,1],['laptop',1280,720,false,1],['wide',1920,1080,false,1],['tablet-mouse',800,900,false,1],
  ['phone-small',320,568,true,2],['phone',390,844,true,3],['phone-large',430,932,true,3],['tablet',768,1024,true,2],
  ['landscape-small',568,320,true,2],['landscape',844,390,true,3],['short-desktop',1100,400,false,1],['narrow-mouse',360,700,false,1],
];
const sets=[
  ['square',['square']],['wide',['aurora']],['tall',['vertical']],['panorama',['banner']],['portrait',['phone']],
  ['squares',Array(6).fill('square')],['wide-pair',['aurora','strip']],['tall-pair',['vertical','tower']],
  ['balanced',['square','landscape','portrait','widescreen','phone','banner']],
  ['extremes',['aurora','vertical','strip','tower','square','transparent']],
  ['all',fixtures.map(f=>f.id)],['stress',Array.from({length:36},(_,i)=>fixtures[i%fixtures.length].id)],
];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function assertGeometry(m,label){
  assert(m.documentWidth<=m.viewport.width+1,`${label}: document overflows horizontally`);
  assert(m.wall.scrollWidth<=m.wall.clientWidth+1,`${label}: wall overflows horizontally`);
  const rows=[];
  for(let i=0;i<m.tiles.length;i++) {
    const t=m.tiles[i];
    assert(t.art.width>0&&t.art.height>0,`${label}: zero-sized artwork ${i}`);
    assert(t.tile.x>=m.wall.x-1&&t.tile.right<=m.wall.right+1,`${label}: tile outside wall ${i}`);
    assert(t.cap.y>=t.art.bottom-1,`${label}: caption covers art ${i}`);
    assert(t.cap.x>=t.tile.x-1&&t.cap.right<=t.tile.right+1,`${label}: caption outside tile ${i}`);
    assert(t.name.width>7,`${label}: filename unreadable ${i}`);
    assert(t.metadata.width>7,`${label}: metadata unreadable ${i}`);
    if(m.touch){
      assert(t.more&&t.more.width>=44&&t.more.height>=44,`${label}: More target below 44px ${i}`);
      assert(t.more.x>=t.cap.x&&t.more.right<=t.cap.right+1,`${label}: More outside caption ${i}`);
      assert(t.metadata.y>=t.name.bottom-1,`${label}: touch metadata must remain below filename ${i}`);
      assert(t.cap.height>=52&&t.actionsDisplay==='none',`${label}: touch caption/actions changed ${i}`);
    }else{
      assert.equal(t.more.width,0,`${label}: mobile More appeared on desktop ${i}`);
      assert(t.cap.height>=26&&t.cap.height<=27,`${label}: desktop caption must retain compact single-line height ${i}`);
      assert(Math.abs(t.name.y+t.name.height/2-t.metadata.y-t.metadata.height/2)<3,`${label}: desktop filename/metadata stacked ${i}`);
      assert.equal(t.actionsDisplay,'flex',`${label}: desktop hover actions missing ${i}`);
      assert(t.actions.x>=t.tile.x-1&&t.actions.right<=t.tile.right+1&&t.actions.bottom<=t.art.bottom+1,`${label}: desktop action capsule exceeds artwork ${i}`);
      if(t.countOrder!==null)assert(t.countOrder<t.resolutionOrder,`${label}: desktop count/resolution order changed ${i}`);
    }
    if(t.canvas){assert(t.canvas.width>0&&t.canvas.height>0,`${label}: blank backing canvas ${i}`);if(t.source.length===2)assert(Math.abs((t.canvas.width/t.canvas.height)/(t.source[0]/t.source[1])-1)<.04,`${label}: source aspect distorted in backing raster ${i}`);}
    for(let j=0;j<i;j++) {const b=m.tiles[j].tile;assert(t.tile.right<=b.x+.7||t.tile.x>=b.right-.7||t.tile.bottom<=b.y+.7||t.tile.y>=b.bottom-.7,`${label}: overlapping tiles ${j}/${i}`);}
    let row=rows.find(r=>Math.abs(r.y-t.art.y)<1);if(!row){row={y:t.art.y,tiles:[]};rows.push(row);}row.tiles.push(t);
  }
  for(const row of rows)if(row.tiles.length>1){const bottoms=row.tiles.map(t=>t.art.bottom),caps=row.tiles.map(t=>t.cap.y);assert(Math.max(...bottoms)-Math.min(...bottoms)<1.1,`${label}: uneven artwork baseline`);assert(Math.max(...caps)-Math.min(...caps)<1.1,`${label}: uneven caption baseline`);for(let i=1;i<row.tiles.length;i++)assert(row.tiles[i].tile.x-row.tiles[i-1].tile.right>=11,`${label}: horizontal gutter below12px`);}
  // All content, including the last caption, must be reachable above controls.
  assert(m.probe.bottom<=m.toolsTop+1,`${label}: fitted artwork area beneath editing controls`);
  return rows.length;
}
async function measure(page){return page.evaluate(()=>{
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const order=(el,selector)=>{const child=el.querySelector(selector);return child?Number(getComputedStyle(child).order):null;};
  const wall=document.querySelector('.grid'),tools=[...document.querySelectorAll('.workspace-tools')].map(rect);
  return{viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,touch:document.documentElement.dataset.hover==='none'||matchMedia('(hover:none)').matches,
    wall:{...rect(wall),clientWidth:wall.clientWidth,scrollWidth:wall.scrollWidth,scrollHeight:wall.scrollHeight,clientHeight:wall.clientHeight},probe:rect(document.querySelector('.probe')),toolsTop:Math.min(...tools.map(r=>r.y)),
    tiles:[...document.querySelectorAll('.grid .tile')].map(tile=>({tile:rect(tile),art:rect(tile.querySelector('.art')),cap:rect(tile.querySelector('.cap')),name:rect(tile.querySelector('.name')),metadata:rect(tile.querySelector('.caption-metadata')),more:rect(tile.querySelector('.tile-share')),actions:rect(tile.querySelector('.acts')),actionsDisplay:getComputedStyle(tile.querySelector('.acts')).display,countOrder:order(tile,'.caption-color-count'),resolutionOrder:order(tile,'.caption-resolution'),source:(tile.querySelector('.caption-resolution')?.textContent.match(/\d+/g)||[]).map(Number),canvas:(()=>{const c=tile.querySelector('canvas');return c?{width:c.width,height:c.height}:null;})(),text:tile.querySelector('.cap')?.textContent}))};
});}
async function waitWall(page,count){
  await page.waitForFunction(n=>document.querySelectorAll('.grid .tile').length===n,count);
  await page.waitForFunction(()=>[...document.querySelectorAll('.grid .tile .art')].every(n=>n.clientWidth>0&&n.clientHeight>0));
  await pause(250);
}
async function rememberNodes(page){await page.evaluate(()=>window.__aspectNodes=[...document.querySelectorAll('.grid .tile')]);}
async function checkNodes(page){assert(await page.evaluate(()=>window.__aspectNodes.every((n,i)=>n===document.querySelectorAll('.grid .tile')[i])),'layout remounted unchanged Tile instances');}
async function check(label,fn){try{const value=await fn();report.checks.push({label,pass:true,...value});console.log('PASS',label);}catch(error){report.checks.push({label,pass:false,error:error.stack});console.error('FAIL',label,error.message);}}
try{
  const configurations=contexts.filter(c=>!quick||['desktop','phone','landscape'].includes(c[0]));
  // Isolated contexts have independent sources/workers; three at once keeps this
  // exhaustive geometry/functional suite practical without measuring shared CPU.
  for(let cursor=0;cursor<configurations.length;cursor+=3)await Promise.all(configurations.slice(cursor,cursor+3).map(async([device,width,height,touch,dpr])=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:engine!=='firefox'&&touch,deviceScaleFactor:dpr,colorScheme:device==='desktop'?'light':'dark',acceptDownloads:true});
    await context.addInitScript(()=>{localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-pico8',metric:'rgb',theme:'dark'}));});
    const page=await context.newPage();let phase='startup';page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push({device,phase,name:e.name,message:e.message,stack:e.stack}));
    for(const [name,ids]of sets.filter(s=>!quick||['wide','extremes','all'].includes(s[0])))await check(`${device}/${name}`,async()=>{
      phase=name;
      await page.goto(base);const selected=ids.map(id=>byId[id]);await page.locator('input[type=file]').first().setInputFiles(selected.map(f=>f.path));await waitWall(page,ids.length);
      assert.deepEqual(await page.locator('.grid .tile .name').allTextContents(),selected.map(f=>f.name),'wall changed source import order');
      const before=await measure(page),rows=assertGeometry(before,`${device}/${name}`);
      await rememberNodes(page);
      // Open both panels; their changing height must neither remount art nor cover captions.
      for(const panel of ['Palette settings','Palette']){
        await page.locator(`button[aria-label="${panel}"]`).click();await pause(150);assertGeometry(await measure(page),`${device}/${name}/${panel}`);await checkNodes(page);
        await page.locator(`button[aria-label="${panel}"]`).click();await pause(100);
      }
      // Resize a live wall and return: verify every existing keyed surface survives.
      await page.setViewportSize({width:Math.max(300,width-47),height:Math.max(280,height-33)});await pause(150);assertGeometry(await measure(page),`${device}/${name}/resize`);await checkNodes(page);
      await page.setViewportSize({width,height});await pause(100);
      if(['wide','balanced','extremes','all','stress'].includes(name))await page.screenshot({path:fileURLToPath(new URL(`${outputPrefix}${device}-${name}.png`,out))});
      // Last tile and its caption must remain reachable in scrolling walls.
      await page.locator('.grid').evaluate(n=>n.scrollTop=n.scrollHeight);await pause(50);
      const end=await measure(page),last=end.tiles.at(-1);assert(last.cap.bottom<=end.toolsTop+1,`${device}/${name}: last caption unreachable above controls`);
      return{count:ids.length,rows,scroll:before.wall.scrollHeight>before.wall.clientHeight+1,measurements:before};
    });
    await check(`${device}/preview-and-export`,async()=>{
      phase='preview-and-export';
      await page.goto(base);const selected=['aurora','vertical','square','animated-wide'].map(id=>byId[id]);await page.locator('input[type=file]').first().setInputFiles(selected.map(f=>f.path));await waitWall(page,4);
      for(let i=0;i<selected.length;i++) {
        const tile=page.locator('.grid .tile').nth(i);await tile.locator('.art').scrollIntoViewIfNeeded();
        // The hover capsule intentionally owns its buttons over shallow artwork;
        // open Preview using uncovered artwork rather than clicking that capsule.
        const artHeight=await tile.locator('.art').evaluate(n=>n.getBoundingClientRect().height);
        await tile.locator('.art').click({position:{x:8,y:artHeight-4}});await page.locator('.image-viewer[open]').waitFor();
        await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Fit image',exact:true}).click();
        await page.getByRole('button',{name:'Show original image',exact:true}).click();await page.getByRole('button',{name:'Show converted image',exact:true}).click();
        const downloadPromise=page.waitForEvent('download');await page.locator('.image-viewer').getByRole('button',{name:'Save image',exact:true}).click();const download=await downloadPromise;
        const bytes=await readFile(await download.path()),f=selected[i];
        assert.equal(f.animated?bytes.readUInt16LE(6):bytes.readUInt32BE(16),f.w,'export width changed');assert.equal(f.animated?bytes.readUInt16LE(8):bytes.readUInt32BE(20),f.h,'export height changed');
        await page.getByRole('button',{name:'Close preview',exact:true}).click();
      }
      const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save all images',exact:true}).click();const zip=unzipSync(await readFile(await(await downloadPromise).path()));assert.equal(Object.keys(zip).length,selected.length,'ZIP misses image');
      for(const f of selected){const entry=Object.entries(zip).find(([name])=>name.startsWith(f.name.replace(/\.[^.]+$/,'')));assert(entry,'ZIP item missing');const b=Buffer.from(entry[1]);assert.equal(f.animated?b.readUInt16LE(6):b.readUInt32BE(16),f.w);assert.equal(f.animated?b.readUInt16LE(8):b.readUInt32BE(20),f.h);}
      if(touch){await page.locator('.grid .tile-share').first().click();await page.getByRole('dialog',{name:'Image actions'}).waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();}
      // Family changes keep geometry/readability and whole-source dimensions.
      await rememberNodes(page);await page.locator('button[aria-label="Palette"]').click();await page.getByRole('button',{name:'1-bit',exact:true}).click();await page.locator('button[aria-label="Palette"]').click();await pause(150);await checkNodes(page);assertGeometry(await measure(page),`${device}/one-bit`);
      const oneBitPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save all images',exact:true}).click();const oneBit=unzipSync(await readFile(await(await oneBitPromise).path()));assert.equal(Object.keys(oneBit).length,selected.length);
      for(const f of selected){const entry=Object.entries(oneBit).find(([name])=>name.startsWith(f.name.replace(/\.[^.]+$/,'')));assert(entry);const b=Buffer.from(entry[1]);assert.equal(f.animated?b.readUInt16LE(6):b.readUInt32BE(16),f.w);assert.equal(f.animated?b.readUInt16LE(8):b.readUInt32BE(20),f.h);}
      return{singleExports:selected.length,zipEntries:Object.keys(zip).length,oneBitZipEntries:Object.keys(oneBit).length};
    });
    if(!touch)await check(`${device}/desktop-actions-on-resize`,async()=>{
      phase='desktop-actions-on-resize';
      await page.setViewportSize({width:1280,height:900});await page.goto(base);await page.locator('input[type=file]').first().setInputFiles(byId.square.path);await waitWall(page,1);await rememberNodes(page);
      const save=page.locator('.grid .acts button').first();await save.focus();assert(await save.evaluate(n=>n===document.activeElement));
      await page.setViewportSize({width:320,height:360});await pause(200);await checkNodes(page);assertGeometry(await measure(page),`${device}/small-desktop`);
      assert(await save.evaluate(n=>n===document.activeElement),'desktop Save lost focus after shrinking');
      await page.setViewportSize({width:1280,height:900});await pause(150);await checkNodes(page);
      const focused=await page.evaluate(()=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),visible:document.activeElement.getBoundingClientRect().width>0}));assert(focused.visible&&focused.tag!=='BODY','expanded actions lost visible keyboard focus');
      // Even narrow portraits retain the desktop capsule rather than a mobile sheet.
      await page.setViewportSize({width:320,height:360});await page.goto(base);await page.locator('input[type=file]').first().setInputFiles([byId.vertical.path,byId.tower.path]);await waitWall(page,2);
      assertGeometry(await measure(page),`${device}/narrow-portraits`);
      const art=page.locator('.grid .tile .art').first();await art.scrollIntoViewIfNeeded();await art.hover();
      await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.grid .tile .acts')).opacity)===1);
      assert(await page.locator('.grid .tile .acts').first().evaluate(n=>Number(getComputedStyle(n).opacity)===1),'desktop hover capsule did not appear');
      await page.locator('.grid .acts button[aria-label^="Remove "]').first().click();await waitWall(page,1);
      return{singleLineDesktop:true,focusRetained:true,hoverRemoval:true};
    });
    await context.close();
  }));
}finally{
  report.pass=report.checks.length>0&&report.checks.every(c=>c.pass)&&report.errors.length===0;
  await writeFile(new URL(`${outputPrefix}${quick?'quick':'full'}.json`,out),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).map(c=>({label:c.label,error:c.error})),errors:report.errors},null,2));
  await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));process.exitCode=report.pass?0:1;
}
