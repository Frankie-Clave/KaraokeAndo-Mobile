// Cache the public shell only. Tokens, session RPCs and API responses never enter caches.
const CACHE='karaokeando-shell-20261104-v1';
const SHELL=['./','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('karaokeando-shell-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const base=new URL('./',self.location.href);
 const isShell=url.pathname===base.pathname||url.pathname===base.pathname+'index.html';
 if(event.request.mode==='navigate'&&isShell){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(base.href,copy)))}return response}).catch(()=>caches.match(base.href).then(response=>response||Response.error())));
 }else if(SHELL.slice(1).some(path=>new URL(path,base).href===url.href)){
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
 }
});
