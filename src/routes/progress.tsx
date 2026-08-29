import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { RULE_NAMES } from "@/lib/grammar";
import {
  cardsKnown,
  knownByBand,
  lessonTitle,
  lessonsForRule,
  listeningIndex,
  minutesFromAttempts,
  speakingScore,
  streakOf,
  weakSentence,
} from "@/lib/insight";
import { dueCardsOf, useHoorspel, weakPointsOf } from "@/lib/store";

export const Route = createFileRoute("/progress")({ component: ProgressPage });

function ProgressPage() {
  const attempts = useHoorspel((s) => s.attempts);
  const cards = useHoorspel((s) => s.cards);
  const progress = useHoorspel((s) => s.progress);
  const imported = useHoorspel((s) => s.imported);
  const weak = weakPointsOf(attempts);
  const profile = useHoorspel((s) => s.profile);
  const due = dueCardsOf(cards);

  const correct = attempts.filter((a) => a.correct).length;
  const known = cardsKnown(cards);
  const listen = listeningIndex(attempts);
  const speak = speakingScore(attempts);
  const today = minutesFromAttempts(attempts);
  const streak = streakOf(attempts);
  const bands = knownByBand(imported, cards);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl">Progress</h1>
      <p className="text-sm text-muted-foreground">
        Measured from attempts, not from an invented radar. Level estimate {profile.cefr}. Goal{" "}
        {profile.daily_minutes} minutes a day.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={`${today}m`} />
        <Stat label="Streak" value={streak ? `${streak}d` : "—"} />
        <Stat label="Due" value={due.length} />
        <Stat label="Cards known" value={known} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Correct"
          value={attempts.length ? `${Math.round((correct / attempts.length) * 100)}%` : "—"}
        />
        <Stat label="Listening index" value={listen == null ? "Need 4 tries" : `${listen}`} />
        <Stat label="Speaking" value={speak == null ? "Need 3 tries" : `${speak}`} />
      </div>

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Words known by level
        </p>
        <ul className="mt-3 grid grid-cols-4 gap-2 text-center">
          {bands.map((b) => (
            <li key={b.cefr}>
              <p className="font-display text-2xl tabular">{b.n}</p>
              <p className="text-xs text-muted-foreground">{b.cefr}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Weak points (G1–G12)
        </p>
        {weak.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Practise a lesson to see a signal.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {weak.map((w) => {
              const recs = lessonsForRule(w.rule, imported).slice(0, 2);
              return (
                <li key={w.rule}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Link
                      to="/shelf"
                      search={{ rule: w.rule }}
                      className="hover:text-primary"
                    >
                      {w.rule} · {RULE_NAMES[w.rule]}
                    </Link>
                    <span className="tabular text-muted-foreground">
                      {Math.round(w.accuracy * 100)}% · {w.n}
                    </span>
                  </div>
                  {w === weak[0] && weakSentence(w) ? (
                    <p className="mt-1 text-sm text-muted-foreground">{weakSentence(w)}</p>
                  ) : null}
                  {recs.length ? (
                    <p className="mt-1 text-sm">
                      {recs.map((l, i) => (
                        <span key={l.lesson_id}>
                          {i > 0 ? " · " : null}
                          <Link to="/lesson/$id" params={{ id: l.lesson_id }} className="hover:text-primary">
                            {l.title}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lessons started</p>
        <ul className="mt-2 space-y-2">
          {Object.values(progress).map((p) => (
            <li key={p.lesson_id}>
              <Link to="/lesson/$id" params={{ id: p.lesson_id }} className="text-sm hover:text-primary">
                {lessonTitle(imported, p.lesson_id)} · {p.percent}%
              </Link>
            </li>
          ))}
          {Object.keys(progress).length === 0 ? (
            <li className="text-sm text-muted-foreground">None yet.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl tabular">{value}</p>
    </Card>
  );
}
