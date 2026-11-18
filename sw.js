// Service worker : met l'app en cache pour qu'elle fonctionne hors ligne.
// Changez le numéro de version quand vous modifiez des fichiers, pour forcer la mise à jour.
const CACHE = "grand-ecart-v1";
const SHELL = ["./", "index.html", "style.css", "app.js", "exercises.js", "manifest.json",
  "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        // Les images sont mises en cache à la première vue
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("index.html"))
    )
  );
});
