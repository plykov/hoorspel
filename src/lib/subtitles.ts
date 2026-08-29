import { buildLine } from "@/data/build-line";
import type { Segment } from "./types";

function toSeconds(h: string | undefined, m: string, s: string, frac: string): number {
  const hours = h ? Number(h.replace(":", "")) : 0;
  const ms = Number((frac + "000").slice(0, 3));
  return hours * 3600 + Number(m) * 60 + Number(s) + ms / 1000;
}

const TIME =
  /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

export function isSubtitleFile(name: string, type = ""): boolean {
  return /\.(srt|vtt)$/i.test(name) || /text\/(vtt|srt)/i.test(type) || type === "application/x-subrip";
}

/** Parse WebVTT or SubRip into timed Dutch lines. */
export function parseSubtitles(raw: string): Segment[] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const blocks = text.split(/\r?\n\s*\r?\n/);
  const cues: { start: number; end: number; text: string }[] = [];
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          l !== "WEBVTT" &&
          !/^NOTE\b/i.test(l) &&
          !/^STYLE\b/i.test(l) &&
          !/^KIND\b/i.test(l) &&
          !/^LANGUAGE\b/i.test(l),
      );
    const timeLine = lines.find((l) => TIME.test(l));
    if (!timeLine) continue;
    const m = timeLine.match(TIME);
    if (!m) continue;
    const start = toSeconds(m[1], m[2]!, m[3]!, m[4]!);
    const end = toSeconds(m[5], m[6]!, m[7]!, m[8]!);
    const body = lines
      .filter((l) => l !== timeLine && !/^\d+$/.test(l))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\{[^}]+\}/g, "")
      .trim();
    if (!body) continue;
    cues.push({ start, end: Math.max(end, start + 0.4), text: body });
  }

  return cues.map((cue, i) => {
    const tagged = cue.text.match(/^(?:\[?([A-Za-z0-9]+)\]?\s*[:\-–]\s*)(.+)$/);
    const speaker = tagged?.[1] ?? (i % 2 === 0 ? "A" : "B");
    const line = tagged?.[2] ?? cue.text;
    const seg = buildLine(`sub${i}`, speaker, cue.start, line, "");
    const n = Math.max(1, seg.words.length);
    const span = Math.max(0.12, (cue.end - cue.start) / n);
    return {
      ...seg,
      end: cue.end,
      words: seg.words.map((w, k) => ({
        ...w,
        start: Number((cue.start + k * span).toFixed(3)),
        end: Number((cue.start + (k + 1) * span).toFixed(3)),
        conf: 0.9,
      })),
    };
  });
}

export function segmentsToDialogue(segments: Segment[]): string {
  return segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
}
