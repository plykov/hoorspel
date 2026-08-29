import { asDialogue } from "./grammar";
import { decodeAudio, downsampleTo16k, prepareSttPayload, sliceBuffer } from "./media";
import {
  cloudSttOff,
  transcribeSafely,
  wordsToDialogue,
  type SttResult,
  type SttWord,
} from "./stt";
import type { ResidencyPref } from "./types";

type ProgressFn = (msg: string) => void;

type WhisperChunk = {
  text?: string;
  timestamp?: [number | null, number | null];
};

type WhisperOut = {
  text?: string;
  chunks?: WhisperChunk[];
};

type AsrPipe = (
  audio: Float32Array,
  options?: Record<string, unknown>,
) => Promise<WhisperOut>;

const MODEL = "onnx-community/whisper-tiny";
const WHISPER_HINT =
  "Could not transcribe in the browser. Check your connection (first use downloads a speech model), then try again — or type what you hear.";

let pipePromise: Promise<AsrPipe> | null = null;

function pcm16k(buffer: AudioBuffer, start: number, end: number): Float32Array {
  const slice = sliceBuffer(buffer, start, Math.min(end, start + 90));
  const down = downsampleTo16k(slice);
  return new Float32Array(down.getChannelData(0));
}

export function whisperOutputToResult(out: WhisperOut, duration: number): SttResult | { ok: false; error: string } {
  const text = (out.text ?? "").trim();
  const words: SttWord[] = [];
  for (const chunk of out.chunks ?? []) {
    const token = (chunk.text ?? "").trim();
    if (!token) continue;
    const t0 = chunk.timestamp?.[0];
    const t1 = chunk.timestamp?.[1];
    const start = typeof t0 === "number" && Number.isFinite(t0) ? Math.max(0, t0) : words.at(-1)?.end ?? 0;
    const end =
      typeof t1 === "number" && Number.isFinite(t1) && t1 > start ? t1 : start + Math.max(0.12, token.length * 0.06);
    words.push({ text: token, start, end });
  }
  if (!text && !words.length) {
    return { ok: false, error: "Nothing was recognised. Try a clearer span, or type the transcript." };
  }
  const joined = text || words.map((w) => w.text).join(" ");
  const dialogue = words.length ? wordsToDialogue(words, joined) : asDialogue(joined);
  return {
    ok: true,
    text: joined,
    duration,
    language: "nl",
    words,
    dialogue,
  };
}

function progressMessage(info: {
  status?: string;
  progress?: number;
}): string | null {
  if (info.status === "progress" && typeof info.progress === "number") {
    return `Downloading speech model… ${Math.min(100, Math.round(info.progress))}%`;
  }
  if (info.status === "initiate" || info.status === "download") {
    return "Downloading Dutch speech model (first time only)…";
  }
  if (info.status === "ready" || info.status === "done") {
    return "Transcribing in the browser…";
  }
  return null;
}

async function getPipe(onProgress?: ProgressFn): Promise<AsrPipe> {
  if (typeof window === "undefined") {
    throw new Error("Transcription runs in the browser.");
  }
  if (!pipePromise) {
    pipePromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const wasm = env.backends?.onnx?.wasm as { numThreads?: number; proxy?: boolean } | undefined;
      if (wasm) {
        wasm.numThreads = 1;
        wasm.proxy = false;
      }
      const transcriber = await pipeline("automatic-speech-recognition", MODEL, {
        dtype: "fp32",
        progress_callback: (info: { status?: string; progress?: number }) => {
          const msg = progressMessage(info);
          if (msg) onProgress?.(msg);
        },
      });
      return transcriber as unknown as AsrPipe;
    })().catch((err: unknown) => {
      pipePromise = null;
      throw err;
    });
  }
  return pipePromise;
}

export async function transcribeWithWhisper(
  buffer: AudioBuffer,
  start: number,
  end: number,
  onProgress?: ProgressFn,
): Promise<SttResult | { ok: false; error: string }> {
  const span = Math.max(0, end - start);
  if (span < 2.5) {
    return { ok: false, error: "Need at least three seconds of speech." };
  }
  try {
    onProgress?.("Loading Dutch speech model…");
    const transcriber = await getPipe(onProgress);
    onProgress?.("Transcribing in the browser…");
    const audio = pcm16k(buffer, start, end);
    const out = await transcriber(audio, {
      language: "dutch",
      task: "transcribe",
      chunk_length_s: span > 28 ? 30 : 0,
      stride_length_s: span > 28 ? 5 : undefined,
    });
    return whisperOutputToResult(out, span);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    if (/fetch|network|load|404|failed/i.test(msg)) {
      return { ok: false, error: WHISPER_HINT };
    }
    return { ok: false, error: msg.trim() || WHISPER_HINT };
  }
}

export async function transcribeClip(opts: {
  file: Blob;
  buffer: AudioBuffer;
  start: number;
  end: number;
  residency: ResidencyPref;
  onProgress?: ProgressFn;
}): Promise<SttResult | { ok: false; error: string }> {
  const { file, buffer, start, end, residency, onProgress } = opts;
  if (residency !== "device" && !cloudSttOff()) {
    onProgress?.("Trying cloud transcription…");
    try {
      const payload = await prepareSttPayload(file, buffer, start, end);
      const cloud = await transcribeSafely({
        b64: payload.b64,
        filename: payload.filename,
        mime: payload.mime,
      });
      if (cloud.ok) return cloud;
    } catch {
      /* browser model next */
    }
  }
  return transcribeWithWhisper(buffer, start, end, onProgress);
}

export async function transcribeRemoteUrl(
  url: string,
  residency: ResidencyPref,
  onProgress?: ProgressFn,
): Promise<SttResult | { ok: false; error: string }> {
  if (residency !== "device" && !cloudSttOff()) {
    onProgress?.("Trying cloud transcription…");
    try {
      const cloud = await transcribeSafely({ url });
      if (cloud.ok) return cloud;
    } catch {
      /* fetch + whisper next */
    }
  }
  onProgress?.("Fetching audio…");
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      return { ok: false, error: "Could not fetch that URL. Paste a direct audio link, or drop a file." };
    }
    const blob = await res.blob();
    const buffer = await decodeAudio(blob);
    return transcribeWithWhisper(buffer, 0, buffer.duration, onProgress);
  } catch {
    return { ok: false, error: "Could not fetch that URL (blocked or not a direct file). Drop the audio instead." };
  }
}
