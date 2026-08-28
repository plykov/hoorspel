import { AudioLines, Link2, Mic, Square, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  analyseBuffer,
  blobFromTrim,
  decodeAudio,
  peaksOf,
  preflightFile,
  prepareSttPayload,
} from "@/lib/media";
import { asDialogue } from "@/lib/grammar";
import { cloudSttOff, STT_TYPE_HINT, transcribeSafely, type SttWord } from "@/lib/stt";
import type { ResidencyPref } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { toast } from "sonner";
import { playClip, stopClip } from "./player";

export type AudioClip = {
  blob: Blob;
  duration: number;
  start: number;
  end: number;
  name: string;
};

export function AudioIngest({
  residency,
  onClip,
  onTranscript,
  incomingFile,
  incomingUrl,
}: {
  residency: ResidencyPref;
  onClip: (clip: AudioClip | null) => void;
  onTranscript: (raw: string, words: SttWord[]) => void;
  incomingFile?: { blob: Blob; name: string } | null;
  incomingUrl?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [busy, setBusy] = useState<"decode" | "stt" | "rec" | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onClipRef = useRef(onClip);
  onClipRef.current = onClip;
  const [recording, setRecording] = useState(false);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    return () => stopClip();
  }, []);

  useEffect(() => {
    if (!buffer || !file) {
      onClipRef.current(null);
      return;
    }
    void blobFromTrim(file, buffer, start, end).then((blob) => {
      onClipRef.current({
        blob,
        duration: buffer.duration,
        start,
        end,
        name: fileName,
      });
    });
  }, [buffer, file, start, end, fileName]);

  async function loadBlob(blob: Blob, name: string) {
    if (blob instanceof File) {
      const err = preflightFile(blob);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setBusy("decode");
    try {
      const buf = await decodeAudio(blob);
      const check = analyseBuffer(buf);
      if (!check.ok) {
        toast.error(check.reason);
        setBusy(null);
        return;
      }
      const span = Math.min(check.duration, 90);
      setFile(blob);
      setFileName(name.replace(/\.[^.]+$/, "") || "Imported clip");
      setBuffer(buf);
      setPeaks(peaksOf(buf));
      setStart(0);
      setEnd(span);
      toast.message(
        cloudSttOff() || residency === "device"
          ? `${Math.round(check.duration)}s loaded. ${STT_TYPE_HINT}`
          : `${Math.round(check.duration)}s loaded. Trim, then transcribe — or type what you hear.`,
      );
    } catch {
      toast.error("Could not decode that file. Try mp3, wav or m4a.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (incomingUrl) setMediaUrl(incomingUrl);
  }, [incomingUrl]);

  useEffect(() => {
    if (!incomingFile) return;
    void loadBlob(incomingFile.blob, incomingFile.name);
  }, [incomingFile]);

  async function onFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    await loadBlob(f, f.name);
  }

  async function transcribe() {
    if (residency === "device") {
      toast.error("On-device mode never sends audio. Play the clip and type the transcript.");
      return;
    }
    if (!file || !buffer) {
      toast.error("Choose an audio file first.");
      return;
    }
    setBusy("stt");
    try {
      const payload = await prepareSttPayload(file, buffer, start, end);
      const raced = await Promise.race([
        transcribeSafely({ b64: payload.b64, filename: payload.filename, mime: payload.mime }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 50000)),
      ]);
      if (!raced) {
        toast.error(`Transcription took too long. ${STT_TYPE_HINT}`);
        return;
      }
      if (!raced.ok) {
        toast.error(raced.error);
        return;
      }
      onTranscript(asDialogue(raced.dialogue || raced.text), raced.words);
      toast.success("Transcript ready — edit anything that looks wrong. Disfluencies stay.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Could not transcribe. ${STT_TYPE_HINT}`);
    } finally {
      setBusy(null);
    }
  }

  async function transcribeUrl() {
    const url = mediaUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Paste a direct link to an audio file, not a page.");
      return;
    }
    if (residency === "device") {
      toast.error("On-device mode never sends audio.");
      return;
    }
    setBusy("stt");
    try {
      const result = await transcribeSafely({ url });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onTranscript(asDialogue(result.dialogue || result.text), result.words);
      toast.success("Transcript from the linked file. Audio stays at the source — paste a file to keep playback.");
    } catch {
      toast.error(`Could not fetch that URL. ${STT_TYPE_HINT}`);
    } finally {
      setBusy(null);
    }
  }

  async function toggleRec() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser cannot record. Choose a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        recRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        void loadBlob(blob, "Recording");
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      toast.message("Recording. Only continue if everyone in the conversation agreed.");
      window.setTimeout(() => {
        if (recRef.current === rec) rec.stop();
      }, 120000);
    } catch {
      toast.error("Microphone permission was denied.");
    }
  }

  function preview() {
    if (!file || !buffer) return;
    const url = URL.createObjectURL(file);
    playClip(url, start, end, 1, {
      onEnd: () => URL.revokeObjectURL(url),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,.webm,.mp4"
        className="sr-only"
        onChange={(e) => void onFiles(e.target.files)}
      />
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-card px-4 py-6 text-center shadow-[var(--shadow-border)]",
          drag && "outline outline-2 outline-primary",
        )}
      >
        <Upload className="size-5 text-primary" />
        <p className="font-medium">{busy === "decode" ? "Reading audio…" : "Drop audio or video here"}</p>
        <p className="text-sm text-muted-foreground">mp3, wav, m4a, ogg, webm · under 28 MB</p>
      </button>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          <AudioLines className="size-4" />
          Choose file
        </Button>
        <Button type="button" variant={recording ? "destructive" : "secondary"} onClick={() => void toggleRec()}>
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          {recording ? "Stop recording" : "Record"}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Or a direct audio URL"
        />
        <Button type="button" variant="secondary" onClick={() => void transcribeUrl()} disabled={busy === "stt"}>
          <Link2 className="size-4" />
          Fetch
        </Button>
      </div>

      {buffer && peaks.length ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Trim the soundtrack
            </p>
            <p className="text-xs tabular text-muted-foreground">
              {formatTime(start)} – {formatTime(end)} · {Math.round(end - start)}s
            </p>
          </div>
          <Waveform
            peaks={peaks}
            duration={buffer.duration}
            start={start}
            end={end}
            onChange={(a, b) => {
              setStart(a);
              setEnd(b);
            }}
          />
          <p className="text-xs text-muted-foreground">30–90 seconds works best. Drag the handles.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={preview}>
              Play selection
            </Button>
            <Button
              type="button"
              onClick={() => void transcribe()}
              disabled={busy === "stt" || residency === "device" || cloudSttOff()}
            >
              {busy === "stt"
                ? "Transcribing…"
                : residency === "device" || cloudSttOff()
                  ? "Type the transcript below"
                  : "Transcribe this span"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Waveform({
  peaks,
  duration,
  start,
  end,
  onChange,
}: {
  peaks: number[];
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "move" | null>(null);
  const grab = useRef(0);
  const startRef = useRef(start);
  const endRef = useRef(end);
  const onChangeRef = useRef(onChange);
  startRef.current = start;
  endRef.current = end;
  onChangeRef.current = onChange;

  function pos(clientX: number) {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    return Math.max(0, Math.min(duration, x * duration));
  }

  function down(which: "start" | "end" | "move", clientX: number) {
    dragging.current = which;
    grab.current = pos(clientX) - startRef.current;
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      const which = dragging.current;
      if (!which) return;
      const t = pos(e.clientX);
      const start = startRef.current;
      const end = endRef.current;
      if (which === "start") {
        onChangeRef.current(Math.max(0, Math.min(t, end - 3)), end);
      } else if (which === "end") {
        onChangeRef.current(start, Math.min(duration, Math.max(t, start + 3)));
      } else {
        const span = end - start;
        let a = t - grab.current;
        a = Math.max(0, Math.min(a, duration - span));
        onChangeRef.current(a, a + span);
      }
    }
    function up() {
      dragging.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [duration]);

  const left = (start / duration) * 100;
  const width = ((end - start) / duration) * 100;

  return (
    <div
      ref={ref}
      className="relative h-20 overflow-hidden rounded-[var(--radius-md)] bg-muted"
      onPointerDown={(e) => down("move", e.clientX)}
    >
      <div className="flex h-full items-end gap-px px-1 py-1">
        {peaks.map((p, i) => (
          <div
            key={i}
            className="min-w-px flex-1 rounded-sm bg-primary/55"
            style={{ height: `${Math.max(10, p * 100)}%` }}
          />
        ))}
      </div>
      <div
        className="absolute inset-y-0 bg-primary/20"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <button
        type="button"
        aria-label="Trim start"
        className="absolute top-0 h-full w-5 -translate-x-1/2 cursor-ew-resize bg-primary"
        style={{ left: `${left}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          down("start", e.clientX);
        }}
      />
      <button
        type="button"
        aria-label="Trim end"
        className="absolute top-0 h-full w-5 -translate-x-1/2 cursor-ew-resize bg-primary"
        style={{ left: `${left + width}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          down("end", e.clientX);
        }}
      />
    </div>
  );
}
