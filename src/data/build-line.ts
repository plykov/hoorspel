import type { Segment, Word } from "@/lib/types";
import { normalizeDutchSpacing, normalizeToken } from "@/lib/utils";

export function buildLine(
  id: string,
  speaker: string,
  start: number,
  text: string,
  translation: string,
  disfluencies: string[] = [],
): Segment {
  const spaced = normalizeDutchSpacing(text);
  const raw = spaced.split(/\s+/).filter(Boolean);
  let t = start;
  const words: Word[] = raw.map((tok) => {
    const n = normalizeToken(tok);
    const dur = Math.max(0.16, n.length * 0.068);
    const word: Word = {
      text: tok,
      start: Number(t.toFixed(2)),
      end: Number((t + dur).toFixed(2)),
      conf: disfluencies.includes(n) ? 0.7 : 0.95,
      speaker,
      disfluency: disfluencies.includes(n) || /^(eh|uh|ehm)[.,…]*$/i.test(tok),
    };
    t += dur + 0.045;
    return word;
  });
  return {
    id,
    speaker,
    start,
    end: Number(t.toFixed(2)),
    text: spaced,
    translation,
    words,
  };
}
