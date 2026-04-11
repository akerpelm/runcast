// Should I Run Service Worker — Offline-first caching
const CACHE_VERSION = "sir-v2";
const APP_SHELL = [
  "/",
  "/about/",
  "/legal/",
  "/blog/",
  "/favicon.svg",
  "/favicon.ico",
  "/icon-192.svg",
  "/icon-512.svg",
  "/manifest.json",
  "/offline.html",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy per request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // API calls (Open-Meteo): network-first with 30-min stale cache
  if (
    url.hostname.includes("open-meteo.com") ||
    url.hostname.includes("air-quality-api")
  ) {
    event.respondWith(networkFirstWithTimeout(event.request, 5000, 30 * 60));
    return;
  }

  // Blog pages: stale-while-revalidate
  if (url.pathname.startsWith("/blog/") && url.pathname !== "/blog/") {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Static assets (fonts, CSS, JS, images): cache-first
  if (
    url.pathname.match(/\.(css|js|woff2?|ttf|svg|png|ico|webp)$/) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell pages: cache-first with network fallback
  if (APP_SHELL.includes(url.pathname) || url.pathname === "/") {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(event.request));
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

async function networkFirstWithTimeout(request, timeoutMs, maxAgeSec) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      // Store with timestamp header for staleness check
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const cachedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, cachedResponse);
    }
    return response;
  } catch {
    // Serve from cache if within maxAge
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get("sw-cached-at") || "0");
      if (Date.now() - cachedAt < maxAgeSec * 1000) {
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

function offlineFallback() {
  return caches.match("/offline.html") || new Response("Offline", { status: 503 });
}
