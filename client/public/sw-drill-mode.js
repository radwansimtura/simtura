// Drill Mode asset cache. First session loads from origin; subsequent
// sessions play from device cache. Scope is the origin root, but the
// fetch handler bails out for any URL outside /drill-assets/scenario-1a/
// so this never interferes with other requests.
const CACHE_NAME = "simtura-drill-mode-v2";
const MANIFEST_URL = "/drill-assets/scenario-1a/manifest.json";
const ASSET_PREFIX = "/drill-assets/scenario-1a/";

async function precacheFromManifest() {
  const cache = await caches.open(CACHE_NAME);
  let manifest;
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return;
    manifest = await res.json();
    await cache.put(MANIFEST_URL, res.clone());
  } catch (err) {
    return;
  }

  const urls = [];
  if (manifest.video) {
    if (manifest.video.backgroundLoop) urls.push(manifest.video.backgroundLoop);
    if (manifest.video.patientCloseup) urls.push(manifest.video.patientCloseup);
    if (Array.isArray(manifest.video.clipboardWrites)) {
      for (const cw of manifest.video.clipboardWrites) {
        if (cw && cw.url) urls.push(cw.url);
      }
    }
  }
  if (manifest.audio) {
    for (const url of Object.values(manifest.audio)) {
      if (typeof url === "string") urls.push(url);
    }
  }

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) await cache.put(url, res);
      } catch (err) {
        // ignore individual asset failures — first-session falls back to network
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheFromManifest().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("simtura-drill-mode-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(ASSET_PREFIX)) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok && response.type === "basic") {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      } catch (err) {
        const fallback = await cache.match(event.request, { ignoreSearch: true });
        if (fallback) return fallback;
        throw err;
      }
    })(),
  );
});
