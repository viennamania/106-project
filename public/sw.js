const PAGE_CACHE = "pocket-smart-wallet-pages-v1";
const ASSET_CACHE = "pocket-smart-wallet-assets-v1";
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/ko",
  "/en",
  "/ja",
  "/zh",
  "/vi",
  "/id",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== PAGE_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (
    request.destination === "document" ||
    request.destination === "font" ||
    request.destination === "image" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(handleAsset(request));
  }
});

async function handleNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse =
      (await cache.match(request, { ignoreSearch: true })) ||
      (request.url.endsWith("/") || new URL(request.url).pathname === "/"
        ? await cache.match("/ko")
        : null) ||
      (await cache.match("/offline"));

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });

  if (cachedResponse) {
    void refreshAsset(cache, request);
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function refreshAsset(cache, request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }
  } catch {}
}
