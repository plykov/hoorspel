import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function tokenizeDutch(text: string): string[] {
  return normalizeDutchSpacing(text)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizeToken(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[“”"'‘’(]+|[”"'‘’),.!?;:]+$/g, "")
    .replace(/…$/, "");
}

/** Collapse messy whitespace and keep Dutch punctuation glued to the word before it. */
export function normalizeDutchSpacing(text: string): string {
  return text
    .replace(/[\u00A0\t\r\n]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([.,!?;:…])/g, "$1")
    .replace(/([,!?;:])(?=\S)/g, "$1 ")
    .replace(/([.?!…])(?=\p{L})/gu, "$1 ")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function joinDutch(tokens: string[]): string {
  return normalizeDutchSpacing(tokens.filter((t) => t.trim()).join(" "));
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Shuffle tokens so the pool is not already in the correct sentence order. */
export function shuffleWordOrder(tokens: readonly string[]): string[] {
  if (tokens.length < 2) return [...tokens];
  const original = tokens.join("\0");
  let shuffled = shuffle(tokens);
  for (let n = 0; n < 10 && shuffled.join("\0") === original; n += 1) {
    shuffled = shuffle(tokens);
  }
  if (shuffled.join("\0") === original) {
    const swapAt = shuffled.findIndex((t, i) => i > 0 && t !== shuffled[0]);
    if (swapAt > 0) {
      const tmp = shuffled[0]!;
      shuffled[0] = shuffled[swapAt]!;
      shuffled[swapAt] = tmp;
    }
  }
  return shuffled;
}

export function sameDutch(a: string, b: string): boolean {
  const strip = (s: string) =>
    normalizeDutchSpacing(s)
      .toLowerCase()
      .replace(/[?!.,;:…]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const na = strip(a);
  const nb = strip(b);
  if (na === nb) return true;
  return normalizeToken(na) === normalizeToken(nb) && na.length > 0;
}

export function choiceIsCorrect(option: string, expected: string): boolean {
  const a = normalizeDutchSpacing(option).toLowerCase();
  const b = normalizeDutchSpacing(expected).toLowerCase();
  if (a === b) return true;
  return normalizeToken(option) === normalizeToken(expected) && normalizeToken(option).length > 0;
}
