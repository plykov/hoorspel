import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PACKS, SHELF } from "@/data/lessons";
import { useHoorspel } from "@/lib/store";
import type { Cefr } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Attribution } from "@/components/attribution";

export const Route = createFileRoute("/shelf")({ component: ShelfPage });

const LEVELS: Array<Cefr | "any"> = ["any", "A1", "A2", "B1", "B2"];

function ShelfPage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Cefr | "any">("any");
  const [pack, setPack] = useState<string | "any">("any");
  const imported = useHoorspel((s) => s.imported);
  const bookmarks = useHoorspel((s) => s.bookmarks);
  const toggle = useHoorspel((s) => s.toggleBookmark);

  const list = useMemo(() => {
    const seen = new Set<string>();
    const all = [...imported, ...SHELF].filter((l) => {
      if (seen.has(l.lesson_id)) return false;
      seen.add(l.lesson_id);
      return true;
    });
    return all.filter((l) => {
      if (level !== "any" && l.cefr !== level) return false;
      if (pack !== "any" && !l.packs.includes(pack)) return false;
      if (!q.trim()) return true;
      const hay = `${l.title} ${l.description} ${l.segments.map((s) => s.text).join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, level, pack, imported]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl">Find a clip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A licence-cleared shelf. Search transcripts for a structure, not just a title.
        </p>
      </header>

      <label className="relative block">
        <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search titles or Dutch, e.g. omdat"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={cn(
              "h-9 rounded-full px-3 text-sm",
              level === l ? "bg-foreground text-background" : "bg-muted text-foreground",
            )}
          >
            {l === "any" ? "Any level" : l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPack("any")}
          className={cn(
            "h-9 rounded-full px-3 text-sm",
            pack === "any" ? "bg-foreground text-background" : "bg-muted text-foreground",
          )}
        >
          Any pack
        </button>
        {PACKS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPack(p)}
            className={cn(
              "h-9 rounded-full px-3 text-sm",
              pack === p ? "bg-foreground text-background" : "bg-muted text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {list.map((l) => {
          const saved = bookmarks.includes(l.lesson_id);
          return (
            <li key={l.lesson_id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl">{l.title}</h2>
                      <Badge tone="primary">{l.cefr}</Badge>
                      {l.source_type === "import" ? <Badge>Import</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDuration(l.duration_s)} · {l.speakers.length} speakers · {l.speech_rate_wpm} wpm ·{" "}
                      {l.licence.spdx}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={saved ? "Remove bookmark" : "Bookmark"}
                    onClick={() => toggle(l.lesson_id)}
                    className="grid size-11 place-items-center rounded-[var(--radius-md)] hover:bg-muted"
                  >
                    {saved ? <BookmarkCheck className="size-5 text-primary" /> : <Bookmark className="size-5" />}
                  </button>
                </div>
                <Attribution lesson={l} compact />
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/clip/$id"
                    params={{ id: l.lesson_id }}
                    className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-muted px-4 text-sm font-medium"
                  >
                    Preview
                  </Link>
                  <Link
                    to="/lesson/$id"
                    params={{ id: l.lesson_id }}
                    className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Use this clip
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clips match. Try another particle or pack.</p>
        ) : null}
      </ul>
    </div>
  );
}
