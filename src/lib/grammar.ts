import type { Detection, RuleId, Segment } from "./types";
import { normalizeDutchSpacing, normalizeToken, tokenizeDutch } from "./utils";

export const RULE_NAMES: Record<RuleId, string> = {
  G1: "Verb-second (V2) word order",
  G2: "Verb-final in subordinate clauses",
  G3: "Separable verbs",
  G4: "Perfect: hebben vs zijn",
  G5: "The little word er",
  G6: "de / het gender",
  G7: "Diminutives",
  G8: "Modal particles",
  G9: "Polite modal constructions",
  G10: "Reduction and clitics",
  G11: "niet vs geen",
  G12: "Time–manner–place order",
};

export const RULE_TEMPLATES: Record<
  RuleId,
  {
    explanation: string;
    pattern: string;
    watch_out: string;
    another: [string, string];
  }
> = {
  G1: {
    explanation:
      "Dutch main clauses keep the finite verb in second position. When something that is not the subject comes first (a time, a place, an object), the subject drops to third: inversion. English stays SVO, so learners leave the subject in front and produce *Morgen ik ga…*",
    pattern: "X + finite verb + subject + …",
    watch_out: "Do not keep English SVO after a fronted adverbial.",
    another: ["Morgen ga ik naar de markt.", "Tomorrow I am going to the market."],
  },
  G2: {
    explanation:
      "After subordinators like omdat, dat, als, wanneer, terwijl, the finite verb moves to the end of the clause. English keeps the verb in the middle (*because I don’t know*), so the English-shaped *omdat ik weet het niet* is the most common L1 error in this clip’s pattern.",
    pattern: "subordinator + subject + … + finite verb",
    watch_out: "The verb is last in the subclause, not after the subject.",
    another: ["Ik blijf thuis omdat ik ziek ben.", "I am staying home because I am ill."],
  },
  G3: {
    explanation:
      "Separable verbs split in a main clause: the prefix parks at the end, often several words away from the stem. English has no analogue, so the stranded particle is easy to miss in fast speech — you have to listen for both halves.",
    pattern: "stem … prefix  (bel … op, stap … in)",
    watch_out: "Look at the end of the clause for the missing prefix.",
    another: ["Ik bel je morgen op.", "I will call you tomorrow."],
  },
  G4: {
    explanation:
      "Dutch perfect tense chooses hebben or zijn, and the participle sits at the end of the clause. Motion and change-of-state verbs typically take zijn. English only has have, so auxiliary choice has to be learned per verb.",
    pattern: "subject + hebt/is + … + participle",
    watch_out: "gaan, komen, worden, blijven take zijn, not hebben.",
    another: ["Zij is al aangekomen.", "She has already arrived."],
  },
  G5: {
    explanation:
      "Er has no single English equivalent. It can be locative (there), existential (there is), quantitative (of them), or a placeholder after a preposition (*er + bij*). It is detected only when it is actually in the clip — never assumed.",
    pattern: "er + (locative | existential | quantitative | prepositional)",
    watch_out: "Do not drop er after a preposition that has lost its object.",
    another: ["Wilt u er koffie bij?", "Would you like coffee with that?"],
  },
  G6: {
    explanation:
      "Every Dutch noun is de or het, and the article has to travel with the noun. Gender is largely unpredictable from English and is best learned as part of the word, never as a later add-on.",
    pattern: "de/het + noun  (always stored together)",
    watch_out: "Memorise the article with the noun: het bolletje, not bolletje.",
    another: ["het station / de trein", "the station / the train"],
  },
  G7: {
    explanation:
      "The diminutive (-je / -tje / -pje / -kje) is everywhere in spoken Dutch. It is not just ‘small’: it is often friendly, attenuating, or just the normal word (een kopje koffie). Het is always the article of a diminutive.",
    pattern: "noun + -je/-tje  →  always het",
    watch_out: "A diminutive is het, even when the base noun is de.",
    another: ["Wil je een kopje thee?", "Would you like a cup of tea?"],
  },
  G8: {
    explanation:
      "Modal particles (even, nou, toch, maar, eens, hoor, wel) have almost no lexical meaning. They manage social tone: softening a request, marking the obvious, buying time. A word-by-word gloss will not reproduce them. They are the signature of everyday Dutch, and textbooks under-teach them.",
    pattern: "content sentence + particle(s) in the middle field",
    watch_out: "Do not translate even as ‘evenly’ or maar as ‘but’ when they sit as particles.",
    another: ["Wacht even. / Doe maar.", "Hang on a sec. / Go ahead (soft)."],
  },
  G9: {
    explanation:
      "Requests that would be a bare imperative in English are often a conditional in Dutch: zou je/u … kunnen/willen. The construction controls register. Dropping it can sound blunt in service encounters; overusing u with friends sounds stiff.",
    pattern: "zou + subject + … + kunnen/willen + infinitive",
    watch_out: "This is politeness, not a hypothetical about the future.",
    another: ["Zou u het raam even willen dichtdoen?", "Would you mind closing the window?"],
  },
  G10: {
    explanation:
      "Citation forms are not what you hear. Spoken Dutch reduces unstressed syllables, drops -n in -en, and cliticises pronouns: even → ff, er → d’r, het → ’t, ik → ’k. Hearing the full form while the audio plays the reduced one is why comprehension collapses.",
    pattern: "surface form  ≠  citation form",
    watch_out: "Train the ear on the reduced form; do not wait for the dictionary word.",
    another: ["Ik heb ’t niet gezien.", "I didn’t see it. (het → ’t)"],
  },
  G11: {
    explanation:
      "niet negates verbs, adjectives and whole clauses; geen negates an indefinite noun phrase (geen koffie, not niet koffie). Placement also differs from English not.",
    pattern: "geen + noun   /   niet + verb or remainder",
    watch_out: "niet een X is almost always wrong; use geen X.",
    another: ["Ik heb geen tijd. / Ik weet het niet.", "I have no time. / I don’t know."],
  },
  G12: {
    explanation:
      "In the middle field Dutch prefers time, then manner, then place. English is often place-before-time (*I am going to Utrecht tomorrow*), so the English order is immediately audible as non-native.",
    pattern: "time → manner → place",
    watch_out: "Do not copy English place-before-time.",
    another: ["Ik ga morgen met de trein naar Utrecht.", "I am going to Utrecht by train tomorrow."],
  },
};

const SUBORDINATORS = [
  "omdat",
  "dat",
  "als",
  "wanneer",
  "terwijl",
  "hoewel",
  "nadat",
  "voordat",
  "zodat",
  "doordat",
  "indien",
];

const PARTICLES = ["even", "nou", "toch", "maar", "eens", "hoor", "wel", "dan", "zeg"];

const SEPARABLE: Record<string, string> = {
  overstappen: "over",
  instappen: "in",
  uitstappen: "uit",
  aankomen: "aan",
  aandoen: "aan",
  afronden: "af",
  afmaken: "af",
  afrekenen: "af",
  afspreken: "af",
  doornemen: "door",
  meenemen: "mee",
  oppakken: "op",
  opbellen: "op",
  ophalen: "op",
  opstaan: "op",
  uitkomen: "uit",
  terugkomen: "terug",
  aansnijden: "aan",
  rondsturen: "rond",
  meegaan: "mee",
  nadenken: "na",
  invullen: "in",
  uitleggen: "uit",
  voorstellen: "voor",
  neerzetten: "neer",
  aanzetten: "aan",
  uitzetten: "uit",
  langskomen: "langs",
  binnenkomen: "binnen",
  weggaan: "weg",
  toekomen: "toe",
  meekomen: "mee",
  opzoeken: "op",
  klaarmaken: "klaar",
  wegleggen: "weg",
};

const FINITE_HINTS = [
  "ben",
  "is",
  "zijn",
  "was",
  "ga",
  "gaat",
  "gaan",
  "ging",
  "heb",
  "hebt",
  "heeft",
  "had",
  "kan",
  "kunt",
  "kunnen",
  "wil",
  "wilt",
  "willen",
  "moet",
  "moeten",
  "mag",
  "mogen",
  "zal",
  "zult",
  "zou",
  "zouden",
  "doe",
  "doet",
  "kom",
  "komt",
  "weet",
  "zegt",
  "bel",
  "stap",
  "pakt",
  "betaal",
  "betaalt",
  "klopt",
  "denk",
  "stuur",
];

function allText(segments: Segment[]): string {
  return segments.map((s) => s.text).join(" ");
}

function findInSegments(segments: Segment[], needle: string): number {
  const n = needle.toLowerCase();
  for (const s of segments) {
    const i = s.text.toLowerCase().indexOf(n);
    if (i >= 0) return s.start;
  }
  return segments[0]?.start ?? 0;
}

function push(
  out: Detection[],
  type: Detection["type"],
  span: string,
  start: number,
  evidence: string,
  extra?: Partial<Detection>,
) {
  if (!span.trim()) return;
  const existing = out.find((d) => d.type === type && d.span === span);
  if (existing) {
    existing.count += 1;
    return;
  }
  out.push({
    id: `${type}-${out.length + 1}`,
    type,
    span,
    start,
    evidence,
    confidence: 0.86,
    count: 1,
    ...extra,
  });
}

export function detect(segments: Segment[]): Detection[] {
  const out: Detection[] = [];
  const joined = allText(segments);

  for (const seg of segments) {
    const tokens = tokenizeDutch(seg.text);
    const norms = tokens.map(normalizeToken);

    for (const sub of SUBORDINATORS) {
      const idx = norms.indexOf(sub);
      if (idx >= 0) {
        push(out, "G2", seg.text, seg.start, `subordinator “${sub}” in clause`);
        break;
      }
    }

    const particleHits = norms.filter((t) => PARTICLES.includes(t));
    if (particleHits.length) {
      push(
        out,
        "G8",
        seg.text,
        seg.start,
        `particles: ${[...new Set(particleHits)].join(", ")}`,
      );
    }

    if (/\bzou(den)?\b/i.test(seg.text) && /\b(kunnen|willen|mogen)\b/i.test(seg.text)) {
      push(out, "G9", seg.text, seg.start, "zou … kunnen/willen");
    }

    if (/\ber\b/i.test(seg.text)) {
      push(out, "G5", seg.text, seg.start, "token er");
    }

    if (/\bgeen\b/i.test(seg.text) || /\bniet\b/i.test(seg.text)) {
      push(
        out,
        "G11",
        seg.text,
        seg.start,
        /\bgeen\b/i.test(seg.text) ? "geen" : "niet",
      );
    }

    if (/-(tje|je|pje|kje)\b/i.test(seg.text)) {
      push(out, "G7", seg.text, seg.start, "diminutive suffix");
    }

    const split = seg.text.match(
      /\b(bel|stap|pak|maak|neem|zet|doe|kom|ga|stuur|snijd|kijk|haal)\w*\b.*\b(op|in|uit|af|aan|mee|over|terug|rond|door|na|voor|neer|weg|klaar)\b/i,
    );
    if (split) {
      push(out, "G3", split[0], seg.start, "split separable verb");
    }

    for (const [inf, prefix] of Object.entries(SEPARABLE)) {
      if (joined.toLowerCase().includes(inf) || norms.includes(prefix)) {
        if (seg.text.toLowerCase().includes(inf) || norms.includes(prefix)) {
          // counted on split match; skip bare lexicon here
        }
      }
    }

    if (
      /^(morgen|vandaag|gisteren|dan|daar|hier|nu|misschien|daarom|toen)\b/i.test(
        seg.text.trim(),
      ) &&
      FINITE_HINTS.some((v) => norms.includes(v))
    ) {
      push(out, "G1", seg.text, seg.start, "fronted non-subject + finite verb");
    }

    if (/\b(ben|is|zijn|heb|hebt|heeft)\b.*\b\w+(d|t|en)\b/i.test(seg.text)) {
      if (/\b(ge|be|ver|aange|opge|meege|overge)\w+/i.test(seg.text)) {
        push(out, "G4", seg.text, seg.start, "perfect auxiliary + participle");
      }
    }
  }

  if (/\b(morgen|vandaag).+\b(naar|in|op)\b/i.test(joined)) {
    push(out, "G12", joined.slice(0, 80), findInSegments(segments, "morgen"), "TMP order");
  }

  return out;
}

export const A1_WORDS = new Set(
  `ik je jij u hij zij we wij jullie het de een is zijn was ben bent heb hebt heeft had kan kunt kunnen wil wilt willen moet moeten mag mogen zal zullen zou doen doet ga gaat gaan kom komt komen zeg zegt zien weet weten willen goed morgen avond dag tot ziens ja nee alstublieft alsjeblieft dank wel niet geen en of maar want dat die dit daar hier nu dan nog al ook even nou hoe wat waar wie wanneer waarom met van voor naar op in uit aan bij om over onder tussen na tot tegen zonder als of te te veel heel erg mooi leuk klein groot nieuw oud huis straat stad land water brood kaas melk koffie thee appel kaas trein bus auto fiets werk school winkel markt dokter tijd uur minuut vandaag morgen gisteren week maand jaar man vrouw kind vriend mensen eten drinken kopen betalen vragen antwoorden luisteren spreken lezen schrijven helpen wachten zitten staan lopen maken geven nemen halen kijken horen vinden denken weten blijven worden`.split(
    /\s+/,
  ),
);

export const STOPWORDS = new Set(
  `ik je jij u hij ze zij we wij jullie het de een en of maar want dat die dit daar hier nu dan nog al ook te om te van voor naar op in uit aan bij over onder tot met zonder als of is zijn was ben heb heeft had kan wil moet mag zal zou doen gaat komen te 't d'r ff eh mm nou ja nee`.split(
    /\s+/,
  ),
);

export function isLikelyDutch(text: string): { ok: boolean; reason: string } {
  const tokens = tokenizeDutch(text).map(normalizeToken).filter(Boolean);
  if (tokens.length < 6) return { ok: false, reason: "Need a longer stretch of speech." };
  const dutchCue = tokens.filter((t) =>
    ["de", "het", "een", "ik", "je", "u", "niet", "dat", "en", "van", "op", "te", "zijn", "er", "ook"].includes(
      t,
    ),
  ).length;
  const englishCue = tokens.filter((t) =>
    ["the", "and", "is", "you", "this", "that", "with", "for", "have"].includes(t),
  ).length;
  if (englishCue > dutchCue && englishCue >= 3) {
    return { ok: false, reason: "This looks like English. Paste everyday Dutch speech." };
  }
  if (dutchCue < 2) {
    return { ok: false, reason: "Not enough Dutch function words to trust this as NL." };
  }
  return { ok: true, reason: "Looks like Dutch." };
}

export function parseTranscript(raw: string): Segment[] {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const segs: Segment[] = [];
  let t = 0;
  let i = 0;
  for (const line of lines) {
    const m = line.match(/^(?:\[?([A-Za-z0-9]+)\]?\s*[:\-–]\s*)(.+)$/);
    const speaker = m ? m[1] : segs.length % 2 === 0 ? "A" : "B";
    const text = normalizeDutchSpacing(m ? m[2] : line);
    const words = tokenizeDutch(text);
    let cursor = t;
    const wordObjs = words.map((w) => {
      const dur = Math.max(0.16, normalizeToken(w).length * 0.065);
      const item = {
        text: w,
        start: cursor,
        end: cursor + dur,
        conf: /eh|uh|nou ja/i.test(w) ? 0.72 : 0.94,
        speaker,
        disfluency: /^(eh|uh|ehm|mm)[.,…]*$/i.test(w),
      };
      cursor += dur + 0.04;
      return item;
    });
    const end = Math.max(cursor, t + 1.4);
    segs.push({
      id: `s${i++}`,
      speaker,
      start: t,
      end,
      text,
      translation: "",
      words: wordObjs,
    });
    t = end + 0.28;
  }
  return segs;
}

export function pickVocab(segments: Segment[], max = 10) {
  const counts = new Map<string, { count: number; start: number; form: string }>();
  for (const seg of segments) {
    for (const w of seg.words) {
      const n = normalizeToken(w.text);
      if (!n || STOPWORDS.has(n) || n.length < 3) continue;
      const prev = counts.get(n);
      if (prev) prev.count += 1;
      else counts.set(n, { count: 1, start: w.start, form: n });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.form.length - a.form.length)
    .filter((x) => !A1_WORDS.has(x.form) || x.form.length > 7)
    .slice(0, max);
}
