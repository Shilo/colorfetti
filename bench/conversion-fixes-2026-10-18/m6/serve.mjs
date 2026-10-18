import{createServer}from'node:http';import{readFileSync,writeFileSync,readdirSync}from'node:fs';import{join,relative,resolve}from'node:path';
const phase=process.argv[2]??'before',port=Number(process.argv[3]??5224),root=resolve(`.tmp/conversion-fixes-m6-${phase}`),frozen=new Map(),captures=[];
function add(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())add(path);else frozen.set('/'+relative(root,path).replaceAll('\\','/'),readFileSync(path));}}add(root);
createServer((req,res)=>{
  if(req.method==='POST'){
    const parts=[];let length=0;req.on('data',chunk=>{parts.push(chunk);length+=chunk.length;if(length>1000000)req.destroy();});
    req.on('end',()=>{const bytes=Buffer.concat(parts),prefix='bench/conversion-fixes-2026-10-18/m6/';
      if(req.url==='/receipt'||req.url==='/drag')writeFileSync(prefix+`${phase}-${req.url.slice(1)}.json`,bytes);
      else if(req.url.startsWith('/capture?')){const name=new URL(req.url,'http://127.0.0.1').searchParams.get('name'),artifact=`${phase}-capture-${captures.length+1}.bin`;
        writeFileSync(prefix+artifact,bytes);captures.push({name,artifact,bytes:bytes.length});writeFileSync(prefix+`${phase}-captures.json`,JSON.stringify(captures,null,2)+'\n');}
      else{res.writeHead(404);res.end();return;}res.end('saved');});return;
  }
  const path=decodeURIComponent(req.url.split('?')[0]),data=frozen.get(path==='/'?'/index.html':path);if(!data){res.writeHead(404);res.end();return;}
  const type=path.endsWith('.html')?'text/html':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});res.end(data);
}).listen(port,'127.0.0.1',()=>console.log(`Frozen ${phase}: http://127.0.0.1:${port}/bench/conversion-fixes-2026-10-18/m6/browser.html`));
