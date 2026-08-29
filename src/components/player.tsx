import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ensureVoices, pickDutchVoice, speakDutch, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

let shared: HTMLAudioElement | null = null;
let sharedTimer: number | null = null;
let audioCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

type PlayCbs = {
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (charIndex: number, word: string) => void;
  words?: { text: string; start: number; end: number }[];
};

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function decodeSrc(src: string): Promise<AudioBuffer> {
  let hit = buffers.get(src);
  if (!hit) {
    hit = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("audio fetch failed");
        return r.arrayBuffer();
      })
      .then((raw) => getCtx().decodeAudioData(raw.slice(0)))
      .catch((err: unknown) => {
        buffers.delete(src);
        throw err;
      });
    buffers.set(src, hit);
  }
  return hit;
}

export function stopClip() {
  if (sharedTimer != null) {
    window.clearInterval(sharedTimer);
    sharedTimer = null;
  }
  if (activeSource) {
    try {
      activeSource.onended = null;
      activeSource.stop();
    } catch {
      /* already stopped */
    }
    try {
      activeSource.disconnect();
    } catch {
      /* ignore */
    }
    activeSource = null;
  }
  if (shared) {
    shared.pause();
    shared.removeAttribute("src");
    shared.load();
    shared = null;
  }
}

function tickWords(t: number, cbs: PlayCbs) {
  if (!cbs.words || !cbs.onWord) return;
  const w = cbs.words.find((x) => t >= x.start && t < x.end);
  if (w) cbs.onWord(0, w.text);
}

function playHtml(
  src: string,
  start: number,
  end: number | undefined,
  rate: number,
  cbs: PlayCbs,
  isCancelled: () => boolean,
) {
  const a = new Audio();
  shared = a;
  a.preload = "auto";
  a.src = src;
  a.playbackRate = Math.min(2, Math.max(0.5, rate));

  const begin = () => {
    if (isCancelled()) return;
    const seek = () => {
      if (isCancelled()) return;
      cbs.onStart?.();
      sharedTimer = window.setInterval(() => {
        if (isCancelled()) return;
        if (end != null && a.currentTime >= end - 0.02) {
          stopClip();
          cbs.onEnd?.();
          return;
        }
        tickWords(a.currentTime, cbs);
      }, 80);
      void a.play().catch(() => {
        if (isCancelled()) return;
        stopClip();
        cbs.onEnd?.();
      });
    };
    if (start > 0.04) {
      const onSeeked = () => {
        a.removeEventListener("seeked", onSeeked);
        seek();
      };
      a.addEventListener("seeked", onSeeked);
      try {
        a.currentTime = start;
      } catch {
        a.removeEventListener("seeked", onSeeked);
        seek();
      }
      window.setTimeout(() => {
        if (isCancelled() || shared !== a) return;
        if (a.paused) {
          a.removeEventListener("seeked", onSeeked);
          seek();
        }
      }, 400);
      return;
    }
    seek();
  };

  a.onended = () => {
    if (isCancelled()) return;
    stopClip();
    cbs.onEnd?.();
  };
  a.onerror = () => {
    if (isCancelled()) return;
    stopClip();
    cbs.onEnd?.();
  };
  if (a.readyState >= 1) begin();
  else a.onloadedmetadata = begin;
}

function playBuffer(
  buf: AudioBuffer,
  start: number,
  end: number | undefined,
  rate: number,
  cbs: PlayCbs,
  isCancelled: () => boolean,
) {
  const ctx = getCtx();
  const from = Math.min(Math.max(0, start), Math.max(0, buf.duration - 0.04));
  const until = end != null && Number.isFinite(end) ? Math.min(Math.max(end, from + 0.04), buf.duration) : buf.duration;
  const dur = Math.max(0.04, until - from);
  const node = ctx.createBufferSource();
  node.buffer = buf;
  node.playbackRate.value = Math.min(2, Math.max(0.5, rate));
  node.connect(ctx.destination);
  activeSource = node;
  const t0 = ctx.currentTime;
  const speed = node.playbackRate.value;
  cbs.onStart?.();
  sharedTimer = window.setInterval(() => {
    if (isCancelled()) return;
    tickWords(from + (ctx.currentTime - t0) * speed, cbs);
  }, 80);
  node.onended = () => {
    if (isCancelled()) return;
    stopClip();
    cbs.onEnd?.();
  };
  node.start(0, from, dur);
}

export function playClip(
  src: string,
  start: number,
  end: number | undefined,
  rate: number,
  cbs: PlayCbs,
): () => void {
  stopSpeaking();
  stopClip();
  let cancelled = false;
  const isCancelled = () => cancelled;
  const from = Number.isFinite(start) ? Math.max(0, start) : 0;
  const until = end != null && Number.isFinite(end) ? end : undefined;

  void (async () => {
    try {
      const buf = await decodeSrc(src);
      if (cancelled) return;
      playBuffer(buf, from, until, rate, cbs, isCancelled);
    } catch {
      if (cancelled) return;
      playHtml(src, from, until, rate, cbs, isCancelled);
    }
  })();

  return () => {
    cancelled = true;
    stopClip();
  };
}

export function playSequence(
  lines: { text: string; src?: string | null; start: number; end?: number }[],
  rate: number,
  cbs: { onIndex?: (i: number) => void; onDone?: () => void },
): () => void {
  let i = 0;
  let cancelled = false;
  let childStop: (() => void) | null = null;

  const next = () => {
    if (cancelled) return;
    const line = lines[i];
    if (!line) {
      cbs.onDone?.();
      return;
    }
    cbs.onIndex?.(i);
    i += 1;
    const after = () => {
      if (cancelled) return;
      window.setTimeout(next, 320);
    };
    if (line.src) {
      childStop = playClip(line.src, line.start, line.end, rate, { onEnd: after });
    } else {
      childStop = speakDutch(line.text, { rate, onEnd: after });
    }
  };
  next();
  return () => {
    cancelled = true;
    childStop?.();
    stopSpeaking();
    stopClip();
  };
}

export function PlayButton({
  text,
  src,
  start = 0,
  end,
  words,
  rate = 0.92,
  onWord,
  onEnd,
  onStart,
  className,
  label = "Play",
}: {
  text: string;
  src?: string | null;
  start?: number;
  end?: number;
  words?: { text: string; start: number; end: number }[];
  rate?: number;
  onWord?: (charIndex: number, word: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
  className?: string;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [nl, setNl] = useState<boolean | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void ensureVoices().then(() => setNl(Boolean(pickDutchVoice())));
    return () => {
      stopRef.current?.();
      stopSpeaking();
      stopClip();
    };
  }, []);

  function toggle() {
    if (playing) {
      stopRef.current?.();
      stopSpeaking();
      stopClip();
      setPlaying(false);
      onEnd?.();
      return;
    }
    setPlaying(true);
    if (src) {
      stopRef.current = playClip(src, start, end, rate, {
        words,
        onStart,
        onWord,
        onEnd: () => {
          setPlaying(false);
          onEnd?.();
        },
      });
      return;
    }
    onStart?.();
    speakDutch(text, {
      rate,
      onBoundary: onWord,
      onEnd: () => {
        setPlaying(false);
        onEnd?.();
      },
    });
  }

  return (
    <Button
      type="button"
      variant={playing ? "primary" : "secondary"}
      size="sm"
      onClick={toggle}
      className={cn("min-w-11", !label && "min-w-11 px-0", className)}
      aria-pressed={playing}
    >
      {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      {label}
      {!src && nl === false ? <Volume2 className="size-3.5 opacity-50" /> : null}
    </Button>
  );
}

export function RateToggle({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const rates = [
    { n: 0.75, label: "0.75×" },
    { n: 0.92, label: "1×" },
    { n: 1.15, label: "1.25×" },
  ];
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {rates.map((r) => (
        <button
          key={r.n}
          type="button"
          onClick={() => onChange(r.n)}
          className={cn(
            "h-8 rounded-full px-3 text-xs font-medium",
            value === r.n ? "bg-card text-foreground shadow-[var(--shadow-border)]" : "text-muted-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
