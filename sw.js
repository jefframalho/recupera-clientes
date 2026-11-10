// Service worker: abre o app mesmo com internet fraca. Os dados dos clientes vêm do Firebase.
const CACHE = "recupera-v1";
const BASE = ["./", "./index.html", "./app.js", "./auth.js", "./firebase-config.js", "./manifest.webmanifest", "./assets/logo.png", "./assets/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Aviso de retorno com o app fechado (enviado pela função avisoRetornos, no Firebase)
self.addEventListener("push", (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = {}; }
  const d = p.data || p.notification || p;
  e.waitUntil(self.registration.showNotification(d.title || "Recupera Clientes", {
    body: d.body || "Você tem clientes para contatar hoje.",
    icon: "assets/icon-192.png",
    badge: "assets/icon-192.png",
    tag: "retornos",
    data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
    for (const c of lista) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase e CDNs vão direto para a rede
  // Rede primeiro (sempre a versão nova); se estiver offline, usa a guardada.
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
  );
});
