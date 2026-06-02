const CACHE_NAME = "kinderpunkte-v2";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase.js",
  "./js/config.js",
  "./js/state.js",
  "./js/kids.js",
  "./js/rewards.js",
  "./js/purchases.js",
  "./js/streaks.js",
  "./js/admin.js",
  "./js/utils.js",
  "./partials/login.html",
  "./partials/admin.html",
  "./partials/child-admin.html",
  "./manifest.json"
];

/* ========================================
   INSTALL — Cache statische Assets
======================================== */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* ========================================
   ACTIVATE — Alte Caches löschen
======================================== */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ========================================
   FETCH — Cache First für Assets,
           Network First für Firebase
======================================== */

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Firebase & Google APIs immer live
  if (
    url.hostname.includes("firebasedatabase") ||
    url.hostname.includes("firebaseio") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Statische Assets: Cache First, Fallback Network
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Neue Assets in Cache aufnehmen
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
