import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RESIDENCY_COPY, useHoorspel } from "@/lib/store";
import type { Cefr, ResidencyPref } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const profile = useHoorspel((s) => s.profile);
  const setProfile = useHoorspel((s) => s.setProfile);
  const dark = useHoorspel((s) => s.dark);
  const toggleDark = useHoorspel((s) => s.toggleDark);
  const resetAll = useHoorspel((s) => s.resetAll);
  const exportData = useHoorspel((s) => s.exportData);

  function download() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hoorspel-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl">You</h1>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</p>
        <div className="grid grid-cols-4 gap-2">
          {(["A1", "A2", "B1", "B2"] as Cefr[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setProfile({ cefr: c })}
              className={cn(
                "h-11 rounded-[var(--radius-md)] text-sm font-medium",
                profile.cefr === c ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Audio processing
        </p>
        {(Object.keys(RESIDENCY_COPY) as ResidencyPref[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setProfile({ residency: k })}
            className={cn(
              "rounded-[var(--radius-md)] p-3 text-left",
              profile.residency === k ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            <p className="font-medium">{RESIDENCY_COPY[k].title}</p>
            <p className={cn("text-sm", profile.residency === k ? "opacity-90" : "text-muted-foreground")}>
              {RESIDENCY_COPY[k].body}
            </p>
          </button>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily minutes</p>
        <div className="grid grid-cols-3 gap-2">
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setProfile({ daily_minutes: n })}
              className={cn(
                "h-11 rounded-[var(--radius-md)] text-sm font-medium tabular",
                profile.daily_minutes === n ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <Toggle
          label="Dark paper"
          on={dark}
          onToggle={toggleDark}
        />
        <Toggle
          label="Dyslexia-friendly font"
          on={profile.dyslexia_font}
          onToggle={() => setProfile({ dyslexia_font: !profile.dyslexia_font })}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This device</p>
        <p className="text-sm text-muted-foreground">
          Install Hoorspel to keep the queue and your recordings on the home screen, offline. Once
          it is installed, share an audio file from another app and it opens here as an import.
        </p>
        <Button asChild variant="secondary">
          <a href="/?install=1">Add to home screen</a>
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Progress lives on this device. GDPR-style export and one-action erasure are here, not in a
          buried menu.
        </p>
        <Button variant="secondary" onClick={download}>
          Export my data
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("Delete all local progress, imports and recordings metadata?")) resetAll();
          }}
        >
          Delete everything on this device
        </Button>
      </Card>

      <p className="text-sm text-muted-foreground">
        See also your <Link to="/progress" className="underline">measured progress</Link>.
      </p>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex h-11 items-center justify-between">
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "flex h-6 w-10 items-center rounded-full p-0.5",
          on ? "bg-primary" : "bg-muted",
        )}
      >
        <span className={cn("size-5 rounded-full bg-card shadow-[var(--shadow-border)]", on && "translate-x-4")} />
      </span>
    </button>
  );
}
