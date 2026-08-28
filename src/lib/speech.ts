let voicesReady = false;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const existing = loadVoices();
  if (existing.length) {
    voicesReady = true;
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    const done = () => {
      voicesReady = true;
      resolve(loadVoices());
    };
    window.speechSynthesis.onvoiceschanged = done;
    setTimeout(done, 400);
  });
}

export function pickDutchVoice(): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  const nl =
    voices.find((v) => v.lang.toLowerCase().startsWith("nl")) ??
    voices.find((v) => /dutch|nederlands/i.test(v.name));
  return nl ?? null;
}

export type SpeakOptions = {
  rate?: number;
  onBoundary?: (charIndex: number, word: string) => void;
  onEnd?: () => void;
};

export function speakDutch(text: string, opts: SpeakOptions = {}): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts.onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickDutchVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "nl-NL";
  u.rate = opts.rate ?? 0.92;
  u.onboundary = (ev) => {
    if (ev.name === "word" || ev.name === "wordboundary") {
      const idx = ev.charIndex ?? 0;
      const slice = text.slice(idx);
      const word = slice.split(/\s+/)[0] ?? "";
      opts.onBoundary?.(idx, word);
    }
  };
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function hasSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
  );
}

export function recognizeDutch(onResult: (text: string, final: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const Ctor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLite;
        webkitSpeechRecognition?: new () => SpeechRecognitionLite;
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLite })
      .webkitSpeechRecognition;
  if (!Ctor) return () => {};
  const rec = new Ctor();
  rec.lang = "nl-NL";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (ev: { results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }) => {
    const last = ev.results[ev.results.length - 1];
    if (!last) return;
    onResult(last[0].transcript, last.isFinal);
  };
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}

type SpeechRecognitionLite = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: never) => void) | null;
  start: () => void;
  stop: () => void;
};

export function scoreTranscript(expected: string, heard: string): number {
  const a = expected
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  const b = heard
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!a.length) return 0;
  let hit = 0;
  for (const w of a) if (b.includes(w)) hit += 1;
  return Math.round((hit / a.length) * 100);
}

/** Word overlap, coverage, and timing — not recogniser confidence. */
export function scoreSpeaking(
  expected: string,
  heard: string,
  opts?: { expectedMs?: number; actualMs?: number },
): { accuracy: number; fluency: number; completeness: number } {
  const accuracy = scoreTranscript(expected, heard);
  const need = expected
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  const got = heard
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  const completeness = need.length ? Math.min(100, Math.round((got.length / need.length) * 100)) : 0;
  let fluency = heard ? 72 : 0;
  if (opts?.expectedMs && opts.expectedMs > 250 && opts.actualMs && opts.actualMs > 200) {
    const ratio = opts.actualMs / opts.expectedMs;
    const slack = ratio < 0.75 ? 0.75 - ratio : ratio > 1.35 ? ratio - 1.35 : 0;
    fluency = Math.max(18, Math.min(100, Math.round(100 - slack * 90)));
  }
  return { accuracy, fluency, completeness };
}

void voicesReady;
