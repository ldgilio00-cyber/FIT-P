/* Cache atomica dei soli file dell'app; evita cache di richieste non pertinenti. */
const CACHE = "fitplanner-static-v43-20261027";
const BASE = new URL("./", self.location).pathname;
const ASSETS = ["", "index.html", "styles.css", "app.js", "manifest.webmanifest", "brand-mark.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const URLS = ASSETS.map(a => new URL(a || "./", self.registration.scope).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(k => k.startsWith("fitplanner_") || k.startsWith("fitplanner-") || k.startsWith("fitplanner_gp_"))
    .filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  const destination = req.mode === "navigate" ? new URL("index.html", self.registration.scope).href : url.href;
  if(!URLS.includes(destination)) return; // niente cache cross-site o API
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(destination);
    if(cached) return cached;
    try{
      const response = await fetch(destination, {cache:"no-store"});
      if(response.ok && response.type === "basic") await cache.put(destination, response.clone());
      return response;
    }catch(e){
      if(req.mode === "navigate") return (await cache.match(new URL("index.html",self.registration.scope).href)) || Response.error();
      return Response.error();
    }
  }));
});
