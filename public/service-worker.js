const serviceWorkerUrl = new URL(self.location.href);
const assetVersion = serviceWorkerUrl.searchParams.get("asset") || "shell";
const staticCacheName = `signal-nine-static-${assetVersion}`;
const pageCacheName = `signal-nine-pages-${assetVersion}`;
const cachePrefix = "signal-nine-";
const precacheUrls = ["/", "/manifest.webmanifest", "/globe.svg", "/offline.html"];
const staticExtensions = [
  ".js",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
  ".woff2",
  ".json",
  ".txt",
  ".webmanifest",
];
const defaultNotificationIcon = "/icon";
const defaultNotificationHref = "/account/notifications";

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isStaticAssetRequest(request) {
  const url = new URL(request.url);

  if (request.method !== "GET" || !isSameOrigin(request)) {
    return false;
  }

  return url.pathname.startsWith("/_next/") || staticExtensions.some((extension) => url.pathname.endsWith(extension));
}

function normalizePushPayload(event) {
  const fallback = {
    title: "NowScore update",
    body: "",
    href: defaultNotificationHref,
    tag: "nowscore-web-push",
    icon: defaultNotificationIcon,
    badge: defaultNotificationIcon,
  };

  if (!event.data) {
    return fallback;
  }

  try {
    const payload = event.data.json();
    const data = payload && typeof payload === "object" ? payload : {};
    const notification =
      data.notification && typeof data.notification === "object"
        ? data.notification
        : {};

    return {
      title: data.title || notification.title || fallback.title,
      body: data.body || data.message || notification.body || fallback.body,
      href:
        data.href ||
        data.url ||
        data.actionHref ||
        notification.href ||
        notification.url ||
        fallback.href,
      tag: data.tag || notification.tag || fallback.tag,
      icon: data.icon || notification.icon || fallback.icon,
      badge: data.badge || notification.badge || fallback.badge,
    };
  } catch {
    return {
      ...fallback,
      body: event.data.text(),
    };
  }
}

async function focusOrOpenClient(targetHref) {
  const normalizedTarget = new URL(targetHref, self.location.origin);
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clients) {
    if (!("focus" in client)) {
      continue;
    }

    const clientUrl = new URL(client.url, self.location.origin);
    if (clientUrl.pathname === normalizedTarget.pathname) {
      if ("navigate" in client && client.url !== normalizedTarget.toString()) {
        await client.navigate(normalizedTarget.toString()).catch(() => undefined);
      }

      return client.focus();
    }
  }

  if (clients[0] && "focus" in clients[0]) {
    if ("navigate" in clients[0]) {
      await clients[0].navigate(normalizedTarget.toString()).catch(() => undefined);
    }

    return clients[0].focus();
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(normalizedTarget.toString());
  }

  return undefined;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(staticCacheName)
      .then((cache) =>
        Promise.all(
          precacheUrls.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(cachePrefix) && key !== staticCacheName && key !== pageCacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || !isSameOrigin(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(pageCacheName);

        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone()).catch(() => undefined);
          }
          return response;
        } catch (error) {
          const cachedPage = await cache.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          const fallbackPage = await cache.match("/");
          if (fallbackPage) {
            return fallbackPage;
          }

          const offlinePage = await cache.match("/offline.html");
          if (offlinePage) {
            return offlinePage;
          }

          throw error;
        }
      })(),
    );
    return;
  }

  if (!isStaticAssetRequest(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(staticCacheName);
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone()).catch(() => undefined);
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch.catch(() => null);
        return cached;
      }

      const response = await networkFetch;
      return response || Response.error();
    })(),
  );
});

self.addEventListener("push", (event) => {
  const payload = normalizePushPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: {
        href: payload.href,
      },
      icon: payload.icon,
      badge: payload.badge,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification?.data?.href || defaultNotificationHref;

  event.waitUntil(focusOrOpenClient(href));
});
