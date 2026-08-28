import { assembleFromSegments } from "./assemble";
import { parseTranscript } from "./grammar";
import { detect, RULE_NAMES } from "./grammar";
import { validateLesson } from "./validate";
import type { Lesson } from "./types";

type GenerateInput = {
  title: string;
  transcript: string;
  residency: "device" | "eu" | "fastest";
};

type GenerateResult = { ok: true; lesson: Lesson } | { ok: false; error: string };

function regionOf(residency: GenerateInput["residency"]): Lesson["processing_region"] {
  return residency === "eu" ? "eu-west" : residency === "device" ? "device" : "us";
}

/** Client-safe assembly used on GitHub Pages (no server functions). */
export function generateLessonLocal(data: GenerateInput): GenerateResult {
  const segments = parseTranscript(data.transcript);
  if (segments.length < 2) {
    return { ok: false, error: "Need at least two lines of dialogue." };
  }
  const base = assembleFromSegments(data.title || "Imported clip", segments);
  base.processing_region = regionOf(data.residency);
  return { ok: true, lesson: validateLesson(base).lesson };
}

export async function generateLesson(data: GenerateInput): Promise<GenerateResult> {
  // Client bundle cannot import `*.server.*`. Assembly stays on-device; the
  // constrained templates plus validators are the lesson writer in this build.
  return generateLessonLocal(data);
}
