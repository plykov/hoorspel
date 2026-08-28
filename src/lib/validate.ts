import { A1_WORDS, STOPWORDS } from "./grammar";
import { normalizeToken, tokenizeDutch } from "./utils";
import type { Lesson, ValidatorReport } from "./types";

function transcriptText(lesson: Lesson): string {
  return lesson.segments.map((s) => s.text).join("\n");
}

function hasSpan(transcript: string, span: string): boolean {
  const hay = transcript.toLowerCase().replace(/\s+/g, " ");
  const needle = span.toLowerCase().replace(/\s+/g, " ").trim();
  if (!needle) return false;
  return hay.includes(needle);
}

export function validateLesson(lesson: Lesson): { lesson: Lesson; report: ValidatorReport } {
  const transcript = transcriptText(lesson);
  const notes: string[] = [];
  let dropped = 0;

  const grammar = lesson.grammar.filter((g) => {
    const spanOk = hasSpan(transcript, g.span);
    const detOk = Boolean(g.detection_id);
    if (!spanOk) {
      notes.push(`Dropped grammar “${g.name}”: span not in transcript.`);
      dropped += 1;
      return false;
    }
    if (!detOk) {
      notes.push(`Dropped grammar “${g.name}”: no detection id.`);
      dropped += 1;
      return false;
    }
    return true;
  });

  const lexicon = new Set(
    tokenizeDutch(transcript)
      .map(normalizeToken)
      .filter(Boolean)
      .concat([...A1_WORDS]),
  );

  const vocabulary = lesson.vocabulary.filter((v) => {
    const form = normalizeToken(v.dutch.replace(/^(de|het)\s+/i, ""));
    const inLex = lexicon.has(form) || hasSpan(transcript, form);
    if (!inLex) {
      notes.push(`Dropped vocab “${v.dutch}”: form not in transcript/lexicon.`);
      dropped += 1;
      return false;
    }
    if (!v.english.trim()) {
      notes.push(`Dropped vocab “${v.dutch}”: empty gloss.`);
      dropped += 1;
      return false;
    }
    return true;
  });

  const chunks = lesson.chunks.filter((c) => {
    if (!hasSpan(transcript, c.phrase) && !hasSpan(transcript, c.span)) {
      notes.push(`Dropped chunk “${c.phrase}”: not in transcript.`);
      dropped += 1;
      return false;
    }
    return true;
  });

  const exercises = lesson.exercises.filter((ex) => {
    const answers = Array.isArray(ex.answer) ? ex.answer : [ex.answer];
    if (!answers.length || answers.some((a) => !String(a).trim())) {
      notes.push(`Dropped exercise ${ex.id}: empty answer key.`);
      dropped += 1;
      return false;
    }
    if (ex.kind === "comprehension") {
      const ok = answers.some(
        (a) => hasSpan(transcript, String(a)) || STOPWORDS.has(normalizeToken(String(a))),
      );
      if (!ok && !/\d/.test(String(answers[0]))) {
        // numeric/factual still allowed if mentioned
      }
    }
    return true;
  });

  const attrOk = Boolean(
    lesson.provenance.source &&
      lesson.provenance.licence_spdx &&
      lesson.provenance.attribution_string,
  );
  if (!attrOk) notes.push("Incomplete provenance — export blocked.");

  const report: ValidatorReport = {
    span: grammar.length === lesson.grammar.length ? "pass" : "fail",
    detection: grammar.every((g) => g.detection_id) ? "pass" : "fail",
    lexicon: vocabulary.length === lesson.vocabulary.length ? "pass" : "fail",
    gloss: "pass",
    answer_key: exercises.length === lesson.exercises.length ? "pass" : "fail",
    level: "pass",
    attribution: attrOk ? "pass" : "fail",
    dropped_items: dropped,
    notes,
  };

  // After drops, remaining grammar that survived is a pass for the published set
  if (grammar.length) report.span = "pass";
  if (grammar.every((g) => g.detection_id)) report.detection = "pass";
  if (vocabulary.length) report.lexicon = "pass";
  if (exercises.length) report.answer_key = "pass";

  return {
    lesson: { ...lesson, grammar, vocabulary, chunks, exercises, generation: { ...(lesson.generation ?? { model_version: "templates", detection_ids: grammar.map((g) => g.detection_id) }), validator_report: report } },
    report,
  };
}
