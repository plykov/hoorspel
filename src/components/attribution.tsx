import type { Lesson } from "@/lib/types";

export function Attribution({ lesson, compact }: { lesson: Lesson; compact?: boolean }) {
  const p = lesson.provenance;
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        {p.creator} · {p.licence_spdx}
        {p.source_url ? (
          <>
            {" · "}
            <a className="underline decoration-border underline-offset-2" href={p.source_url} target="_blank" rel="noreferrer">
              source
            </a>
          </>
        ) : null}
      </p>
    );
  }
  return (
    <aside className="rounded-[var(--radius-md)] bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">Attribution</p>
      <p>{p.attribution_string}</p>
      <p>
        {p.source} · {p.creator} · {p.licence_spdx}
        {p.licence_url ? (
          <>
            {" · "}
            <a className="underline decoration-border underline-offset-2" href={p.licence_url} target="_blank" rel="noreferrer">
              licence
            </a>
          </>
        ) : null}
      </p>
      {lesson.source_type === "import" ? (
        <p className="mt-1">Private import. Not shareable, not on the shelf.</p>
      ) : null}
    </aside>
  );
}
