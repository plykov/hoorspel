import { cn } from "@/lib/utils";

export function resample(values: number[], bars: number): number[] {
  if (!values.length) return Array.from({ length: bars }, () => 0.08);
  return Array.from({ length: bars }, (_, i) => {
    const a = Math.floor((i / bars) * values.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * values.length));
    const slice = values.slice(a, b);
    return slice.reduce((n, v) => n + v, 0) / slice.length;
  });
}

/** Deterministic speech-shaped envelope from the citation line (no audio required). */
export function envelopeFromText(text: string, bars = 28): number[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return Array.from({ length: bars }, () => 0.18);
  const raw: number[] = [];
  for (const w of words) {
    const n = Math.max(2, Math.min(6, Math.round(w.replace(/[^\p{L}]/gu, "").length / 1.6) || 2));
    const peak = Math.min(1, 0.28 + w.length * 0.07);
    for (let i = 0; i < n; i += 1) {
      raw.push(0.12 + Math.sin(((i + 1) / (n + 1)) * Math.PI) * peak * 0.88);
    }
    raw.push(0.08);
  }
  return resample(raw, bars);
}

export function WaveRow({
  values,
  label,
  tone = "ref",
}: {
  values: number[];
  label: string;
  tone?: "ref" | "mine";
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex h-10 items-end gap-px rounded-[var(--radius-sm)] bg-muted/60 px-1 py-1">
        {values.map((v, i) => (
          <span
            key={i}
            className={cn("min-w-px flex-1 rounded-sm", tone === "mine" ? "bg-primary" : "bg-foreground/55")}
            style={{ height: `${Math.round(Math.max(0.1, Math.min(1, v)) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ScoreMeters({
  accuracy,
  fluency,
  completeness,
}: {
  accuracy: number;
  fluency: number;
  completeness: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Meter label="Accuracy" value={accuracy} />
      <Meter label="Fluency" value={fluency} />
      <Meter label="Completeness" value={completeness} />
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs tabular">{pct}</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pct >= 70 ? "bg-good" : pct >= 40 ? "bg-warn" : "bg-destructive")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
