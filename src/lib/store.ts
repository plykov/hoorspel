import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Attempt,
  Cefr,
  LearnerProfile,
  Lesson,
  LessonProgress,
  ResidencyPref,
  RuleId,
  StoredCard,
} from "./types";
import { SHELF } from "@/data/lessons";
import { newStoredCard, reviewCard } from "./fsrs";
import { clearAllMedia } from "./media";
import type { Grade } from "ts-fsrs";

const defaultProfile: LearnerProfile = {
  cefr: "A2",
  goal: "both",
  daily_minutes: 10,
  residency: "eu",
  dyslexia_font: false,
  onboarded: false,
  default_rate: 0.92,
};

export function emptyProgress(lessonId: string, prev?: LessonProgress): LessonProgress {
  return {
    lesson_id: lessonId,
    started_at: prev?.started_at ?? new Date().toISOString(),
    last_at: prev?.last_at ?? new Date().toISOString(),
    completed_exercises: prev?.completed_exercises ?? [],
    known_vocab: prev?.known_vocab ?? [],
    dropped_vocab: prev?.dropped_vocab ?? [],
    dropped_grammar: prev?.dropped_grammar ?? [],
    percent: prev?.percent ?? 0,
    glosses: prev?.glosses ?? {},
    flags: prev?.flags ?? [],
  };
}

type State = {
  profile: LearnerProfile;
  imported: Lesson[];
  cards: StoredCard[];
  attempts: Attempt[];
  progress: Record<string, LessonProgress>;
  bookmarks: string[];
  dark: boolean;
  setProfile: (p: Partial<LearnerProfile>) => void;
  completeOnboarding: (p: Partial<LearnerProfile>) => void;
  saveImport: (lesson: Lesson) => void;
  enqueueLesson: (lesson: Lesson) => void;
  review: (cardId: string, grade: Grade) => void;
  logAttempt: (a: Omit<Attempt, "id" | "ts">) => void;
  markProgress: (lessonId: string, patch: Partial<LessonProgress>) => void;
  toggleTriage: (
    lessonId: string,
    key: "known_vocab" | "dropped_vocab" | "dropped_grammar",
    id: string,
  ) => void;
  toggleBookmark: (id: string) => void;
  setGloss: (lessonId: string, vocabId: string, text: string) => void;
  toggleFlag: (lessonId: string, id: string) => void;
  toggleDark: () => void;
  resetAll: () => void;
  exportData: () => string;
};

export function dueCardsOf(cards: StoredCard[]): StoredCard[] {
  const now = Date.now();
  return cards
    .filter((c) => new Date(c.due).getTime() <= now)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

export function lessonById(imported: Lesson[], id: string): Lesson | undefined {
  return imported.find((l) => l.lesson_id === id) ?? SHELF.find((l) => l.lesson_id === id);
}

export function weakPointsOf(attempts: Attempt[]): { rule: RuleId; accuracy: number; n: number }[] {
  const by: Record<string, { ok: number; n: number }> = {};
  for (const a of attempts) {
    if (!a.rule) continue;
    by[a.rule] ??= { ok: 0, n: 0 };
    by[a.rule].n += 1;
    if (a.correct) by[a.rule].ok += 1;
  }
  return (Object.entries(by) as [RuleId, { ok: number; n: number }][])
    .map(([rule, v]) => ({ rule, accuracy: v.n ? v.ok / v.n : 1, n: v.n }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export const useHoorspel = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      imported: [],
      cards: [],
      attempts: [],
      progress: {},
      bookmarks: [],
      dark: false,
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      completeOnboarding: (p) =>
        set({ profile: { ...get().profile, ...p, onboarded: true } }),
      saveImport: (lesson) =>
        set({ imported: [lesson, ...get().imported.filter((l) => l.lesson_id !== lesson.lesson_id)] }),
      enqueueLesson: (lesson) => {
        const dropped = new Set(get().progress[lesson.lesson_id]?.dropped_vocab ?? []);
        const droppedG = new Set(get().progress[lesson.lesson_id]?.dropped_grammar ?? []);
        const existing = new Set(get().cards.map((c) => c.id));
        const fresh = lesson.cards
          .filter((s) => !existing.has(s.id))
          .filter((s) => {
            if (s.kind === "word" && dropped.size) {
              const v = lesson.vocabulary.find(
                (item) =>
                  item.dutch.toLowerCase() === s.front.toLowerCase() ||
                  s.id.endsWith(`-${item.id}`) ||
                  s.front.toLowerCase().endsWith(item.lemma.toLowerCase()),
              );
              if (v && dropped.has(v.id)) return false;
            }
            if (s.kind === "grammar" && droppedG.size) {
              if ([...droppedG].some((id) => s.id.includes(id) || s.front.includes(id))) return false;
            }
            return true;
          })
          .map((s) => newStoredCard(lesson.lesson_id, s));
        const prev = get().progress[lesson.lesson_id];
        set({
          cards: [...get().cards, ...fresh],
          progress: {
            ...get().progress,
            [lesson.lesson_id]: {
              ...emptyProgress(lesson.lesson_id, prev),
              last_at: new Date().toISOString(),
              percent: prev?.percent ?? 8,
            },
          },
        });
      },
      review: (cardId, grade) => {
        const cards = get().cards.map((c) => (c.id === cardId ? reviewCard(c, grade) : c));
        set({ cards });
      },
      logAttempt: (a) =>
        set({
          attempts: [
            ...get().attempts.slice(-400),
            {
              ...a,
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ts: new Date().toISOString(),
            },
          ],
        }),
      markProgress: (lessonId, patch) => {
        const prev = emptyProgress(lessonId, get().progress[lessonId]);
        set({
          progress: {
            ...get().progress,
            [lessonId]: { ...prev, ...patch, last_at: new Date().toISOString() },
          },
        });
      },
      toggleTriage: (lessonId, key, id) => {
        const prev = emptyProgress(lessonId, get().progress[lessonId]);
        const list = prev[key];
        const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        let cards = get().cards;
        const lesson = lessonById(get().imported, lessonId);
        if (key === "dropped_vocab" && next.includes(id) && lesson) {
          const vocab = lesson.vocabulary.find((v) => v.id === id);
          if (vocab) {
            cards = cards.filter((c) => {
              if (c.lesson_id !== lessonId || c.reps > 0 || c.seed.kind !== "word") return true;
              const front = c.seed.front.toLowerCase();
              const match =
                front === vocab.dutch.toLowerCase() ||
                front.endsWith(vocab.lemma.toLowerCase()) ||
                c.id.endsWith(`-${vocab.id}`) ||
                c.seed.id.endsWith(vocab.id);
              return !match;
            });
          }
        }
        if (key === "dropped_grammar" && next.includes(id)) {
          cards = cards.filter((c) => {
            if (c.lesson_id !== lessonId || c.reps > 0 || c.seed.kind !== "grammar") return true;
            return !c.id.includes(id) && c.seed.id !== id;
          });
        }
        set({
          cards,
          progress: {
            ...get().progress,
            [lessonId]: { ...prev, [key]: next, last_at: new Date().toISOString() },
          },
        });
      },
      toggleBookmark: (id) => {
        const has = get().bookmarks.includes(id);
        set({ bookmarks: has ? get().bookmarks.filter((x) => x !== id) : [...get().bookmarks, id] });
      },
      setGloss: (lessonId, vocabId, text) => {
        const prev = emptyProgress(lessonId, get().progress[lessonId]);
        set({
          progress: {
            ...get().progress,
            [lessonId]: {
              ...prev,
              glosses: { ...prev.glosses, [vocabId]: text },
              last_at: new Date().toISOString(),
            },
          },
        });
      },
      toggleFlag: (lessonId, id) => {
        const prev = emptyProgress(lessonId, get().progress[lessonId]);
        const flags = prev.flags.includes(id)
          ? prev.flags.filter((x) => x !== id)
          : [...prev.flags, id];
        set({
          progress: {
            ...get().progress,
            [lessonId]: { ...prev, flags, last_at: new Date().toISOString() },
          },
        });
      },
      toggleDark: () => set({ dark: !get().dark }),
      resetAll: () => {
        void clearAllMedia();
        set({
          profile: defaultProfile,
          imported: [],
          cards: [],
          attempts: [],
          progress: {},
          bookmarks: [],
        });
      },
      exportData: () =>
        JSON.stringify(
          {
            profile: get().profile,
            imported: get().imported,
            cards: get().cards,
            attempts: get().attempts,
            progress: get().progress,
          },
          null,
          2,
        ),
    }),
    { name: "hoorspel-v1" },
  ),
);

export function cefrRank(c: Cefr): number {
  return { A1: 1, A2: 2, B1: 3, B2: 4 }[c];
}

export const RESIDENCY_COPY: Record<ResidencyPref, { title: string; body: string }> = {
  device: {
    title: "On this device",
    body: "Audio never leaves the phone. You type or edit the transcript yourself. Slower, more private.",
  },
  eu: {
    title: "In Europe",
    body: "Preferred for a Dutch product. Lesson writing may still use the app’s language model; recordings stay local in this version.",
  },
  fastest: {
    title: "Fastest available",
    body: "Use whichever recogniser answers first. May leave the EU.",
  },
};
