/* ナブラ演算子ゲーム service worker: works offline, always tries the newest page first */
const CACHE='nabla-2026-10-31a';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./maskable-512.png','./apple-touch-icon.png','./favicon-64.png','./js/peerjs.min.js?v=1.5.4'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('nabla-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const font=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(url.origin!==location.origin&&!font)return;
  // the page itself: network first (no HTTP cache), offline -> cached copy
  if(req.mode==='navigate'){
    e.respondWith(fetch(req.url,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(ca=>ca.put('./index.html',c));}return r;})
      .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  // everything else: cached copy right away, refreshed in the background
  e.respondWith(caches.open(CACHE).then(async ca=>{
    const hit=await ca.match(req,{ignoreSearch:!font});
    const net=fetch(req).then(r=>{if(r.ok||r.type==='opaque')ca.put(req,r.clone());return r;}).catch(()=>hit);
    return hit||net;
  }));
});
