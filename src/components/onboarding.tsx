import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./logo";
import type { Cefr } from "@/lib/types";
import { useHoorspel } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Onboarding() {
  const complete = useHoorspel((s) => s.completeOnboarding);
  const [cefr, setCefr] = useState<Cefr>("A2");
  const [goal, setGoal] = useState<"listening" | "speaking" | "both">("both");
  const [mins, setMins] = useState(10);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        className="w-full max-w-md rounded-[var(--radius-xl)] bg-background p-6 shadow-[var(--shadow-border)]"
      >
        <Wordmark />
        <h1 id="onboard-title" className="mt-5 font-display text-3xl tracking-[-0.03em]">
          Hear real Dutch, then speak it.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Short clips, grammar the textbooks skip, a review queue that keeps the original audio.
        </p>

        <p className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your level</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["A1", "A2", "B1", "B2"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCefr(c)}
              className={cn(
                "h-11 rounded-[var(--radius-md)] text-sm font-medium",
                cefr === c ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Focus</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["listening", "Listen"],
              ["speaking", "Speak"],
              ["both", "Both"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setGoal(k)}
              className={cn(
                "h-11 rounded-[var(--radius-md)] text-sm font-medium",
                goal === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Daily minutes
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMins(n)}
              className={cn(
                "h-11 rounded-[var(--radius-md)] text-sm font-medium tabular",
                mins === n ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={() => complete({ cefr, goal, daily_minutes: mins })}
        >
          Start listening
        </Button>
      </div>
    </div>
  );
}
