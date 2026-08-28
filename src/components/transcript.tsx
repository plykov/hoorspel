import { useMemo, useState } from "react";
import type { Lesson, Segment, Speaker, Word } from "@/lib/types";
import { PlayButton, playClip, stopClip } from "./player";
import { joinDutch, tokenizeDutch, cn } from "@/lib/utils";
import { speakDutch, stopSpeaking } from "@/lib/speech";

export function Transcript({
  lesson,
  rate,
  highlightSpan,
  src,
  editing = false,
  onPatch,
}: {
  lesson: Lesson;
  rate: number;
  highlightSpan?: string;
  src?: string | null;
  editing?: boolean;
  onPatch?: (next: { segments?: Segment[]; speakers?: Speaker[] }) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [wordKey, setWordKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {editing
          ? "Tap a name or a word to correct it. Playback still uses the original audio."
          : "Tap a word to hear it. Hesitations stay — they are part of what you are learning to hear."}
      </p>
      {lesson.segments.map((seg) => (
        <SegmentRow
          key={seg.id}
          seg={seg}
          speakers={lesson.speakers}
          rate={rate}
          src={src}
          editing={editing}
          active={active === seg.id}
          wordKey={active === seg.id ? wordKey : null}
          highlightSpan={highlightSpan}
          onPlay={() => {
            setActive(seg.id);
            setWordKey(null);
          }}
          onWord={(_, word) => setWordKey(word)}
          onEnd={() => {
            setActive(null);
            setWordKey(null);
          }}
          onSpeaker={(name) => {
            const speakers = lesson.speakers.map((s) =>
              s.id === seg.speaker ? { ...s, name } : s,
            );
            onPatch?.({ speakers });
          }}
          onWords={(words) => {
            const segments = lesson.segments.map((s) =>
              s.id === seg.id ? { ...s, text: joinDutch(words.map((w) => w.text)), words } : s,
            );
            onPatch?.({ segments });
          }}
          onTranslation={(translation) => {
            const segments = lesson.segments.map((s) => (s.id === seg.id ? { ...s, translation } : s));
            onPatch?.({ segments });
          }}
        />
      ))}
    </div>
  );
}

function SegmentRow({
  seg,
  speakers,
  rate,
  src,
  editing,
  active,
  wordKey,
  highlightSpan,
  onPlay,
  onWord,
  onEnd,
  onSpeaker,
  onWords,
  onTranslation,
}: {
  seg: Segment;
  speakers: Lesson["speakers"];
  rate: number;
  src?: string | null;
  editing: boolean;
  active: boolean;
  wordKey: string | null;
  highlightSpan?: string;
  onPlay: () => void;
  onWord: (i: number, w: string) => void;
  onEnd: () => void;
  onSpeaker: (name: string) => void;
  onWords: (words: Word[]) => void;
  onTranslation: (text: string) => void;
}) {
  const name = speakers.find((s) => s.id === seg.speaker)?.name ?? seg.speaker;
  const [editIdx, setEditIdx] = useState<number | "who" | "tr" | null>(null);
  const highlight = useMemo(() => {
    if (!highlightSpan) return new Set<number>();
    const idx = seg.text.toLowerCase().indexOf(highlightSpan.toLowerCase());
    if (idx < 0) return new Set<number>();
    const set = new Set<number>();
    let cursor = 0;
    seg.words.forEach((w, i) => {
      if (cursor >= idx && cursor < idx + highlightSpan.length) set.add(i);
      cursor += w.text.length + 1;
    });
    return set;
  }, [highlightSpan, seg]);

  function commitWord(i: number, raw: string) {
    const tokens = tokenizeDutch(raw);
    if (!tokens.length) {
      setEditIdx(null);
      return;
    }
    const orig = seg.words[i]!;
    if (tokens.length === 1) {
      const next = [...seg.words];
      next[i] = { ...orig, text: tokens[0]!, conf: 1 };
      onWords(next);
    } else {
      const span = Math.max(0.12, (orig.end - orig.start) / tokens.length);
      const extra: Word[] = tokens.map((t, k) => ({
        ...orig,
        text: t,
        start: orig.start + k * span,
        end: orig.start + (k + 1) * span,
        conf: 1,
      }));
      const next = [...seg.words.slice(0, i), ...extra, ...seg.words.slice(i + 1)];
      onWords(next);
    }
    setEditIdx(null);
  }

  return (
    <article
      className={cn(
        "rounded-[var(--radius-lg)] bg-card p-3.5 shadow-[var(--shadow-border)]",
        active && "outline outline-2 outline-primary/40",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {editing && editIdx === "who" ? (
          <input
            autoFocus
            defaultValue={name}
            aria-label="Speaker name"
            className="h-11 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== name) onSpeaker(v);
              setEditIdx(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditIdx(null);
            }}
          />
        ) : (
          <button
            type="button"
            disabled={!editing}
            onClick={() => editing && setEditIdx("who")}
            className="min-h-11 min-w-0 flex-1 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {name}{" "}
            <span className="ml-2 tabular text-[0.7rem] opacity-70">{seg.start.toFixed(0)}s</span>
          </button>
        )}
        <PlayButton
          text={seg.text}
          src={src}
          start={seg.start}
          end={seg.end}
          words={seg.words}
          rate={rate}
          label=""
          className="size-11 shrink-0 px-0"
          onStart={onPlay}
          onWord={onWord}
          onEnd={onEnd}
        />
      </div>
      <p className="font-display text-lg leading-snug" lang="nl">
        {seg.words.map((w, i) => (
          <span key={`${seg.id}-${i}`}>
            {i > 0 ? " " : null}
            {editing && editIdx === i ? (
              <input
                autoFocus
                defaultValue={w.text}
                aria-label="Correct word"
                className="inline h-8 w-28 rounded-[var(--radius-sm)] border border-border bg-background px-1 font-display text-lg"
                onBlur={(e) => commitWord(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditIdx(null);
                }}
              />
            ) : (
              <button
                type="button"
                className={cn(
                  "inline rounded-sm px-0.5",
                  w.disfluency && "italic text-muted-foreground",
                  w.conf < 0.8 && "border-b border-dashed border-warn",
                  highlight.has(i) && "bg-primary/12",
                  wordKey && w.text.toLowerCase().startsWith(wordKey.toLowerCase().slice(0, 3)) && active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
                onClick={() => {
                  if (editing) {
                    setEditIdx(i);
                    return;
                  }
                  stopSpeaking();
                  stopClip();
                  onPlay();
                  if (src) {
                    playClip(src, w.start, w.end + 0.08, Math.min(rate, 0.92), { onEnd });
                  } else {
                    speakDutch(w.text.replace(/[.,!?]/g, ""), { rate: 0.85, onEnd });
                  }
                }}
              >
                {w.text}
              </button>
            )}
          </span>
        ))}
      </p>
      {editing && editIdx === "tr" ? (
        <input
          autoFocus
          defaultValue={seg.translation}
          aria-label="English gloss"
          className="mt-1.5 h-9 w-full rounded-[var(--radius-sm)] border border-border bg-background px-2 text-sm"
          onBlur={(e) => {
            onTranslation(e.target.value.trim());
            setEditIdx(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditIdx(null);
          }}
        />
      ) : seg.translation || editing ? (
        <button
          type="button"
          disabled={!editing}
          className="mt-1.5 text-left text-sm text-muted-foreground"
          onClick={() => editing && setEditIdx("tr")}
        >
          {seg.translation || "Add an English gloss"}
        </button>
      ) : null}
    </article>
  );
}
