import { createEmptyCard, fsrs, Rating, type Card as FsrsCard, type Grade } from "ts-fsrs";
import type { LessonCardSeed, StoredCard } from "./types";

const scheduler = fsrs();

function toFsrs(card: StoredCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
    learning_steps: card.learning_steps,
  } as FsrsCard;
}

function fromFsrs(seed: LessonCardSeed, lessonId: string, card: FsrsCard, id: string): StoredCard {
  return {
    id,
    lesson_id: lessonId,
    seed,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as unknown as number,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
    learning_steps: card.learning_steps,
  };
}

export function newStoredCard(lessonId: string, seed: LessonCardSeed): StoredCard {
  const empty = createEmptyCard(new Date());
  return fromFsrs(seed, lessonId, empty, seed.id);
}

export function reviewCard(card: StoredCard, rating: Grade, now = new Date()): StoredCard {
  const scheduling = scheduler.repeat(toFsrs(card), now);
  const next = scheduling[rating].card;
  return fromFsrs(card.seed, card.lesson_id, next, card.id);
}

export function previewIntervals(card: StoredCard, now = new Date()) {
  const scheduling = scheduler.repeat(toFsrs(card), now);
  const label = (g: Grade) => {
    const due = scheduling[g].card.due.getTime() - now.getTime();
    const minutes = Math.max(1, Math.round(due / 60000));
    if (minutes < 60) return `<${minutes} min`;
    const days = Math.round(minutes / 1440) || Math.round(minutes / 60) / 24;
    if (minutes < 1440) return `${Math.max(1, Math.round(minutes / 60))} h`;
    return `${Math.max(1, Math.round(days))} d`;
  };
  return {
    again: label(Rating.Again),
    hard: label(Rating.Hard),
    good: label(Rating.Good),
    easy: label(Rating.Easy),
  };
}

export { Rating };
