/* Hoorspel service worker — offline media + Web Share Target.
 * Cache names must match src/lib/share-target.ts. */
const MEDIA_CACHE = "hoorspel-media-v1";
const SHARE_CACHE = "hoorspel-share-v1";
const MEDIA_PREFIX = "/__media/";
const SHARE_FILE = "/__share/file";
const SHARE_META = "/__share/meta";
const IDB_NAME = "hoorspel-media";
const IDB_STORE = "clips";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.method === "POST" && url.pathname === "/import") {
    event.respondWith(handleShare(event.request));
    return;
  }

  if (event.request.method === "GET" && url.pathname.startsWith(MEDIA_PREFIX)) {
    event.respondWith(serveMedia(event.request, url.pathname));
  }
});

async function handleShare(request) {
  try {
    const formData = await request.formData();
    const cache = await caches.open(SHARE_CACHE);
    let file = formData.get("media");
    if (!(file instanceof File) || !file.size) {
      for (const value of formData.values()) {
        if (value instanceof File && value.size) {
          file = value;
          break;
        }
      }
    }
    if (file instanceof File && file.size) {
      await cache.put(
        SHARE_FILE,
        new Response(file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-Filename": encodeURIComponent(file.name || "shared-audio"),
          },
        }),
      );
    }
    const meta = {
      title: asText(formData.get("title")),
      text: asText(formData.get("text")),
      url: asText(formData.get("url")),
    };
    await cache.put(
      SHARE_META,
      new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }),
    );
  } catch {
    /* still land on the import page */
  }
  return Response.redirect(new URL("/import?shared=1", self.location.origin), 303);
}

async function serveMedia(request, pathname) {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const byPath = await cache.match(pathname);
  if (byPath) return byPath;

  const id = decodeURIComponent(pathname.slice(MEDIA_PREFIX.length));
  const blob = await idbGet(id);
  if (blob) {
    const response = new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    await cache.put(pathname, response.clone());
    return response;
  }
  return new Response("Not found", { status: 404 });
}

function asText(value) {
  return typeof value === "string" ? value : "";
}

function idbGet(id) {
  return new Promise((resolve) => {
    if (!id) {
      resolve(undefined);
      return;
    }
    let req;
    try {
      req = indexedDB.open(IDB_NAME, 1);
    } catch {
      resolve(undefined);
      return;
    }
    req.onerror = () => resolve(undefined);
    req.onsuccess = () => {
      try {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          resolve(undefined);
          return;
        }
        const tx = db.transaction(IDB_STORE, "readonly");
        const get = tx.objectStore(IDB_STORE).get(id);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    };
  });
}
