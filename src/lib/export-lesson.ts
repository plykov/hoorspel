import type { Lesson } from "./types";

function esc(s: string): string {
  const map: Record<string, string> = {
    "&": "\u0026amp;",
    "<": "\u0026lt;",
    ">": "\u0026gt;",
    '"': "\u0026quot;",
    "'": "\u0026#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export function canShareLesson(lesson: Lesson): boolean {
  if (lesson.source_type === "import") return false;
  if (!lesson.licence.exportable) return false;
  if (!lesson.provenance.creator || !lesson.provenance.licence_spdx) return false;
  return true;
}

export function lessonToHtml(lesson: Lesson): string {
  const lines = lesson.segments
    .map((s) => {
      const name = lesson.speakers.find((sp) => sp.id === s.speaker)?.name ?? s.speaker;
      return `<p><strong>${esc(name)}</strong> <span>${esc(s.text)}</span>${s.translation ? `<br><em>${esc(s.translation)}</em>` : ""}</p>`;
    })
    .join("\n");
  const vocab = lesson.vocabulary
    .map((v) => `<li><strong lang="nl">${esc(v.dutch)}</strong> — ${esc(v.english)}${v.notes ? `. ${esc(v.notes)}` : ""}</li>`)
    .join("");
  const grammar = lesson.grammar
    .map(
      (g) =>
        `<section><h3>${esc(g.name)}</h3><p lang="nl"><q>${esc(g.span)}</q></p><p>${esc(g.explanation)}</p><p>${esc(g.watch_out)}</p></section>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(lesson.title)} — Hoorspel</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; max-width: 40rem; margin: 2rem auto; padding: 0 1.25rem; color: #1c1915; background: #f4efe6; line-height: 1.5; }
    h1 { font-weight: 500; letter-spacing: -0.03em; }
    q { font-style: italic; }
    footer { margin-top: 2rem; font-size: 0.85rem; color: #6b645c; border-top: 1px solid #ddd4c6; padding-top: 1rem; }
  </style>
</head>
<body>
  <p>${esc(lesson.cefr)} · ${lesson.duration_s}s · ${esc(lesson.licence.spdx)}</p>
  <h1>${esc(lesson.title)}</h1>
  <p>${esc(lesson.description)}</p>
  <h2>Transcript</h2>
  ${lines}
  <h2>Words</h2>
  <ul>${vocab}</ul>
  <h2>Grammar</h2>
  ${grammar}
  <footer>
    <p>${esc(lesson.provenance.attribution_string)}</p>
    <p>${esc(lesson.provenance.source)} · ${esc(lesson.provenance.creator)} · ${esc(lesson.licence.spdx)}</p>
    ${lesson.source_type === "import" ? "<p>Private import. For personal study only — not for sharing.</p>" : ""}
  </footer>
</body>
</html>`;
}

export function downloadLesson(lesson: Lesson) {
  const html = lessonToHtml(lesson);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hoorspel-${lesson.lesson_id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareLesson(lesson: Lesson): Promise<"shared" | "copied" | "blocked"> {
  if (!canShareLesson(lesson)) return "blocked";
  const html = lessonToHtml(lesson);
  const file = new File([html], `hoorspel-${lesson.lesson_id}.html`, { type: "text/html" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: lesson.title,
        text: `${lesson.title} — ${lesson.provenance.attribution_string}`,
        files: [file],
      });
      return "shared";
    }
  } catch {
    /* user cancelled or share failed — fall through to copy */
  }
  try {
    await navigator.clipboard.writeText(`${lesson.title}\n\n${lesson.provenance.attribution_string}\n${lesson.provenance.source_url}`);
    return "copied";
  } catch {
    downloadLesson(lesson);
    return "shared";
  }
}
