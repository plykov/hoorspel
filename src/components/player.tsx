import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ensureVoices, pickDutchVoice, speakDutch, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

let shared: HTMLAudioElement | null = null;
let sharedTimer: number | null = null;

export function stopClip() {
  if (sharedTimer != null) {
    window.clearInterval(sharedTimer);
    sharedTimer = null;
  }
  if (shared) {
    shared.pause();
    shared.src = "";
    shared = null;
  }
}

export function playClip(
  src: string,
  start: number,
  end: number | undefined,
  rate: number,
  cbs: {
    onStart?: () => void;
    onEnd?: () => void;
    onWord?: (charIndex: number, word: string) => void;
    words?: { text: string; start: number; end: number }[];
  },
): () => void {
  stopSpeaking();
  stopClip();
  const a = new Audio(src);
  shared = a;
  a.playbackRate = Math.min(2, Math.max(0.5, rate));
  a.currentTime = Math.max(0, start);
  cbs.onStart?.();
  const tick = () => {
    if (end != null && a.currentTime >= end - 0.02) {
      stopClip();
      cbs.onEnd?.();
      return;
    }
    if (cbs.words && cbs.onWord) {
      const t = a.currentTime;
      const w = cbs.words.find((x) => t >= x.start && t < x.end);
      if (w) cbs.onWord(0, w.text);
    }
  };
  sharedTimer = window.setInterval(tick, 80);
  a.onended = () => {
    stopClip();
    cbs.onEnd?.();
  };
  a.onerror = () => {
    stopClip();
    cbs.onEnd?.();
  };
  void a.play().catch(() => {
    stopClip();
    cbs.onEnd?.();
  });
  return () => {
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
