/** Cache names + share-target shape. Keep in sync with `public/sw.js`. */

export const MEDIA_CACHE = "hoorspel-media-v1";
export const SHARE_CACHE = "hoorspel-share-v1";
export const MEDIA_PREFIX = "/__media/";
export const SHARE_FILE = "/__share/file";
export const SHARE_META = "/__share/meta";

export const SHARE_TARGET = {
  action: "/import",
  method: "POST",
  enctype: "multipart/form-data",
  params: {
    title: "title",
    text: "text",
    url: "url",
    files: [
      {
        name: "media",
        accept: [
          "audio/*",
          "video/*",
          ".mp3",
          ".wav",
          ".m4a",
          ".ogg",
          ".flac",
          ".aac",
          ".opus",
          ".webm",
          ".mp4",
        ],
      },
    ],
  },
} as const;

export function mediaPath(id: string): string {
  return `${MEDIA_PREFIX}${encodeURIComponent(id)}`;
}

export function mergeShareTarget<T extends Record<string, unknown>>(manifest: T): T & {
  share_target: typeof SHARE_TARGET;
} {
  return { ...manifest, share_target: SHARE_TARGET };
}

export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    /* insecure context or blocked — import still works in-session */
  });
}

export async function takeSharedImport(): Promise<{
  file?: File;
  title?: string;
  text?: string;
  url?: string;
} | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const fileRes = await cache.match(SHARE_FILE);
    const metaRes = await cache.match(SHARE_META);
    if (!fileRes && !metaRes) return null;
    await cache.delete(SHARE_FILE);
    await cache.delete(SHARE_META);

    let file: File | undefined;
    if (fileRes) {
      const blob = await fileRes.blob();
      const rawName = fileRes.headers.get("X-Filename");
      const name = rawName ? decodeURIComponent(rawName) : "shared-audio";
      file = new File([blob], name, { type: blob.type || "application/octet-stream" });
    }

    let title: string | undefined;
    let text: string | undefined;
    let url: string | undefined;
    if (metaRes) {
      const meta = (await metaRes.json()) as { title?: string; text?: string; url?: string };
      title = meta.title || undefined;
      text = meta.text || undefined;
      url = meta.url || undefined;
    }
    if (!file && !title && !text && !url) return null;
    return { file, title, text, url };
  } catch {
    return null;
  }
}
