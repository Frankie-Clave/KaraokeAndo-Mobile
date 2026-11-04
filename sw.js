// Cache only public application assets. Never cache RPCs or participant data.
const CACHE='karaokeando-mobile-v1';
const ASSETS=['./','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('karaokeando-mobile-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url),base=new URL(self.registration.scope);
 if(event.request.method!=='GET'||u.origin!==base.origin)return;
 if(event.request.mode==='navigate'&&u.pathname===base.pathname){
  event.respondWith(fetch(event.request).catch(()=>caches.match(base.href)));return;
 }
 if(ASSETS.slice(1).some(p=>new URL(p,base).pathname===u.pathname))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
