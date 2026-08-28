import { createServerFn } from "@tanstack/react-start";
import { assembleFromSegments } from "./assemble";
import { parseTranscript } from "./grammar";
import { detect, RULE_NAMES } from "./grammar";
import { validateLesson } from "./validate";
import type { Lesson } from "./types";

export const aiAvailable = createServerFn({ method: "GET" }).handler(async () => ({
  ok: Boolean(process.env.XAI_API_KEY),
}));

export const generateLessonFn = createServerFn({ method: "POST" })
  .validator((input: { title: string; transcript: string; residency: "device" | "eu" | "fastest" }) => input)
  .handler(async ({ data }): Promise<{ ok: true; lesson: Lesson } | { ok: false; error: string }> => {
    const segments = parseTranscript(data.transcript);
    if (segments.length < 2) {
      return { ok: false, error: "Need at least two lines of dialogue." };
    }
    const base = assembleFromSegments(data.title || "Imported clip", segments);
    base.processing_region = data.residency === "eu" ? "eu-west" : data.residency === "device" ? "device" : "us";

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: true, lesson: validateLesson(base).lesson };
    }

    const detections = detect(segments);
    const transcript = segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 2800,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You write Dutch-listening lesson enrichments for English speakers. You may ONLY explain items in the detection list. Quote exact transcript spans. Never invent Dutch. Never alter the transcript. Never add grammar points. Cultural notes only where a native would agree they are needed. JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify({
                transcript,
                detections: detections.map((d) => ({
                  id: d.id,
                  type: d.type,
                  name: d.type in RULE_NAMES ? RULE_NAMES[d.type as keyof typeof RULE_NAMES] : d.type,
                  span: d.span,
                  evidence: d.evidence,
                })),
                schema: {
                  translations: ["English gloss of each transcript line, same length as lines"],
                  vocabulary: [{ dutch: "", english: "", notes: "", article: "de|het|null" }],
                  grammar_fill: [{ detection_id: "", explanation: "≤90 words, contrast English", another_example: "", another_translation: "", watch_out: "" }],
                  chunks: [{ phrase: "exact span", meaning: "", type: "idiom|collocation|discourse_marker|formula|particle", when: "" }],
                  listening_insights: [{ surface: "", citation: "", note: "" }],
                  culture: [{ text: "" }],
                  gist: "one gist question",
                },
              }),
            },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: true, lesson: validateLesson(base).lesson };
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text) as {
        translations?: string[];
        vocabulary?: { dutch: string; english: string; notes?: string; article?: "de" | "het" }[];
        grammar_fill?: { detection_id: string; explanation: string; another_example?: string; another_translation?: string; watch_out?: string }[];
        chunks?: { phrase: string; meaning: string; type: Lesson["chunks"][number]["type"]; when: string }[];
        listening_insights?: { surface: string; citation: string; note: string }[];
        culture?: { text: string }[];
        gist?: string;
      };

      if (parsed.translations?.length) {
        base.segments = base.segments.map((s, i) => ({
          ...s,
          translation: parsed.translations?.[i] ?? s.translation,
        }));
      }
      if (parsed.vocabulary?.length) {
        base.vocabulary = parsed.vocabulary.slice(0, 12).map((v, i) => ({
          id: `v${i}`,
          dutch: v.dutch,
          article: v.article === "de" || v.article === "het" ? v.article : undefined,
          english: v.english,
          notes: v.notes ?? "",
          cefr: "A2" as const,
          freq_band: "useful" as const,
          heard_at: 0,
          lemma: v.dutch.replace(/^(de|het)\s+/i, ""),
        }));
      }
      if (parsed.grammar_fill?.length) {
        base.grammar = base.grammar.map((g) => {
          const fill = parsed.grammar_fill?.find((f) => f.detection_id === g.detection_id);
          if (!fill) return g;
          return {
            ...g,
            explanation: fill.explanation || g.explanation,
            another_example: fill.another_example || g.another_example,
            another_translation: fill.another_translation || g.another_translation,
            watch_out: fill.watch_out || g.watch_out,
          };
        });
      }
      if (parsed.chunks?.length) {
        base.chunks = parsed.chunks.slice(0, 6).map((c, i) => ({
          id: `c${i}`,
          phrase: c.phrase,
          literal: "",
          meaning: c.meaning,
          type: c.type,
          when: c.when,
          span: c.phrase,
        }));
      }
      if (parsed.listening_insights?.length) {
        base.listening_insights = parsed.listening_insights.slice(0, 5).map((l, i) => ({
          id: `li${i}`,
          surface: l.surface,
          citation: l.citation,
          note: l.note,
          start: 0,
          kind: "reduction" as const,
        }));
      }
      if (parsed.culture?.length) {
        base.culture = parsed.culture.slice(0, 2).map((c, i) => ({ id: `cu${i}`, text: c.text }));
      }
      if (parsed.gist) base.orientation.gist = parsed.gist;
      base.generation = {
        model_version: "grok-4.5",
        detection_ids: detections.map((d) => d.id),
        validator_report: base.generation!.validator_report,
      };
      return { ok: true, lesson: validateLesson(base).lesson };
    } catch {
      return { ok: true, lesson: validateLesson(base).lesson };
    }
  });
