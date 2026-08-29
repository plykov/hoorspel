import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioIngest, type AudioClip } from "@/components/audio-ingest";
import { Transcript } from "@/components/transcript";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { SAMPLE_IMPORT } from "@/data/lessons";
import { assembleFromSegments } from "@/lib/assemble";
import { asDialogue, detect, isLikelyDutch, parseTranscript, RULE_NAMES } from "@/lib/grammar";
import { generateLesson } from "@/lib/generate";
import { AppErrorComponent } from "@/lib/error-component";
import { putMedia } from "@/lib/media";
import { takeSharedImport } from "@/lib/share-target";
import { hasSpeechRecognition, recognizeDutch } from "@/lib/speech";
import { applyWordTimings, fitSegmentsToDuration, type SttWord } from "@/lib/stt";
import { isSubtitleFile, parseSubtitles, segmentsToDialogue } from "@/lib/subtitles";
import { RESIDENCY_COPY, useHoorspel } from "@/lib/store";
import type { Lesson, ResidencyPref, Segment, Speaker } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/import")({
  errorComponent: AppErrorComponent,
  server: {
    handlers: {
      POST: async () =>
        new Response(null, {
          status: 303,
          headers: { Location: "/import?shared=1" },
        }),
    },
  },
  component: ImportPage,
});

function keptTranscript(segments: Segment[], skipped: Set<string>): string {
  return segments
    .filter((s) => !skipped.has(s.id))
    .map((s) => `${s.speaker}: ${s.text}`)
    .join("\n");
}

function hasSharedHint(): boolean {
  if (typeof window === "undefined") return false;
  return /(?:^|[?&])shared=1(?:&|$)/.test(window.location.search);
}

function speakersFrom(segs: Segment[], prev: Speaker[] = []): Speaker[] {
  const ids = [...new Set(segs.map((s) => s.speaker))];
  return ids.map((id) => prev.find((p) => p.id === id) ?? { id, name: id, role: "speaker" });
}

function segsFromRaw(raw: string, words: SttWord[], duration = 0): Segment[] {
  const parsed = raw.trim() ? parseTranscript(asDialogue(raw)) : [];
  const timed = words.length ? applyWordTimings(parsed, words) : parsed;
  return duration > 1 ? fitSegmentsToDuration(timed, duration) : timed;
}

function ImportPage() {
  const profile = useHoorspel((s) => s.profile);
  const setProfile = useHoorspel((s) => s.setProfile);
  const save = useHoorspel((s) => s.saveImport);
  const enqueue = useHoorspel((s) => s.enqueueLesson);
  const navigate = useNavigate();
  const subRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("Imported clip");
  const [raw, setRaw] = useState("");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [residency, setResidency] = useState<ResidencyPref>(profile.residency);
  const [listening, setListening] = useState(false);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [sttWords, setSttWords] = useState<SttWord[]>([]);
  const [draft, setDraft] = useState<Segment[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [incomingFile, setIncomingFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [incomingUrl, setIncomingUrl] = useState<string | undefined>();
  const [fromShare, setFromShare] = useState(false);

  useEffect(() => {
    setProfile({ residency });
  }, [residency, setProfile]);

  useEffect(() => {
    if (!clip) {
      setClipUrl(null);
      return;
    }
    const url = URL.createObjectURL(clip.blob);
    setClipUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);

  useEffect(() => {
    const hinted = hasSharedHint();
    if (hinted) setFromShare(true);
    void takeSharedImport().then((shared) => {
      if (!shared) {
        if (hinted) toast.message("Share landed. Drop the file here if it did not attach.");
        return;
      }
      setFromShare(true);
      if (shared.file) {
        setIncomingFile({ blob: shared.file, name: shared.file.name });
        setTitle((t) => (t === "Imported clip" ? shared.file!.name.replace(/\.[^.]+$/, "") : t));
      }
      if (shared.title) setTitle((t) => (t === "Imported clip" ? shared.title! : t));
      if (shared.text) setRaw((prev) => prev || shared.text!);
      if (shared.url) setIncomingUrl(shared.url);
      toast.success("Shared clip ready — trim, then transcribe.");
    });
  }, []);

  function applyDraft(next: Segment[], words: SttWord[] = sttWords) {
    setDraft(next);
    setSpeakers((prev) => speakersFrom(next, prev));
    setRaw(segmentsToDialogue(next));
    setSttWords(words);
    setSkipped(new Set());
  }

  const lang = raw.trim() ? isLikelyDutch(raw) : null;
  const span = clip ? clip.end - clip.start : 0;
  const segments = draft.length ? draft : segsFromRaw(raw, sttWords, span);
  const kept = useMemo(() => segments.filter((s) => !skipped.has(s.id)), [segments, skipped]);
  const detections = kept.length ? detect(kept) : [];
  const seconds = Math.max(
    8,
    Math.round(kept.reduce((n, s) => n + Math.max(1.2, s.end - s.start), 0)),
  );

  function toggleLine(id: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run() {
    if (!rights) {
      toast.error("Please confirm you have the right to study this clip.");
      return;
    }
    if (lang && !lang.ok) {
      toast.error(lang.reason);
      return;
    }
    if (!kept.length) {
      toast.error(
        clip
          ? "Transcribe this span, or type what you hear (A: … / B: …)."
          : "Paste or dictate at least one line of what you heard.",
      );
      return;
    }
    const transcript = asDialogue(keptTranscript(segments, skipped));
    setBusy(true);
    const builtSegs = kept.length ? kept : segsFromRaw(transcript, sttWords, span);
    const fallback = assembleFromSegments(title, builtSegs);
    fallback.speakers = speakersFrom(builtSegs, speakers);
    fallback.processing_region =
      residency === "eu" ? "eu-west" : residency === "device" ? "device" : "us";
    if (clip) fallback.duration_s = Math.round(clip.end - clip.start);

    async function attach(lesson: Lesson): Promise<Lesson> {
      if (!clip) return lesson;
      const id = `m-${Date.now()}`;
      await putMedia(id, clip.blob);
      lesson.media_id = id;
      lesson.duration_s = Math.round(clip.end - clip.start);
      return lesson;
    }
    try {
      const result = await Promise.race([
        generateLesson({ title, transcript, residency, segments: builtSegs }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
      ]);
      const built = result && result.ok ? result.lesson : fallback;
      built.segments = builtSegs;
      built.speakers = speakersFrom(builtSegs, speakers);
      const lesson = await attach(built);
      save(lesson);
      enqueue(lesson);
      toast.success(
        lesson.generation?.model_version === "grok-4.5"
          ? "Lesson written and validated."
          : "Lesson assembled from the detector.",
      );
      void navigate({ to: "/lesson/$id", params: { id: lesson.lesson_id } });
    } catch {
      const lesson = await attach(fallback);
      save(lesson);
      enqueue(lesson);
      toast.message("Generated from the detector.");
      void navigate({ to: "/lesson/$id", params: { id: lesson.lesson_id } });
    } finally {
      setBusy(false);
    }
  }

  function startRec() {
    if (!hasSpeechRecognition()) {
      toast.error("No speech recognition in this browser. Paste a transcript instead.");
      return;
    }
    if (residency === "device") {
      toast.error("On-device mode does not send audio. Paste the transcript instead.");
      return;
    }
    setListening(true);
    recognizeDutch((text, final) => {
      setRaw((prev) => (prev ? prev : text));
      if (final) {
        setRaw((prev) => {
          const next = prev.includes(text) ? prev : `${prev}\nB: ${text}`.trim();
          applyDraft(segsFromRaw(next, sttWords, span), sttWords);
          return next;
        });
        setListening(false);
      }
    });
  }

  async function onSubtitleFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    if (!isSubtitleFile(file.name, file.type)) {
      toast.error("Use a .srt or .vtt file.");
      return;
    }
    try {
      const text = await file.text();
      const next = parseSubtitles(text);
      if (!next.length) {
        toast.error("No timed lines in that subtitle file.");
        return;
      }
      applyDraft(next, []);
      toast.success("Subtitles loaded. Tap a word to hear it against the recording.");
    } catch {
      toast.error("Could not read that subtitle file.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl">Add your own</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop a recording, record in-app, or paste dialogue. Trim the soundtrack first. Transcribe,
          then tap words to check them against the audio.
        </p>
      </header>

      {fromShare ? (
        <Card className="p-4">
          <p className="text-sm">
            Shared from another app. Trim the soundtrack, then transcribe. Imports stay private.
          </p>
        </Card>
      ) : null}

      <AudioIngest
        residency={residency}
        incomingFile={incomingFile}
        incomingUrl={incomingUrl}
        onClip={setClip}
        onTranscript={(text, words) => {
          const dialogue = asDialogue(text);
          const next = segsFromRaw(dialogue, words, span);
          applyDraft(next, words);
          setTitle((t) => (t === "Imported clip" && clip?.name ? clip.name : t));
        }}
      />

      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Clip title" />
      <Textarea
        value={raw}
        onChange={(e) => {
          const value = e.target.value;
          setRaw(value);
          const next = segsFromRaw(value, sttWords, span);
          setDraft(next);
          setSpeakers((prev) => speakersFrom(next, prev));
        }}
        placeholder={"A: Goedemorgen, zegt u het maar.\nB: Mag ik twee bolletjes?"}
      />
      <input
        ref={subRef}
        type="file"
        accept=".srt,.vtt,text/vtt,application/x-subrip"
        className="sr-only"
        onChange={(e) => {
          void onSubtitleFile(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            applyDraft(segsFromRaw(SAMPLE_IMPORT, [], span), []);
          }}
        >
          Use a sample
        </Button>
        <Button type="button" variant="secondary" onClick={startRec}>
          {listening ? "Listening…" : "Dictate a line"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => subRef.current?.click()}>
          Add subtitles
        </Button>
      </div>

      {lang ? (
        <p className={cn("text-sm", lang.ok ? "text-good" : "text-destructive")}>{lang.reason}</p>
      ) : null}

      {segments.length ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Check the transcript
            </p>
            <p className="text-xs tabular text-muted-foreground">
              {kept.length}/{segments.length} lines · ~{seconds}s
            </p>
          </div>
          <div className="flex h-10 overflow-hidden rounded-[var(--radius-md)] bg-muted">
            {segments.map((s) => (
              <button
                key={`bar-${s.id}`}
                type="button"
                title={s.text}
                onClick={() => toggleLine(s.id)}
                className={cn(
                  "h-full min-w-3 flex-1 transition-colors",
                  skipped.has(s.id) ? "bg-muted" : "bg-primary",
                )}
              />
            ))}
          </div>
          <Transcript
            segments={segments}
            speakers={speakersFrom(segments, speakers)}
            rate={profile.default_rate}
            src={clipUrl}
            editing
            onPatch={(next) => {
              if (next.segments) {
                setDraft(next.segments);
                setRaw(segmentsToDialogue(next.segments));
              }
              if (next.speakers) setSpeakers(next.speakers);
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setSkipped(new Set())}>
              Keep all
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSkipped(new Set(segments.map((s) => s.id)))}
            >
              Drop all
            </Button>
          </div>
        </Card>
      ) : null}

      {detections.length ? (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Detector (no LLM)
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {detections.slice(0, 8).map((d) => (
              <li key={d.id}>
                <span className="font-medium">
                  {d.type in RULE_NAMES ? RULE_NAMES[d.type as keyof typeof RULE_NAMES] : d.type}
                </span>
                <span className="text-muted-foreground"> — {d.evidence}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Where should your audio be processed?
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {(Object.keys(RESIDENCY_COPY) as ResidencyPref[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setResidency(k)}
              className={cn(
                "rounded-[var(--radius-lg)] p-3 text-left",
                residency === k ? "bg-primary text-primary-foreground" : "bg-card shadow-[var(--shadow-border)]",
              )}
            >
              <p className="font-medium">{RESIDENCY_COPY[k].title}</p>
              <p className={cn("text-sm", residency === k ? "opacity-90" : "text-muted-foreground")}>
                {RESIDENCY_COPY[k].body}
              </p>
            </button>
          ))}
        </div>
      </section>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />
        I have the right to use this recording or text for private study. Imports stay private and
        never appear on the public shelf.
      </label>

      {clip && !raw.trim() ? (
        <p className="text-sm text-muted-foreground">
          Audio is ready. Hit Transcribe this span — first use downloads a Dutch speech model, then
          it stays on this device. You can still type, dictate, or add subtitles.
        </p>
      ) : null}

      <Button size="lg" disabled={busy || !kept.length} onClick={() => void run()}>
        {busy ? "Writing the lesson…" : kept.length ? "Build lesson" : "Transcribe or type first"}
      </Button>
    </div>
  );
}
