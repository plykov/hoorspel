import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Attribution } from "@/components/attribution";
import { PlayButton, RateToggle } from "@/components/player";
import { Transcript } from "@/components/transcript";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RULE_NAMES } from "@/lib/grammar";
import { canShareLesson, downloadLesson, shareLesson } from "@/lib/export-lesson";
import { useMediaUrl } from "@/lib/media";
import { emptyProgress, lessonById, useHoorspel } from "@/lib/store";
import { cn, formatDuration } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/lesson/$id")({ component: LessonPage });

const TABS = ["Listen", "Words", "Grammar", "Chunks", "Heard it?", "Practise"] as const;

function LessonPage() {
  const { id } = Route.useParams();
  const imported = useHoorspel((s) => s.imported);
  const lesson = lessonById(imported, id);
  const enqueue = useHoorspel((s) => s.enqueueLesson);
  const mark = useHoorspel((s) => s.markProgress);
  const triage = useHoorspel((s) => s.toggleTriage);
  const save = useHoorspel((s) => s.saveImport);
  const setGloss = useHoorspel((s) => s.setGloss);
  const flag = useHoorspel((s) => s.toggleFlag);
  const rawProgress = useHoorspel((s) => s.progress[id]);
  const profile = useHoorspel((s) => s.profile);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Listen");
  const [rate, setRate] = useState(profile.default_rate);
  const [span, setSpan] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const src = useMediaUrl(lesson?.media_id);

  useEffect(() => {
    if (lesson) enqueue(lesson);
  }, [lesson, enqueue]);

  if (!lesson) {
    return (
      <div>
        <h1 className="font-display text-2xl">Lesson not found</h1>
        <Link to="/shelf" className="text-primary">
          Back to the shelf
        </Link>
      </div>
    );
  }

  const progress = emptyProgress(id, rawProgress);
  const droppedV = new Set(progress.dropped_vocab);
  const knownV = new Set(progress.known_vocab);
  const droppedG = new Set(progress.dropped_grammar);
  const flagged = new Set(progress.flags);
  const fullText = lesson.segments.map((s) => s.text).join(". ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/shelf" className="text-sm text-muted-foreground hover:text-foreground">
            ← Clips
          </Link>
          <h1 className="mt-1 font-display text-3xl">{lesson.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lesson.cefr} · {formatDuration(lesson.duration_s)} · {progress?.percent ?? 0}%
          </p>
        </div>
        <RateToggle value={rate} onChange={setRate} />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-10 shrink-0 rounded-full px-3.5 text-sm font-medium",
                tab === t ? "bg-foreground text-background" : "bg-muted text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Listen" ? (
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Before you listen
            </p>
            <p className="mt-2">{lesson.orientation.blurb}</p>
            <p className="mt-2 text-sm text-muted-foreground">{lesson.orientation.gist}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PlayButton text={fullText} src={src} start={0} end={lesson.duration_s} rate={rate} label="Full clip" />
              <PlayButton text={fullText} src={src} start={0} end={lesson.duration_s} rate={0.75} label="Slow" />
              <Button
                type="button"
                variant={editing ? "primary" : "secondary"}
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Done correcting" : "Correct transcript"}
              </Button>
            </div>
          </Card>
          <Transcript
            lesson={lesson}
            rate={rate}
            highlightSpan={span}
            src={src}
            editing={editing}
            onPatch={(next) => save({ ...lesson, ...next })}
          />
        </div>
      ) : null}

      {tab === "Words" ? (
        <ul className="flex flex-col gap-3">
          {lesson.vocabulary.map((v) => (
            <li key={v.id}>
              <Card className={cn("p-4", droppedV.has(v.id) && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl" lang="nl">{v.dutch}</p>
                    <p className="text-sm">{v.english}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>
                    <label className="mt-2 block">
                      <span className="sr-only">Personal gloss</span>
                      <input
                        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm"
                        defaultValue={progress.glosses[v.id] ?? ""}
                        placeholder="Your gloss (stays on this device)"
                        onBlur={(e) => setGloss(lesson.lesson_id, v.id, e.target.value.trim())}
                      />
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.cefr} · {v.freq_band}
                      {v.article ? ` · always ${v.article}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => triage(lesson.lesson_id, "known_vocab", v.id)}
                        className={cn(
                          "h-11 rounded-[var(--radius-md)] px-3 text-sm",
                          knownV.has(v.id) ? "bg-good/15 text-good" : "bg-muted",
                        )}
                      >
                        {knownV.has(v.id) ? "Marked known" : "I know this"}
                      </button>
                      <button
                        type="button"
                        onClick={() => triage(lesson.lesson_id, "dropped_vocab", v.id)}
                        className={cn(
                          "h-11 rounded-[var(--radius-md)] px-3 text-sm",
                          droppedV.has(v.id) ? "bg-destructive/10 text-destructive" : "bg-muted",
                        )}
                      >
                        {droppedV.has(v.id) ? "Dropped · restore" : "Drop"}
                      </button>
                    </div>
                  </div>
                  <PlayButton text={v.dutch.replace(/^(de|het)\s+/i, "")} rate={rate} label="" className="size-11 px-0" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Grammar" ? (
        <ul className="flex flex-col gap-4">
          {lesson.grammar.map((g) => (
            <li key={g.id}>
              <Card className={cn("p-4", droppedG.has(g.rule) && "opacity-60")}>
                <Badge tone="primary">{g.rule}</Badge>
                <h2 className="mt-2 font-display text-2xl">{g.name}</h2>
                <button
                  type="button"
                  className="mt-2 text-left font-display text-lg text-primary"
                  onClick={() => {
                    setSpan(g.span);
                    setTab("Listen");
                  }}
                >
                  “<span lang="nl">{g.span}</span>”
                </button>
                <p className="mt-3 text-sm leading-relaxed">{g.explanation}</p>
                <p className="mt-3 font-mono text-xs text-muted-foreground">{g.pattern}</p>
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Another example. </span>
                  {g.another_example} — {g.another_translation}
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Watch out. </span>
                  {g.watch_out}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Heard {g.in_clip_count}× in this clip</p>
                <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => triage(lesson.lesson_id, "dropped_grammar", g.rule)}
                  className={cn(
                    "h-11 rounded-[var(--radius-md)] px-3 text-sm",
                    droppedG.has(g.rule) ? "bg-destructive/10 text-destructive" : "bg-muted",
                  )}
                >
                  {droppedG.has(g.rule) ? "Dropped from practice · restore" : "Drop from practice"}
                </button>
                <button
                  type="button"
                  onClick={() => flag(lesson.lesson_id, g.id)}
                  className={cn(
                    "h-11 rounded-[var(--radius-md)] px-3 text-sm",
                    flagged.has(g.id) ? "bg-warn/15 text-warn" : "bg-muted",
                  )}
                >
                  {flagged.has(g.id) ? "Flagged · undo" : "This looks wrong"}
                </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Chunks" ? (
        <ul className="flex flex-col gap-3">
          {lesson.chunks.map((c) => (
            <li key={c.id}>
              <Card className="p-4">
                <Badge>{c.type.replace("_", " ")}</Badge>
                <p className="mt-2 font-display text-xl" lang="nl">{c.phrase}</p>
                {c.literal ? (
                  <p className="text-xs text-muted-foreground">Literal: {c.literal}</p>
                ) : null}
                <p className="mt-1">{c.meaning}</p>
                <p className="mt-2 text-sm text-muted-foreground">{c.when}</p>
                <PlayButton className="mt-3" text={c.phrase} rate={rate} label="Hear it" />
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Heard it?" ? (
        <ul className="flex flex-col gap-3">
          {lesson.listening_insights.map((l) => (
            <li key={l.id}>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{l.kind}</p>
                <p className="mt-1 font-display text-xl">
                  {l.surface} <span className="text-muted-foreground">←</span> {l.citation}
                </p>
                <p className="mt-2 text-sm">{l.note}</p>
                <PlayButton className="mt-3" text={l.citation} rate={0.75} label="Slow" />
              </Card>
            </li>
          ))}
          {lesson.culture.map((c) => (
            <li key={c.id}>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Culture</p>
                <p className="mt-2 text-sm leading-relaxed">{c.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Practise" ? (
        <Card className="p-5">
          <p className="font-display text-2xl">
            {lesson.exercises.filter((e) => !e.rule || !droppedG.has(e.rule)).length} exercises
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dictation, gap-fill, shadowing, role-play, word order. Weak grammar floats to the front.
            Cards join your review queue. Dropped words and grammar stay out.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {lesson.exercises
              .filter((e) => !e.rule || !droppedG.has(e.rule))
              .map((e) => (
              <li key={e.id}>
                {e.kind} · {e.skill}
                {e.rule ? ` · ${RULE_NAMES[e.rule]}` : ""}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link
              to="/practice/$id"
              params={{ id: lesson.lesson_id }}
              onClick={() => mark(lesson.lesson_id, { percent: Math.max(progress?.percent ?? 0, 40) })}
            >
              Start practice
            </Link>
          </Button>
        </Card>
      ) : null}

      <Attribution lesson={lesson} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            downloadLesson(lesson);
            toast.success(
              lesson.source_type === "import"
                ? "Saved for you. Private imports stay off any share path."
                : "Lesson saved with its attribution pack.",
            );
          }}
        >
          Save offline
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void shareLesson(lesson).then((r) => {
              if (r === "blocked") toast.error("This clip cannot be shared — licence or private import.");
              else if (r === "copied") toast.success("Attribution copied.");
              else toast.success("Shared with the attribution pack.");
            });
          }}
          disabled={!canShareLesson(lesson)}
        >
          Share
        </Button>
      </div>
    </div>
  );
}
