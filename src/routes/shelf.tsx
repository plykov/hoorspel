import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, Search, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayButton } from "@/components/player";
import { Attribution } from "@/components/attribution";
import { PACKS, SETTINGS, SETTING_LABELS, SHELF } from "@/data/lessons";
import { useHoorspel } from "@/lib/store";
import type { Cefr, Setting } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";

export const Route = createFileRoute("/shelf")({ component: ShelfPage });

const LEVELS: Array<Cefr | "any"> = ["any", "A1", "A2", "B1", "B2"];
const LENGTHS = [
  { id: "any", label: "Any length" },
  { id: "short", label: "< 1 min" },
  { id: "mid", label: "1–2 min" },
  { id: "long", label: "2 min+" },
] as const;
const SPEAKERS = [
  { id: "any", label: "Any speakers" },
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3+" },
] as const;
const SPEEDS = [
  { id: "any", label: "Any speed" },
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
] as const;
const LICENCES = [
  { id: "any", label: "Any licence" },
  { id: "cc-by", label: "CC-BY" },
  { id: "cc0", label: "CC0" },
  { id: "private", label: "Private" },
] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3 text-sm",
        active ? "bg-foreground text-background" : "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ShelfPage() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Cefr | "any">("any");
  const [pack, setPack] = useState<string | "any">("any");
  const [length, setLength] = useState<(typeof LENGTHS)[number]["id"]>("any");
  const [speakers, setSpeakers] = useState<(typeof SPEAKERS)[number]["id"]>("any");
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]["id"]>("any");
  const [licence, setLicence] = useState<(typeof LICENCES)[number]["id"]>("any");
  const [setting, setSetting] = useState<Setting | "any">("any");
  const imported = useHoorspel((s) => s.imported);
  const bookmarks = useHoorspel((s) => s.bookmarks);
  const toggle = useHoorspel((s) => s.toggleBookmark);
  const navigate = useNavigate();

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
      if (setting !== "any" && l.setting !== setting) return false;
      if (length === "short" && l.duration_s >= 60) return false;
      if (length === "mid" && (l.duration_s < 60 || l.duration_s >= 120)) return false;
      if (length === "long" && l.duration_s < 120) return false;
      if (speakers === "1" && l.speakers.length !== 1) return false;
      if (speakers === "2" && l.speakers.length !== 2) return false;
      if (speakers === "3" && l.speakers.length < 3) return false;
      if (speed === "slow" && l.speech_rate_wpm >= 120) return false;
      if (speed === "normal" && (l.speech_rate_wpm < 120 || l.speech_rate_wpm > 145)) return false;
      if (speed === "fast" && l.speech_rate_wpm <= 145) return false;
      if (licence === "cc-by" && !/CC-BY/i.test(l.licence.spdx)) return false;
      if (licence === "cc0" && !/CC0/i.test(l.licence.spdx)) return false;
      if (licence === "private" && l.licence.spdx !== "private") return false;
      if (!q.trim()) return true;
      const hay = `${l.title} ${l.description} ${l.segments.map((s) => s.text).join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, level, pack, length, speakers, speed, licence, setting, imported]);

  function surprise() {
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)]!;
    void navigate({ to: "/clip/$id", params: { id: pick.lesson_id } });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Find a clip</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A licence-cleared shelf. Search transcripts for a structure, not just a title.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={surprise} disabled={!list.length}>
          <Shuffle className="size-4" />
          Surprise me
        </Button>
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
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l === "any" ? "Any level" : l}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {LENGTHS.map((item) => (
          <Chip key={item.id} active={length === item.id} onClick={() => setLength(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SPEAKERS.map((item) => (
          <Chip key={item.id} active={speakers === item.id} onClick={() => setSpeakers(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={setting === "any"} onClick={() => setSetting("any")}>
          Any setting
        </Chip>
        {SETTINGS.map((item) => (
          <Chip key={item} active={setting === item} onClick={() => setSetting(item)}>
            {SETTING_LABELS[item]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SPEEDS.map((item) => (
          <Chip key={item.id} active={speed === item.id} onClick={() => setSpeed(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {LICENCES.map((item) => (
          <Chip key={item.id} active={licence === item.id} onClick={() => setLicence(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={pack === "any"} onClick={() => setPack("any")}>
          Any pack
        </Chip>
        {PACKS.map((p) => (
          <Chip key={p} active={pack === p} onClick={() => setPack(p)}>
            {p}
          </Chip>
        ))}
      </div>

      <p className="text-xs text-muted-foreground tabular">{list.length} clips</p>

      <ul className="flex flex-col gap-3">
        {list.map((l) => {
          const saved = bookmarks.includes(l.lesson_id);
          const previewText = l.segments
            .slice(0, 2)
            .map((s) => s.text)
            .join(" ");
          const needle = q.trim().toLowerCase();
          const hit = needle
            ? l.segments.find(
                (s) =>
                  s.text.toLowerCase().includes(needle) ||
                  s.translation.toLowerCase().includes(needle),
              )
            : undefined;
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
                    {hit ? (
                      <p className="mt-2 font-display text-base leading-snug" lang="nl">
                        {hit.text}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDuration(l.duration_s)} · {l.speakers.length}{" "}
                      {l.speakers.length === 1 ? "speaker" : "speakers"} · {l.speech_rate_wpm}{" "}
                      wpm · {SETTING_LABELS[l.setting]} · {l.licence.spdx}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <PlayButton
                    text={previewText}
                    start={0}
                    end={Math.min(20, l.duration_s)}
                    label="Preview 0:20"
                  />
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
