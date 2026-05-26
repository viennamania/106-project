const PAGE_CACHE = "fanletter-pwa-pages-v6";
const ASSET_CACHE = "fanletter-pwa-assets-v6";
const LOCALES = ["ko", "en", "ja", "zh", "vi", "id"];
const ROOT_PUBLIC_NAVIGATION_URLS = LOCALES.map((locale) => `/${locale}`);
const FANLETTER_CORE_PUBLIC_NAVIGATION_URLS = LOCALES.flatMap((locale) => [
  `/${locale}/fanletter`,
  `/${locale}/fanletter/feed`,
  `/${locale}/fanletter/onboarding`,
  `/${locale}/fanletter/start`,
]);
const FANLETTER_NEWS_PUBLIC_NAVIGATION_URLS = LOCALES.flatMap((locale) => [
  `/${locale}/fanletter/news`,
  `/${locale}/fanletter/news/characters`,
  `/${locale}/fanletter/news/platform`,
]);
const FANLETTER_PUBLIC_NAVIGATION_URLS = [
  ...FANLETTER_CORE_PUBLIC_NAVIGATION_URLS,
  ...FANLETTER_NEWS_PUBLIC_NAVIGATION_URLS,
];
const FANLETTER_MANIFEST_URLS = LOCALES.map(
  (locale) => `/${locale}/fanletter/manifest.webmanifest`,
);
const FANLETTER_NEWS_PRIVATE_SEGMENTS = new Set([
  "activate",
  "connect",
  "purchases",
  "reports",
  "wallet",
]);
const FANLETTER_NEWS_TOP_LEVEL_SERVICE_SEGMENTS = new Set([
  ...FANLETTER_NEWS_PRIVATE_SEGMENTS,
  "characters",
  "platform",
  "reporters",
  "vlogs",
]);
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/fanletter-apple-icon.png",
  "/fanletter-icon-192.png",
  "/fanletter-icon-512.png",
  ...FANLETTER_MANIFEST_URLS,
];
const PUBLIC_NAVIGATION_CACHE_PATHS = new Set([
  ...ROOT_PUBLIC_NAVIGATION_URLS,
  ...FANLETTER_PUBLIC_NAVIGATION_URLS,
]);
const FANLETTER_PUBLIC_NAVIGATION_CACHE_PATHS = new Set(
  FANLETTER_PUBLIC_NAVIGATION_URLS,
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await precacheUrls(cache, PRECACHE_URLS);
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

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  event.waitUntil(
    (async () => {
      let payload = {
        badge: "/icon-192.png",
        body: "",
        href: "/ko/activate",
        icon: "/icon-192.png",
        notificationId: "",
        tag: "",
        title: "Pocket Smart Wallet",
        type: "direct_member_completed",
      };

      try {
        payload = {
          ...payload,
          ...event.data.json(),
        };
      } catch {
        payload.body = event.data.text();
      }

      await self.registration.showNotification(payload.title, {
        badge: payload.badge,
        body: payload.body,
        data: {
          href: payload.href,
          notificationId: payload.notificationId,
          type: payload.type,
        },
        icon: payload.icon,
        tag: payload.tag || payload.notificationId || payload.href,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const href =
        event.notification.data?.href && typeof event.notification.data.href === "string"
          ? event.notification.data.href
          : "/ko/activate";
      const targetUrl = new URL(href, self.location.origin).href;
      const windowClients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }

          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
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
  const url = new URL(request.url);
  const cacheKey = getPublicNavigationCacheKey(url);

  try {
    const response = await fetch(request);
    const hasPersonalizedSignal = hasPersonalizedNavigationSignal(request, url);

    if (
      cacheKey &&
      shouldCacheResponse(response, {
        allowPrivate:
          isFanletterPublicCachePath(cacheKey) && !hasPersonalizedSignal,
      })
    ) {
      await cache.put(cacheKey, response.clone());
    } else if (
      cacheKey &&
      hasPersonalizedSignal &&
      isFanletterPublicCachePath(cacheKey)
    ) {
      void refreshPublicNavigationShell(cache, cacheKey);
    }

    return response;
  } catch {
    const cachedResponse =
      (cacheKey ? await cache.match(cacheKey) : null) ||
      (await getNavigationFallback(cache, url)) ||
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
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    void refreshAsset(cache, request);
    return cachedResponse;
  }

  const response = await fetch(request);

  if (shouldCacheResponse(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

async function refreshAsset(cache, request) {
  try {
    const response = await fetch(request);

    if (shouldCacheResponse(response)) {
      await cache.put(request, response.clone());
    }
  } catch {}
}

async function refreshPublicNavigationShell(cache, cacheKey) {
  try {
    const response = await fetch(cacheKey, {
      cache: "reload",
      credentials: "omit",
    });

    if (
      shouldCacheResponse(response, {
        allowPrivate: true,
      })
    ) {
      await cache.put(cacheKey, response);
    }
  } catch {}
}

async function precacheUrls(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          cache: "reload",
          credentials: "omit",
        });
        const pathname = normalizePathname(
          new URL(url, self.location.origin).pathname,
        );

        if (
          shouldCacheResponse(response, {
            allowPrivate: FANLETTER_PUBLIC_NAVIGATION_CACHE_PATHS.has(pathname),
          })
        ) {
          await cache.put(url, response);
        }
      } catch {}
    }),
  );
}

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getPublicNavigationCacheKey(url) {
  const pathname = normalizePathname(url.pathname);

  if (PUBLIC_NAVIGATION_CACHE_PATHS.has(pathname)) {
    return pathname;
  }

  if (isFanletterNewsPrivatePath(pathname)) {
    return null;
  }

  return isFanletterPublicDetailPath(pathname) ? pathname : null;
}

function isFanletterPublicCachePath(pathname) {
  return (
    FANLETTER_PUBLIC_NAVIGATION_CACHE_PATHS.has(pathname) ||
    isFanletterPublicDetailPath(pathname)
  );
}

function hasPersonalizedNavigationSignal(request, url) {
  return request.headers.has("cookie") || url.search.length > 0;
}

function isFanletterPublicDetailPath(pathname) {
  const [locale, section, resource, ...restSegments] = pathname
    .split("/")
    .filter(Boolean);

  if (!LOCALES.includes(locale) || section !== "fanletter") {
    return false;
  }

  if (resource === "content" || resource === "creator") {
    return restSegments.length === 1 && Boolean(restSegments[0]);
  }

  if (resource !== "news") {
    return false;
  }

  const [firstSegment, secondSegment, thirdSegment] = restSegments;

  if (!firstSegment || FANLETTER_NEWS_PRIVATE_SEGMENTS.has(firstSegment)) {
    return false;
  }

  if (
    restSegments.length === 1 &&
    !FANLETTER_NEWS_TOP_LEVEL_SERVICE_SEGMENTS.has(firstSegment)
  ) {
    return true;
  }

  if (firstSegment === "characters") {
    return (
      (restSegments.length === 2 && Boolean(secondSegment)) ||
      (restSegments.length === 3 &&
        Boolean(secondSegment) &&
        thirdSegment === "vlogs")
    );
  }

  if (firstSegment === "reporters" || firstSegment === "vlogs") {
    return restSegments.length === 2 && Boolean(secondSegment);
  }

  return false;
}

function isFanletterNewsPrivatePath(pathname) {
  const [locale, section, resource, firstSegment, , thirdSegment] = pathname
    .split("/")
    .filter(Boolean);

  if (!LOCALES.includes(locale) || section !== "fanletter" || resource !== "news") {
    return false;
  }

  return (
    FANLETTER_NEWS_PRIVATE_SEGMENTS.has(firstSegment) ||
    (firstSegment === "characters" && thirdSegment === "request")
  );
}

async function getNavigationFallback(cache, url) {
  const pathname = normalizePathname(url.pathname);
  const [, locale, section, resource] = pathname.split("/");

  if (LOCALES.includes(locale) && section === "fanletter" && resource === "news") {
    return (
      (await cache.match(`/${locale}/fanletter/news`)) ||
      (await cache.match(`/${locale}/fanletter`))
    );
  }

  if (LOCALES.includes(locale) && section === "fanletter") {
    return cache.match(`/${locale}/fanletter`);
  }

  if (LOCALES.includes(locale)) {
    return cache.match(`/${locale}`);
  }

  if (pathname === "/") {
    return cache.match("/ko");
  }

  return null;
}

function shouldCacheResponse(response, options = {}) {
  if (!response.ok) {
    return false;
  }

  if (options.allowPrivate) {
    return true;
  }

  const cacheControl = response.headers.get("Cache-Control") || "";

  return !/(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl);
}
