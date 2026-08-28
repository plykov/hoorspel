import { createServerFn } from "@tanstack/react-start";
import type { Segment, Word } from "./types";
import { normalizeDutchSpacing, normalizeToken, tokenizeDutch } from "./utils";

export type SttWord = {
  text: string;
  start: number;
  end: number;
  speaker?: number;
};

export type SttResult = {
  ok: true;
  text: string;
  duration: number;
  language?: string;
  words: SttWord[];
  dialogue: string;
};

export const transcribeAudioFn = createServerFn({ method: "POST" })
  .validator(
    (input: { b64?: string; filename?: string; mime?: string; url?: string }) => input,
  )
  .handler(async ({ data }): Promise<SttResult | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Transcription is not available in this environment." };
    }
    const form = new FormData();
    form.append("language", "nl");
    form.append("format", "true");
    form.append("diarize", "true");
    form.append("filler_words", "true");
    form.append("keyterm", "even");
    form.append("keyterm", "nou");
    form.append("keyterm", "toch");
    form.append("keyterm", "hoor");
    form.append("keyterm", "alstublieft");
    if (data.url) {
      form.append("url", data.url);
    } else if (data.b64) {
      const buf = Buffer.from(data.b64, "base64");
      if (buf.length > 6_500_000) {
        return { ok: false, error: "Trim the clip shorter — the upload is too large." };
      }
      const mime = data.mime || "audio/wav";
      const file = new File([buf], data.filename || "clip.wav", { type: mime });
      form.append("file", file);
    } else {
      return { ok: false, error: "No audio to transcribe." };
    }

    try {
      const res = await fetch("https://api.x.ai/v1/stt", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (res.status === 401) return { ok: false, error: "Transcription is not available." };
        if (res.status === 413) return { ok: false, error: "That clip is too large. Trim it shorter." };
        return { ok: false, error: `Could not transcribe (${res.status}). ${errText.slice(0, 120)}` };
      }
      const body = (await res.json()) as {
        text?: string;
        duration?: number;
        language?: string;
        words?: { text: string; start: number; end: number; speaker?: number }[];
      };
      const words: SttWord[] = (body.words ?? []).map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        speaker: w.speaker,
      }));
      const text = (body.text ?? "").trim();
      if (!text && !words.length) {
        return { ok: false, error: "Nothing was recognised. Try a clearer span, or type the transcript." };
      }
      const dialogue = wordsToDialogue(words, text);
      return {
        ok: true,
        text,
        duration: body.duration ?? 0,
        language: body.language,
        words,
        dialogue,
      };
    } catch {
      return { ok: false, error: "Transcription timed out. Trim shorter, or type what you hear." };
    }
  });

export function wordsToDialogue(words: SttWord[], fallback = ""): string {
  if (!words.length) return fallback;
  const letters = "ABCDEFGHIJ";
  const groups: { speaker: string; words: SttWord[] }[] = [];
  for (const w of words) {
    const speaker = letters[Math.max(0, w.speaker ?? 0)] ?? "A";
    const last = groups[groups.length - 1];
    const gap = last ? w.start - (last.words.at(-1)?.end ?? w.start) : 0;
    if (!last || last.speaker !== speaker || gap > 1.05) {
      groups.push({ speaker, words: [w] });
    } else {
      last.words.push(w);
    }
  }
  return groups
    .map((g) => {
      const line = g.words
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+([.,!?…;:])/g, "$1");
      return `${g.speaker}: ${normalizeDutchSpacing(line)}`;
    })
    .join("\n");
}

export const STT_TYPE_HINT =
  "Play the clip and type what you hear (A: … / B: …), or use Dictate a line.";

export function sttErrorMessage(error: unknown): string {
  if (typeof Response !== "undefined" && error instanceof Response) {
    return `Transcription is not available here. ${STT_TYPE_HINT}`;
  }
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (
    /invariant failed/i.test(msg) ||
    /content-type/i.test(msg) ||
    /expected result/i.test(msg) ||
    /failed to fetch/i.test(msg) ||
    /load failed/i.test(msg) ||
    /networkerror/i.test(msg)
  ) {
    return `Transcription is not available here. ${STT_TYPE_HINT}`;
  }
  return msg.trim() || `Could not transcribe. ${STT_TYPE_HINT}`;
}

export function cloudSttOff(): boolean {
  return import.meta.env.VITE_GITHUB_PAGES === "1";
}

export async function transcribeSafely(
  data: { b64?: string; filename?: string; mime?: string; url?: string },
): Promise<SttResult | { ok: false; error: string }> {
  if (cloudSttOff()) {
    return { ok: false, error: `This copy has no cloud transcription. ${STT_TYPE_HINT}` };
  }
  try {
    return await transcribeAudioFn({ data });
  } catch (error) {
    return { ok: false, error: sttErrorMessage(error) };
  }
}

export function applyWordTimings(segments: Segment[], words: SttWord[]): Segment[] {
  if (!words.length) return segments;
  let wi = 0;
  return segments.map((seg) => {
    const toks = tokenizeDutch(seg.text);
    const assigned: Word[] = [];
    for (const tok of toks) {
      const n = normalizeToken(tok);
      let found = -1;
      for (let k = wi; k < Math.min(words.length, wi + 10); k++) {
        if (normalizeToken(words[k]!.text) === n) {
          found = k;
          break;
        }
      }
      if (found >= 0) {
        const w = words[found]!;
        assigned.push({
          text: tok,
          start: w.start,
          end: w.end,
          conf: 0.92,
          speaker: seg.speaker,
          disfluency: /^(eh|uh|ehm|hm|mm)[.,…]*$/i.test(n),
        });
        wi = found + 1;
      } else {
        const t = assigned.at(-1)?.end ?? seg.start;
        assigned.push({
          text: tok,
          start: t,
          end: t + 0.18,
          conf: 0.55,
          speaker: seg.speaker,
          disfluency: /^(eh|uh|ehm)/i.test(n),
        });
      }
    }
    return {
      ...seg,
      start: assigned[0]?.start ?? seg.start,
      end: assigned.at(-1)?.end ?? seg.end,
      words: assigned.length ? assigned : seg.words,
    };
  });
}
