/** Vite base — always a trailing slash. `/` in preview, `/hoorspel/` on GitHub Pages. */
export const BASE_URL: string =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";

export function withBase(path: string): string {
  return `${BASE_URL}${path.replace(/^\//, "")}`;
}
