import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mic, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RULE_NAMES } from "@/lib/grammar";
import { minutesFromAttempts, streakOf, suggestLesson, weakSentence } from "@/lib/insight";
import { dueCardsOf, lessonById, useHoorspel, weakPointsOf } from "@/lib/store";
import { cn, formatDuration } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const cards = useHoorspel((s) => s.cards);
  const imported = useHoorspel((s) => s.imported);
  const progress = useHoorspel((s) => s.progress);
  const attempts = useHoorspel((s) => s.attempts);
  const profile = useHoorspel((s) => s.profile);
  const due = dueCardsOf(cards);
  const weak = weakPointsOf(attempts);
  const todayMin = minutesFromAttempts(attempts);
  const streak = streakOf(attempts);
  const goal = profile.daily_minutes || 10;
  const pct = Math.min(100, Math.round((todayMin / goal) * 100));

  const continueId = Object.values(progress).sort((a, b) => (a.last_at < b.last_at ? 1 : -1))[0]
    ?.lesson_id;
  const cont = continueId ? lessonById(imported, continueId) : undefined;
  const suggestion = suggestLesson(imported, profile, attempts);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Everyday spoken Dutch
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Listen first. Then notice.</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Short authentic dialogues. Grammar English speakers actually miss. The original audio stays
          on every card.
        </p>
      </header>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today</p>
            <p className="mt-1 font-display text-2xl tabular">
              {todayMin}
              <span className="text-base font-sans text-muted-foreground"> / {goal} min</span>
            </p>
          </div>
          <p className="text-sm tabular text-muted-foreground">
            {streak ? `${streak}-day streak` : "No streak yet"}
            {due.length ? ` · ${due.length} due` : ""}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-primary", pct === 0 && "w-0")}
            style={pct ? { width: `${pct}%` } : undefined}
          />
        </div>
        <Button asChild>
          {due.length ? (
            <Link to="/review">Start today’s mix</Link>
          ) : (
            <Link to="/lesson/$id" params={{ id: suggestion.lesson_id }}>
              Open a clip for today
            </Link>
          )}
        </Button>
      </Card>

      {cont ? (
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Continue
          </p>
          <Link to="/lesson/$id" params={{ id: cont.lesson_id }} className="block">
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-xl">{cont.title}</p>
                <p className="text-sm text-muted-foreground">
                  {cont.cefr} · {formatDuration(cont.duration_s)} · {progress[cont.lesson_id]?.percent ?? 0}%
                </p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        </section>
      ) : null}

      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          New lesson from
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/shelf" className="block">
            <Card className="flex h-28 flex-col justify-between p-4">
              <Sparkles className="size-5 text-primary" />
              <p className="font-medium">Find a clip</p>
            </Card>
          </Link>
          <Link to="/import" className="block">
            <Card className="flex h-28 flex-col justify-between p-4">
              <Upload className="size-5 text-primary" />
              <p className="font-medium">Import or record</p>
            </Card>
          </Link>
        </div>
      </section>

      {weak[0] && weak[0].n >= 2 && weak[0].accuracy < 0.7 ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This week you are missing</p>
          <p className="mt-1 font-display text-xl">{RULE_NAMES[weak[0].rule]}</p>
          <p className="text-sm tabular text-muted-foreground">{weakSentence(weak[0])}</p>
          <Button asChild variant="secondary" className="mt-3">
            <Link to="/shelf" search={{ rule: weak[0].rule }}>
              Practise that
            </Link>
          </Button>
        </Card>
      ) : suggestion ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Badge tone="primary">{suggestion.cefr}</Badge>
            <span className="text-xs text-muted-foreground">Matched to your level</span>
          </div>
          <p className="mt-2 font-display text-xl">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          <Button asChild variant="secondary" className="mt-3">
            <Link to="/clip/$id" params={{ id: suggestion.lesson_id }}>
              Surprise me
            </Link>
          </Button>
        </Card>
      ) : null}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mic className="size-3.5" />
        Playback uses the original clip when you imported one, otherwise your device’s Dutch voice.
      </p>
    </div>
  );
}
