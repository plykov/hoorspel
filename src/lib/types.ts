export type Cefr = "A1" | "A2" | "B1" | "B2";

export type RuleId =
  | "G1"
  | "G2"
  | "G3"
  | "G4"
  | "G5"
  | "G6"
  | "G7"
  | "G8"
  | "G9"
  | "G10"
  | "G11"
  | "G12";

export type Setting =
  | "bakery"
  | "phone"
  | "station"
  | "family"
  | "workplace"
  | "shopping"
  | "cafe"
  | "doctor"
  | "smalltalk";

export type Licence = {
  spdx: string;
  uri: string;
  attribution_string: string;
  share_alike: boolean;
  exportable: boolean;
};

export type Provenance = {
  source: string;
  source_url: string;
  creator: string;
  licence_spdx: string;
  licence_url: string;
  attribution_string: string;
};

export type Word = {
  text: string;
  start: number;
  end: number;
  conf: number;
  speaker: string;
  disfluency?: boolean;
};

export type Segment = {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
  translation: string;
  words: Word[];
};

export type Speaker = {
  id: string;
  name: string;
  role: string;
};

export type VocabItem = {
  id: string;
  dutch: string;
  article?: "de" | "het";
  english: string;
  notes: string;
  cefr: Cefr;
  freq_band: "core" | "common" | "useful" | "rare";
  heard_at: number;
  lemma: string;
};

export type GrammarPoint = {
  id: string;
  rule: RuleId;
  name: string;
  span: string;
  start: number;
  explanation: string;
  pattern: string;
  another_example: string;
  another_translation: string;
  watch_out: string;
  in_clip_count: number;
  detection_id: string;
};

export type Chunk = {
  id: string;
  phrase: string;
  literal: string;
  meaning: string;
  type: "idiom" | "collocation" | "discourse_marker" | "formula" | "particle";
  when: string;
  span: string;
};

export type ListeningInsight = {
  id: string;
  surface: string;
  citation: string;
  note: string;
  start: number;
  kind: "reduction" | "clitic" | "assimilation" | "repair" | "phoneme";
};

export type CultureNote = {
  id: string;
  text: string;
};

export type ExerciseKind =
  | "dictation"
  | "gapfill"
  | "reduction"
  | "comprehension"
  | "repeat"
  | "shadow"
  | "wordorder"
  | "transform";

export type Exercise = {
  id: string;
  skill: "listening" | "speaking" | "language";
  kind: ExerciseKind;
  prompt: string;
  target: string;
  options?: string[];
  answer: string | string[];
  hint?: string;
  span_start?: number;
  rule?: RuleId;
  must_use?: string[];
};

export type LessonCardSeed = {
  id: string;
  kind: "word" | "chunk" | "grammar" | "pronunciation" | "clip";
  front: string;
  back: string;
  audio_start?: number;
  audio_end?: number;
};

export type Detection = {
  id: string;
  type: RuleId | "chunk" | "vocab" | "disfluency";
  span: string;
  start: number;
  evidence: string;
  confidence: number;
  canonical?: string;
  count: number;
};

export type ValidatorReport = {
  span: "pass" | "fail";
  detection: "pass" | "fail";
  lexicon: "pass" | "fail";
  gloss: "pass" | "fail";
  answer_key: "pass" | "fail";
  level: "pass" | "fail";
  attribution: "pass" | "fail";
  dropped_items: number;
  notes: string[];
};

export type Lesson = {
  lesson_id: string;
  title: string;
  description: string;
  setting: Setting;
  packs: string[];
  cefr: Cefr;
  duration_s: number;
  speakers: Speaker[];
  speech_rate_wpm: number;
  processing_region: "eu-west" | "device" | "us";
  source_type: "shelf" | "import";
  region_label: string;
  register: "informal" | "formal" | "mixed";
  provenance: Provenance;
  licence: Licence;
  media_id?: string;
  orientation: { blurb: string; gist: string };
  segments: Segment[];
  vocabulary: VocabItem[];
  grammar: GrammarPoint[];
  chunks: Chunk[];
  listening_insights: ListeningInsight[];
  culture: CultureNote[];
  exercises: Exercise[];
  cards: LessonCardSeed[];
  difficulty: {
    speech_rate_wpm: number;
    above_level_token_share: number;
    reduction_density: number;
    disfluency_rate: number;
    overlap_ratio: number;
  };
  generation?: {
    model_version: string;
    detection_ids: string[];
    validator_report: ValidatorReport;
  };
};

export type ResidencyPref = "device" | "eu" | "fastest";

export type LearnerProfile = {
  cefr: Cefr;
  goal: "listening" | "speaking" | "both";
  daily_minutes: number;
  residency: ResidencyPref;
  dyslexia_font: boolean;
  onboarded: boolean;
  default_rate: number;
};

export type StoredCard = {
  id: string;
  lesson_id: string;
  seed: LessonCardSeed;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
  learning_steps: number;
};

export type Attempt = {
  id: string;
  target_id: string;
  kind: "card" | "exercise";
  ts: string;
  correct: boolean;
  score?: number;
  rule?: RuleId;
  latency_ms: number;
};

export type LessonProgress = {
  lesson_id: string;
  started_at: string;
  last_at: string;
  completed_exercises: string[];
  known_vocab: string[];
  dropped_vocab: string[];
  dropped_grammar: string[];
  percent: number;
  glosses: Record<string, string>;
  flags: string[];
};
