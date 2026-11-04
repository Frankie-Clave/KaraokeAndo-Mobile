// Browser regressions for automatic sources, stale RPCs and installed-app recovery.
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.env.MOBILE_ROOT||'mobile-web');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const target=path.join(root,pathname==='/'?'index.html':pathname.slice(1));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const data=fs.readFileSync(target);res.setHeader('Content-Type',target.endsWith('.js')?'application/javascript':target.endsWith('.webmanifest')?'application/manifest+json':target.endsWith('.png')?'image/png':'text/html');res.end(data)}catch(e){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{})});
 try{
  const context=await browser.newContext(),page=await context.newPage(),calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('ka-vdj-test',JSON.stringify({token:'fixture',name:'ANA',eventCode:'test'})));
  let release,oldSeen,offline=false;
  const oldStarted=new Promise(r=>oldSeen=r);
  await page.route('https://pngwswsmylmrayhieavi.supabase.co/**',async route=>{
   if(offline)return route.abort('internetdisconnected');
   const {name,args}=route.request().postDataJSON(),q=args?.p_query;calls.push({name,q});
   if(name==='vdj_search'&&q==='Antigua'){oldSeen();await new Promise(r=>release=r);return route.fulfill({status:503,json:{error:'ERROR ANTIGUO'}})}
   let d={};
   if(name==='vdj_access_options')d={key_required:false};
   if(name==='vdj_resume')d={status:'active'};
   if(name==='vdj_my_status')d={status:'active',requests:[],notifications:[]};
   if(name==='vdj_playlist_list')d=[];
   if(name==='vdj_search')d=q==='Mixta'?[{item_ref:'local',title:'Mixta local',format:'mp4'}]:[];
   if(name==='vdj_search_saved')d=q==='Mixta'?[{youtube_id:'saved',title:'Mixta JSON',thumbnail_url:'data:image/png;base64,iVBORw0KGgo='}]:[];
   if(name==='vdj_youtube_search')d=[{youtube_id:'live',title:'Video encontrado',thumbnail_url:'data:image/png;base64,iVBORw0KGgo='}];
   await route.fulfill({json:d});
  });
  const url='http://127.0.0.1:'+server.address().port+'/';
  await page.goto(url+'?code=test');
  await page.waitForFunction(()=>!document.querySelector('#controls').hidden);
  assert.equal(await page.locator('#searchYoutube').count(),0);
  await page.locator('#song').fill('Mixta');
  await page.waitForFunction(()=>document.querySelectorAll('#results button').length===2);
  assert.match(await page.locator('#results').textContent(),/LOCAL/);assert.match(await page.locator('#results').textContent(),/JSON/);
  assert.equal(calls.filter(x=>x.name==='vdj_youtube_search').length,0);
  assert.deepEqual(calls.filter(x=>x.q==='Mixta').map(x=>x.name),['vdj_search','vdj_search_saved']);
  await page.locator('#song').fill('Video');
  await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('YOUTUBE'));
  assert.deepEqual(calls.filter(x=>x.q==='Video').map(x=>x.name),['vdj_search','vdj_search_saved','vdj_youtube_search']);
  await page.locator('#song').fill('Antigua');await oldStarted;
  await page.locator('#song').fill('Mixta');release();
  await page.waitForFunction(()=>document.querySelectorAll('#results button').length===2);
  assert(!((await page.locator('#status').textContent()).includes('ERROR ANTIGUO')));
  await page.evaluate(()=>navigator.serviceWorker.ready);
  const manifest=await page.evaluate(async()=>JSON.parse(await (await fetch(document.querySelector('link[rel=manifest]').href)).text()));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons){const response=await context.request.get(new URL(icon.src,url).href);assert.equal(response.status(),200);const bytes=await response.body();assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]))}
  await page.goto(url);await page.waitForFunction(()=>!document.querySelector('#controls').hidden);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ka-vdj-test')).token),'fixture');
  offline=true;await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>!document.querySelector('#controls').hidden);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('REGISTRO SE CONSERVA'));
  assert.deepEqual(errors,[]);
  console.log('MOBILE_DELIVERY_OK: LOCAL+JSON; YouTube fallback order; stale error ignored; no YouTube button; manifest/icons; standalone entry; offline shell preserves registration');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
