// Дуу Орчуулагч — service worker
const CACHE = "orchuulagch-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "shared-in").map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // Share цэсээр ирсэн дуут файлыг хадгалаад аппыг нээнэ
  if (e.request.method === "POST" && u.pathname.endsWith("/share")) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const f = fd.getAll("audio").find(x => x && x.size);
        const txt = [fd.get("title"), fd.get("text")].filter(Boolean).join("\n").trim();
        if (!f && txt) {
          const c = await caches.open("shared-in");
          await c.put(new URL("shared-text", self.registration.scope).href, new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } }));
        }
        if (f) {
          const c = await caches.open("shared-in");
          await c.put(new URL("shared-audio", self.registration.scope).href, new Response(f, {
            headers: { "Content-Type": f.type || "application/octet-stream", "X-Name": encodeURIComponent(f.name || "voice") }
          }));
        }
      } catch (err) {}
      return Response.redirect(new URL("./?shared=1", self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // Эхлээд сүлжээнээс (шинэ хувилбар шууд ирнэ), сүлжээгүй бол хадгалснаас
  e.respondWith(
    fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
