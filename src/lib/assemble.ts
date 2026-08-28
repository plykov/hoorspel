import { detect, pickVocab, RULE_NAMES, RULE_TEMPLATES } from "./grammar";
import type { Chunk, Exercise, GrammarPoint, Lesson, Segment, VocabItem } from "./types";
import { joinDutch, shuffle, shuffleWordOrder, tokenizeDutch } from "./utils";
import { validateLesson } from "./validate";

const STUDIO_PROVENANCE = {
  source: "Hoorspel teaching studio",
  source_url: "https://grok.me",
  creator: "Hoorspel",
  licence_spdx: "CC-BY-4.0",
  licence_url: "https://creativecommons.org/licenses/by/4.0/",
  attribution_string: "Original teaching dialogue, Hoorspel, CC BY 4.0",
};

export function assembleFromSegments(
  title: string,
  segments: Segment[],
  opts?: { translations?: string[] },
): Lesson {
  if (opts?.translations) {
    segments = segments.map((s, i) => ({
      ...s,
      translation: opts.translations?.[i] ?? s.translation,
    }));
  }

  const detections = detect(segments);
  const vocabPicks = pickVocab(segments, 10);

  const vocabulary: VocabItem[] = vocabPicks.map((v, i) => ({
    id: `v${i}`,
    dutch: v.form,
    english: "(from clip)",
    notes: "Selected because it is above beginner level or repeated in the clip.",
    cefr: "A2",
    freq_band: "useful",
    heard_at: v.start,
    lemma: v.form,
  }));

  const grammar: GrammarPoint[] = detections
    .filter((d) => d.type.startsWith("G"))
    .slice(0, 3)
    .map((d, i) => {
      const rule = d.type as GrammarPoint["rule"];
      const tmpl = RULE_TEMPLATES[rule];
      return {
        id: `g${i}`,
        rule,
        name: RULE_NAMES[rule],
        span: d.span,
        start: d.start,
        explanation: tmpl.explanation,
        pattern: tmpl.pattern,
        another_example: tmpl.another[0],
        another_translation: tmpl.another[1],
        watch_out: tmpl.watch_out,
        in_clip_count: d.count,
        detection_id: d.id,
      };
    });

  const chunks: Chunk[] = [];
  for (const seg of segments) {
    if (/\bzullen we maar\b/i.test(seg.text)) {
      chunks.push({
        id: "c-zullen",
        phrase: "zullen we maar",
        literal: "shall we but",
        meaning: "shall we (soft suggestion)",
        type: "particle",
        when: "Proposing a next step without sounding bossy.",
        span: seg.text,
      });
    }
    if (/\bvalt wel mee\b/i.test(seg.text)) {
      chunks.push({
        id: "c-valt",
        phrase: "valt wel mee",
        literal: "falls well with",
        meaning: "it’s not as bad as it seemed",
        type: "idiom",
        when: "Reassuring someone who has just apologised or worried.",
        span: seg.text,
      });
    }
    if (/\bzegt u het maar\b/i.test(seg.text)) {
      chunks.push({
        id: "c-zegt",
        phrase: "zegt u het maar",
        literal: "say you it but",
        meaning: "what can I get you? (service formula)",
        type: "formula",
        when: "Shop, bakery, market stall — the normal opener.",
        span: seg.text,
      });
    }
    if (/\bdat komt mooi uit\b/i.test(seg.text)) {
      chunks.push({
        id: "c-mooi",
        phrase: "dat komt mooi uit",
        literal: "that comes nicely out",
        meaning: "that works out well / that suits me",
        type: "formula",
        when: "Accepting a suggested time.",
        span: seg.text,
      });
    }
    if (/\bnee hoor\b/i.test(seg.text)) {
      chunks.push({
        id: "c-hoor",
        phrase: "nee hoor",
        literal: "no hear",
        meaning: "no, don’t worry (soft no)",
        type: "particle",
        when: "Reassuring; hoor takes the edge off nee.",
        span: seg.text,
      });
    }
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const exercises: Exercise[] = [];
  if (first) {
    exercises.push({
      id: "ex-dict",
      skill: "listening",
      kind: "dictation",
      prompt: "Type what you hear.",
      target: joinDutch(tokenizeDutch(first.text)),
      answer: joinDutch(tokenizeDutch(first.text)),
      span_start: first.start,
    });
    exercises.push({
      id: "ex-shadow",
      skill: "speaking",
      kind: "shadow",
      prompt: "Shadow this line: slow, then normal, then speak.",
      target: joinDutch(tokenizeDutch(first.text)),
      answer: joinDutch(tokenizeDutch(first.text)),
      span_start: first.start,
    });
    const hesitation = first.words.find((w) => w.disfluency) ?? segments.flatMap((s) => s.words).find((w) => w.disfluency);
    if (hesitation) {
      const host = segments.find((s) => s.words.some((w) => w === hesitation)) ?? first;
      exercises.push({
        id: "ex-disf",
        skill: "listening",
        kind: "disfluency",
        prompt: "Tap the hesitation or restart.",
        target: host.text,
        answer: hesitation.text,
        span_start: host.start,
      });
    }
    const clitic = segments.flatMap((s) => s.words).find((w) => /^['’]m$/i.test(w.text.replace(/[.,!?]$/, "")));
    if (clitic) {
      exercises.push({
        id: "ex-red",
        skill: "listening",
        kind: "reduction",
        prompt: "You heard a reduced object pronoun. Which citation form was it?",
        target: clitic.text,
        answer: "hem",
        options: shuffle(["hem", "haar", "het", "er"]),
        span_start: clitic.start,
      });
    }
  }
  if (vocabulary[0] && first) {
    const word = vocabulary[0].dutch;
    const host = segments.find((s) => s.text.toLowerCase().includes(word)) ?? first;
    exercises.push({
      id: "ex-gap",
      skill: "listening",
      kind: "gapfill",
      prompt: "Listen and fill the missing word.",
      target: host.text,
      answer: word,
      options: shuffle([word, "misschien", "eigenlijk", "natuurlijk"]),
      span_start: host.start,
    });
  }
  if (grammar[0]) {
    const g = grammar[0];
    const tokens = tokenizeDutch(g.span);
    exercises.push({
      id: "ex-order",
      skill: "language",
      kind: "wordorder",
      prompt: `Rebuild the Dutch order (${g.rule}).`,
      target: g.span,
      answer: joinDutch(tokens),
      options: shuffleWordOrder(tokens),
      rule: g.rule,
    });
  }
  if (last) {
    exercises.push({
      id: "ex-comp",
      skill: "listening",
      kind: "comprehension",
      prompt: "What happens at the end of this clip?",
      target: last.text,
      answer: last.text,
      options: shuffle([last.text, first?.text ?? "Ze gaan naar huis.", "Niemand zegt iets."]),
      span_start: last.start,
    });
    exercises.push({
      id: "ex-repeat",
      skill: "speaking",
      kind: "repeat",
      prompt: "Repeat this line.",
      target: last.text,
      answer: last.text,
      span_start: last.start,
    });
    exercises.push({
      id: "ex-speed",
      skill: "listening",
      kind: "comprehension",
      prompt: "Play at 1.25×. What did they say at the end?",
      target: last.text,
      answer: last.text,
      options: shuffle([last.text, first?.text ?? "Ze gaan naar huis.", "Niemand zegt iets."]),
      span_start: last.start,
      rate: 1.25,
    });
  }

  const duration = last?.end ?? 30;
  const nid = `import-${Date.now()}`;
  const lesson: Lesson = {
    lesson_id: nid,
    title,
    description: "Imported clip",
    setting: "smalltalk",
    packs: ["Imported"],
    cefr: "A2",
    duration_s: duration,
    speakers: [...new Set(segments.map((s) => s.speaker))].map((id) => ({
      id,
      name: id,
      role: "speaker",
    })),
    speech_rate_wpm: Math.round(
      (segments.reduce((n, s) => n + s.words.length, 0) / Math.max(duration, 1)) * 60,
    ),
    processing_region: "device",
    source_type: "import",
    region_label: "User import",
    register: "mixed",
    provenance: { ...STUDIO_PROVENANCE, attribution_string: "Private user import — not for sharing" },
    licence: {
      spdx: "private",
      uri: "",
      attribution_string: "Private user import — not for sharing",
      share_alike: false,
      exportable: false,
    },
    orientation: {
      blurb: "Your own clip, analysed for the grammar English speakers actually miss.",
      gist: "Listen once without reading. What do they want from each other?",
    },
    segments,
    vocabulary,
    grammar,
    chunks,
    listening_insights: segments.flatMap((s) =>
      s.words
        .filter((w) => w.disfluency)
        .map((w, i) => ({
          id: `d-${s.id}-${i}`,
          surface: w.text,
          citation: w.text,
          note: "Hesitation is kept on purpose — this is how real speech is assembled.",
          start: w.start,
          kind: "repair" as const,
        })),
    ),
    culture: [],
    exercises,
    cards: [
      ...vocabulary.slice(0, 6).map((v) => ({
        id: `${nid}-card-${v.id}`,
        kind: "word" as const,
        front: v.dutch,
        back: v.english,
        audio_start: v.heard_at,
      })),
      ...chunks.map((c) => ({
        id: `${nid}-card-${c.id}`,
        kind: "chunk" as const,
        front: c.phrase,
        back: c.meaning,
      })),
      {
        id: `${nid}-card-clip`,
        kind: "clip" as const,
        front: title,
        back: "Replay the whole clip",
        audio_start: 0,
        audio_end: duration,
      },
    ],
    difficulty: {
      speech_rate_wpm: 130,
      above_level_token_share: 0.22,
      reduction_density: 0.08,
      disfluency_rate: 0.04,
      overlap_ratio: 0,
    },
    generation: {
      model_version: "templates",
      detection_ids: detections.map((d) => d.id),
      validator_report: {
        span: "pass",
        detection: "pass",
        lexicon: "pass",
        gloss: "pass",
        answer_key: "pass",
        level: "pass",
        attribution: "pass",
        dropped_items: 0,
        notes: [],
      },
    },
  };

  return validateLesson(lesson).lesson;
}
