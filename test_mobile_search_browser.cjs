const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.MOBILE_ROOT||'mobile-web';
(async()=>{
 const browser=await chromium.launch({headless:true,args:process.platform==='linux'?['--no-sandbox']:[],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('ka-vdj-test',JSON.stringify({token:'fixture',name:'ANA',eventCode:'test',cursor:0}));
   Element.prototype.requestFullscreen=async()=>{window.fullscreenRequested=true};
  });
  await page.route('http://mobile.test/**',r=>{
   const file=new URL(r.request().url()).pathname.split('/').filter(Boolean).join('/')||'index.html';
   const full=path.join(root,file);
   return r.fulfill({contentType:file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':'text/html',body:fs.readFileSync(full)});
  });
  await page.route('https://pngwswsmylmrayhieavi.supabase.co/**',async r=>{
   const {name,args}=r.request().postDataJSON();calls.push({name,q:args?.p_query});let data={};
   if(name==='vdj_my_status')data={status:'active',requests:[],notifications:[]};
   if(name==='vdj_playlist_list')data=[];
   if(name==='vdj_search'){
    if(args.p_query==='antigua')await new Promise(resolve=>setTimeout(resolve,700));
    data=['nueva','antigua','muchas'].includes(args.p_query)?Array.from({length:args.p_query==='muchas'?35:1},(_,i)=>({item_ref:args.p_query+i,title:args.p_query+' '+i,format:'mp4'})):[];
   }
   if(name==='vdj_search_saved')data=args.p_query==='json'?[{youtube_id:'abcdefghijk',title:'VERSIÓN JSON'}]:[];
   if(name==='vdj_youtube_search')data=[{youtube_id:'abcdefghijl',title:'VERSIÓN YOUTUBE',thumbnail_url:'data:image/png;base64,iVBORw0KGgo='}];
   return r.fulfill({json:data});
  });
  await page.goto('http://mobile.test/?code=test');
  await page.waitForFunction(()=>document.querySelector('#controls').hidden===false);
  assert.equal(await page.locator('#searchYoutube').count(),0);
  await page.locator('#song').fill('json');
  await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('JSON'));
  assert.equal(calls.filter(c=>c.name==='vdj_youtube_search').length,0);
  await page.locator('#song').fill('sin coincidencias');
  await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('YOUTUBE'));
  assert.equal(calls.filter(c=>c.name==='vdj_youtube_search').length,1);
  await page.locator('#song').fill('antigua');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('REPERTORIO LOCAL'));
  await page.locator('#song').fill('nueva');
  await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('NUEVA'));
  await page.waitForTimeout(800);
  assert(!await page.locator('#results').textContent().then(t=>t.includes('ANTIGUA')));
  assert.equal(calls.filter(c=>c.q==='antigua'&&c.name==='vdj_search_saved').length,0,'obsolete query stops before JSON');
  await page.locator('#song').fill('muchas');
  await page.waitForFunction(()=>document.querySelectorAll('#results button').length===35);
  const bounds=await page.locator('#results').evaluate(e=>({scroll:e.scrollHeight,height:e.clientHeight,overflow:getComputedStyle(e).overflowY}));
  assert(bounds.scroll>bounds.height);assert.equal(bounds.overflow,'auto');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#fullscreen').click();assert(await page.evaluate(()=>window.fullscreenRequested));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons)assert(fs.readFileSync(path.join(root,icon.src)).length>1000);
  assert.equal(calls.filter(c=>c.name==='vdj_playlist_send').length,0,'search and app lifecycle never send private songs');
  await page.goto('http://mobile.test/');
  await page.waitForFunction(()=>document.querySelector('#controls').hidden===false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ka-vdj-last-event')).code),'test','installed start recovers event');
  assert.deepEqual(errors,[]);
  console.log('MOBILE_SEARCH_PWA_OK: LOCAL/JSON/YOUTUBE; obsolete searches; internal scrolling; fullscreen gesture; manifest/icons; installed session restore');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
