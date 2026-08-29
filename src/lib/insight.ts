import { SHELF } from "@/data/lessons";
import type { Attempt, Cefr, LearnerProfile, Lesson, RuleId, StoredCard } from "./types";
import { lessonById, weakPointsOf } from "./store";

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function minutesFromAttempts(attempts: Attempt[], day = dayKey()): number {
  const ms = attempts
    .filter((a) => a.ts.slice(0, 10) === day)
    .reduce((n, a) => n + Math.max(a.latency_ms, 20_000), 0);
  return Math.round(ms / 60_000);
}

export function streakOf(attempts: Attempt[]): number {
  if (!attempts.length) return 0;
  const days = new Set(attempts.map((a) => a.ts.slice(0, 10)));
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export function listeningIndex(attempts: Attempt[]): number | null {
  const list = attempts.filter((a) => a.kind === "exercise" && (a.skill === "listening" || !a.skill));
  const focused = attempts.filter((a) => a.skill === "listening");
  const use = focused.length >= 4 ? focused : list;
  if (use.length < 4) return null;
  return Math.round((100 * use.filter((a) => a.correct).length) / use.length);
}

export function speakingScore(attempts: Attempt[]): number | null {
  const list = attempts.filter((a) => a.kind === "exercise" && typeof a.score === "number");
  if (list.length < 3) return null;
  return Math.round(list.reduce((n, a) => n + (a.score ?? 0), 0) / list.length);
}

export function cardsKnown(cards: StoredCard[]): number {
  return cards.filter((c) => c.reps > 0 && c.state >= 2).length;
}

export function suggestLesson(
  imported: Lesson[],
  profile: LearnerProfile,
  attempts: Attempt[],
): Lesson {
  const weak = weakPointsOf(attempts)[0];
  const pool = [...SHELF, ...imported.filter((l) => l.source_type === "shelf")];
  if (weak && weak.n >= 2 && weak.accuracy < 0.75) {
    const byRule = pool.find(
      (l) => l.cefr === profile.cefr && l.grammar.some((g) => g.rule === weak.rule),
    );
    if (byRule) return byRule;
    const any = pool.find((l) => l.grammar.some((g) => g.rule === weak.rule));
    if (any) return any;
  }
  return pool.find((l) => l.cefr === profile.cefr) ?? SHELF[0]!;
}

export function lessonTitle(imported: Lesson[], id: string): string {
  return lessonById(imported, id)?.title ?? id;
}

export function weakSentence(weak: { rule: RuleId; accuracy: number; n: number } | undefined): string | null {
  if (!weak || weak.n < 2) return null;
  const pct = Math.round((1 - weak.accuracy) * 100);
  return `You miss this ${pct}% of the time across ${weak.n} tries.`;
}

export function lessonsForRule(rule: RuleId, imported: Lesson[]): Lesson[] {
  const seen = new Set<string>();
  const all = [...imported, ...SHELF];
  return all.filter((l) => {
    if (seen.has(l.lesson_id)) return false;
    seen.add(l.lesson_id);
    return l.grammar.some((g) => g.rule === rule);
  });
}

export function knownByBand(imported: Lesson[], cards: StoredCard[]): { cefr: Cefr; n: number }[] {
  const counts: Record<Cefr, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
  for (const c of cards) {
    if (c.reps === 0 || c.state < 2 || c.seed.kind !== "word") continue;
    const lesson = lessonById(imported, c.lesson_id);
    const vocab = lesson?.vocabulary.find(
      (v) => v.dutch === c.seed.front || c.id.endsWith(`-${v.id}`),
    );
    const band = vocab?.cefr ?? "A2";
    counts[band] += 1;
  }
  return (["A1", "A2", "B1", "B2"] as Cefr[]).map((cefr) => ({ cefr, n: counts[cefr] }));
}
