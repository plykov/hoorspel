import type { Exercise, Segment } from "./types.ts";
import { joinDutch, normalizeToken, tokenizeDutch } from "./utils.ts";

export type ClipSpan = { start: number; end: number };

function normLine(text: string): string {
  return joinDutch(tokenizeDutch(text));
}

/** Map a practice prompt onto the line (or word) it came from in the take. */
export function clipSpan(
  segments: Segment[],
  opts: { target?: string; span_start?: number },
): ClipSpan | undefined {
  if (!segments.length) return undefined;

  const target = (opts.target ?? "").trim();
  const targetNorm = target ? normLine(target) : "";

  if (target) {
    const exact = segments.find((s) => s.text === target);
    if (exact) return { start: exact.start, end: exact.end };

    const byNorm = segments.find((s) => normLine(s.text) === targetNorm);
    if (byNorm) return { start: byNorm.start, end: byNorm.end };

    if (targetNorm.length >= 12) {
      const contained = segments.find((s) => {
        const n = normLine(s.text);
        return n.includes(targetNorm) || targetNorm.includes(n);
      });
      if (contained) return { start: contained.start, end: contained.end };
    }

    const token = normalizeToken(target);
    if (token) {
      for (const s of segments) {
        const word = s.words.find((w) => normalizeToken(w.text) === token);
        if (word) {
          return { start: word.start, end: Math.max(word.end + 0.12, word.start + 0.35) };
        }
      }
    }
  }

  if (opts.span_start != null && Number.isFinite(opts.span_start)) {
    const t = opts.span_start;
    const covering = segments.find((s) => t >= s.start - 0.08 && t <= s.end + 0.08);
    if (covering) return { start: covering.start, end: covering.end };
    let best = segments[0]!;
    let dist = Math.abs(best.start - t);
    for (const s of segments) {
      const d = Math.abs(s.start - t);
      if (d < dist) {
        best = s;
        dist = d;
      }
    }
    return { start: best.start, end: best.end };
  }

  return { start: segments[0]!.start, end: segments[0]!.end };
}

export function exerciseSpan(segments: Segment[], ex: Pick<Exercise, "target" | "span_start">): ClipSpan | undefined {
  return clipSpan(segments, { target: ex.target, span_start: ex.span_start });
}
