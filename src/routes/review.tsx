import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PlayButton } from "@/components/player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rating, previewIntervals } from "@/lib/fsrs";
import type { Grade } from "ts-fsrs";
import { dueCardsOf, lessonById, useHoorspel } from "@/lib/store";
import { useMediaUrl } from "@/lib/media";
import { formatTime } from "@/lib/utils";

export const Route = createFileRoute("/review")({ component: ReviewPage });

function ReviewPage() {
  const cards = useHoorspel((s) => s.cards);
  const imported = useHoorspel((s) => s.imported);
  const review = useHoorspel((s) => s.review);
  const log = useHoorspel((s) => s.logAttempt);
  const due = dueCardsOf(cards);
  const [flipped, setFlipped] = useState(false);
  const started = useRef(Date.now());
  const card = due[0];
  const lesson = card ? lessonById(imported, card.lesson_id) : undefined;
  const src = useMediaUrl(lesson?.media_id);
  const intervals = useMemo(() => (card ? previewIntervals(card) : null), [card]);

  if (!due.length || !card) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl">Queue clear</h1>
        <p className="text-muted-foreground">
          Nothing is due. Pick a clip and the cards will wait with their audio.
        </p>
        <Button asChild>
          <Link to="/shelf">Find a clip</Link>
        </Button>
      </div>
    );
  }

  function grade(g: Grade) {
    review(card.id, g);
    log({
      target_id: card.id,
      kind: "card",
      correct: g >= Rating.Good,
      latency_ms: Math.max(400, Date.now() - started.current),
    });
    started.current = Date.now();
    setFlipped(false);
  }

  const audioFirst = card.seed.kind === "clip" || card.seed.kind === "pronunciation";
  const playStart = card.seed.audio_start ?? 0;
  const playEnd = card.seed.audio_end ?? (card.seed.kind === "clip" ? lesson?.duration_s : playStart + 4);
  const playText =
    lesson?.segments.find((s) => s.start >= playStart)?.text ??
    lesson?.segments[0]?.text ??
    card.seed.front;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Review · {due.length} due
      </p>
      <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.seed.kind}</p>
        <p className="font-display text-3xl">
          {audioFirst && !flipped
            ? card.seed.kind === "clip"
              ? "Listen to the clip"
              : "Listen, then say it"
            : card.seed.front}
        </p>
        {lesson ? (
          <PlayButton
            text={playText}
            src={src}
            start={playStart}
            end={playEnd}
            label={audioFirst && !flipped ? "Hear it" : "Hear it in context"}
          />
        ) : (
          <PlayButton text={card.seed.front} src={src} label="Hear it" />
        )}
        {lesson ? (
          <p className="text-xs text-muted-foreground">
            {lesson.title}
            {card.seed.audio_start != null ? ` · ${formatTime(card.seed.audio_start)}` : ""}
          </p>
        ) : null}
        {flipped ? (
          <p className="max-w-prose text-muted-foreground">{card.seed.back}</p>
        ) : (
          <Button variant="secondary" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        )}
      </Card>
      {flipped && intervals ? (
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              [Rating.Again, "Again", intervals.again],
              [Rating.Hard, "Hard", intervals.hard],
              [Rating.Good, "Good", intervals.good],
              [Rating.Easy, "Easy", intervals.easy],
            ] as const
          ).map(([g, label, when]) => (
            <button
              key={label}
              type="button"
              onClick={() => grade(g)}
              className="flex min-h-16 flex-col items-center justify-center rounded-[var(--radius-md)] bg-card px-1 text-sm shadow-[var(--shadow-border)]"
            >
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground tabular">{when}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
