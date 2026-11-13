// 我的聖經 離線版 Service Worker
const VER="mybible-2026-11-13a";
const SHELL=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!=="mybible-fonts").map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function timeout(ms){return new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms));}
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET")return;
  const url=new URL(req.url);
  // 字型：先用快取
  if(url.host==="fonts.googleapis.com"||url.host==="fonts.gstatic.com"){
    e.respondWith(caches.open("mybible-fonts").then(async c=>{const hit=await c.match(req);if(hit)return hit;try{const r=await fetch(req);if(r.ok||r.type==="opaque")c.put(req,r.clone());return r;}catch(err){return hit||Response.error();}}));
    return;
  }
  if(url.origin!==self.location.origin)return;           // GitHub 同步等：直接連網
  if(url.pathname.includes("/data/"))return;              // 經文資料由 App 自己存在裝置裡
  // 程式本身：有網路就拿最新的（3 秒內），沒網路用存好的
  e.respondWith((async()=>{
    const c=await caches.open(VER);
    try{const r=await Promise.race([fetch(req,{cache:"no-store"}),timeout(3000)]);if(r&&r.ok){c.put(req,r.clone());return r;}throw 0;}
    catch(err){return (await c.match(req,{ignoreSearch:true}))||(req.mode==="navigate"?await c.match("./index.html"):Response.error());}
  })());
});
