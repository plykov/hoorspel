import { useEffect, useState } from "react";
import { MEDIA_CACHE, SHARE_CACHE, mediaPath } from "./share-target";

const DB_NAME = "hoorspel-media";
const STORE = "clips";
const MAX_BYTES = 28 * 1024 * 1024;
const urls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function mirrorMediaCache(id: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    await cache.put(
      mediaPath(id),
      new Response(blob, {
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export async function putMedia(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const prev = urls.get(id);
  if (prev) URL.revokeObjectURL(prev);
  urls.set(id, URL.createObjectURL(blob));
  await mirrorMediaCache(id, blob);
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  try {
    const db = await openDb();
    const fromIdb = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (fromIdb) return fromIdb;
  } catch {
    /* IDB unavailable */
  }
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const hit = await cache.match(mediaPath(id));
    if (hit) return await hit.blob();
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function getMediaUrl(id: string): Promise<string | null> {
  const path = mediaPath(id);
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(MEDIA_CACHE);
      let hit = await cache.match(path);
      if (!hit) {
        const blob = await getMedia(id);
        if (blob) {
          await mirrorMediaCache(id, blob);
          hit = await cache.match(path);
        }
      }
      if (hit && typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
        return path;
      }
    } catch {
      /* fall through to blob URL */
    }
  }
  const cached = urls.get(id);
  if (cached) return cached;
  const blob = await getMedia(id);
  if (!blob) return null;
  await mirrorMediaCache(id, blob);
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function clearAllMedia(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
  if (typeof caches !== "undefined") {
    await caches.delete(MEDIA_CACHE).catch(() => false);
    await caches.delete(SHARE_CACHE).catch(() => false);
  }
}

export function useMediaUrl(id?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(null);
      return;
    }
    void getMediaUrl(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

export type Preflight =
  | { ok: true; duration: number; rms: number }
  | { ok: false; reason: string };

export async function decodeAudio(file: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    const raw = await file.arrayBuffer();
    return await ctx.decodeAudioData(raw.slice(0));
  } finally {
    void ctx.close();
  }
}

export function preflightFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "That file is over 28 MB. Trim it first, or pick a shorter clip.";
  if (file.size < 400) return "That file is empty.";
  const okType =
    /audio\//i.test(file.type) ||
    /video\/(mp4|webm|quicktime)/i.test(file.type) ||
    /\.(mp3|wav|m4a|ogg|flac|aac|opus|webm|mp4|mov)$/i.test(file.name);
  if (file.type && !okType) return "Use an audio file (mp3, wav, m4a, ogg) or a video with sound.";
  return null;
}

export function analyseBuffer(buf: AudioBuffer): Preflight {
  const duration = buf.duration;
  if (duration < 3) return { ok: false, reason: "Need at least three seconds of speech." };
  if (duration > 30 * 60) return { ok: false, reason: "Over 30 minutes. Trim before importing." };
  const rms = rmsOf(buf);
  if (duration > 2 && rms < 0.004) {
    return { ok: false, reason: "No speech energy detected. Is there an audio track?" };
  }
  return { ok: true, duration, rms };
}

export function rmsOf(buf: AudioBuffer): number {
  const ch = buf.getChannelData(0);
  let s = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(ch.length / 12000));
  for (let i = 0; i < ch.length; i += step) {
    s += ch[i]! * ch[i]!;
    n += 1;
  }
  return n ? Math.sqrt(s / n) : 0;
}

export function peaksOf(buf: AudioBuffer, buckets = 160): number[] {
  const ch = buf.getChannelData(0);
  const size = Math.max(1, Math.floor(ch.length / buckets));
  const peaks: number[] = [];
  for (let i = 0; i < buckets; i++) {
    let max = 0;
    const start = i * size;
    for (let j = 0; j < size; j++) {
      const v = Math.abs(ch[start + j] ?? 0);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const peak = Math.max(...peaks, 0.01);
  return peaks.map((p) => p / peak);
}

export function sliceBuffer(buf: AudioBuffer, start: number, end: number): AudioBuffer {
  const sr = buf.sampleRate;
  const a = Math.max(0, Math.floor(start * sr));
  const b = Math.min(buf.length, Math.floor(end * sr));
  const length = Math.max(1, b - a);
  const out = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: sr });
  const dst = out.getChannelData(0);
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
  for (let i = 0; i < length; i++) {
    dst[i] = (ch0[a + i]! + ch1[a + i]!) / 2;
  }
  return out;
}

export function downsampleTo16k(buf: AudioBuffer): AudioBuffer {
  const target = 16000;
  if (Math.abs(buf.sampleRate - target) < 1) return buf;
  const ratio = buf.sampleRate / target;
  const length = Math.max(1, Math.floor(buf.length / ratio));
  const out = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: target });
  const src = buf.getChannelData(0);
  const dst = out.getChannelData(0);
  for (let i = 0; i < length; i++) {
    dst[i] = src[Math.min(src.length - 1, Math.floor(i * ratio))]!;
  }
  return out;
}

export function encodeWav(buf: AudioBuffer): Blob {
  const samples = buf.getChannelData(0);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const size = pcm.byteLength;
  writeAscii(v, 0, "RIFF");
  v.setUint32(4, 36 + size, true);
  writeAscii(v, 8, "WAVE");
  writeAscii(v, 12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeAscii(v, 36, "data");
  v.setUint32(40, size, true);
  return new Blob([header, pcm], { type: "audio/wav" });
}

function writeAscii(v: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function prepareSttPayload(
  file: Blob,
  buffer: AudioBuffer,
  start: number,
  end: number,
): Promise<{ b64: string; filename: string; mime: string }> {
  const trimmed = start > 0.08 || end < buffer.duration - 0.08;
  const span = end - start;
  if (!trimmed && file.size < 3_600_000 && /mpeg|mp3|mp4|m4a|aac|ogg|webm|opus/i.test(file.type || "")) {
    return {
      b64: await blobToBase64(file),
      filename: guessName(file.type),
      mime: file.type || "application/octet-stream",
    };
  }
  const slice = sliceBuffer(buffer, start, Math.min(end, start + 90));
  const wav = encodeWav(downsampleTo16k(slice));
  if (wav.size > 5_000_000 || span > 95) {
    throw new Error("Trim to 90 seconds or less so transcription can run.");
  }
  return { b64: await blobToBase64(wav), filename: "clip.wav", mime: "audio/wav" };
}

function guessName(type: string): string {
  if (/webm/i.test(type)) return "clip.webm";
  if (/ogg/i.test(type)) return "clip.ogg";
  if (/mp4|m4a|aac/i.test(type)) return "clip.m4a";
  if (/mpeg|mp3/i.test(type)) return "clip.mp3";
  return "clip.wav";
}

export function needsSeekableRewrap(file: Blob): boolean {
  const type = (file.type || "").toLowerCase();
  if (!type) return true;
  return /webm|ogg|opus/.test(type);
}

export async function blobFromTrim(
  file: Blob,
  buffer: AudioBuffer,
  start: number,
  end: number,
): Promise<Blob> {
  const trimmed = start > 0.08 || end < buffer.duration - 0.08;
  if (!trimmed && !needsSeekableRewrap(file)) return file;
  return encodeWav(sliceBuffer(buffer, start, end));
}
