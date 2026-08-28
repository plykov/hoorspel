/**
 * Merge Web Share Target into the platform PWA manifest and land OS share
 * POSTs on /import?shared=1. Runs before grok-pwa.ts (filename order) so it
 * can wrap the generated manifest without editing platform files.
 */
import { SHARE_TARGET } from "../../src/lib/share-target";

interface ShareTargetEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

export default async function shareTargetMiddleware(
  event: ShareTargetEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  const path = event.url.pathname;

  if (method === "POST" && path === "/import") {
    return new Response(null, {
      status: 303,
      headers: { Location: "/import?shared=1" },
    });
  }

  const result = await next();

  if (
    method === "GET" &&
    (path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json") &&
    result instanceof Response
  ) {
    try {
      const json = (await result.clone().json()) as Record<string, unknown>;
      if (json && typeof json === "object") {
        json.share_target = SHARE_TARGET;
        const headers = new Headers(result.headers);
        headers.set("content-type", "application/manifest+json; charset=utf-8");
        headers.delete("content-length");
        return new Response(JSON.stringify(json, null, 2), {
          status: result.status,
          statusText: result.statusText,
          headers,
        });
      }
    } catch {
      return result;
    }
  }

  return result;
}
