import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Attribution } from "@/components/attribution";
import { PlayButton, RateToggle } from "@/components/player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lessonById, useHoorspel } from "@/lib/store";
import { useMediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/clip/$id")({ component: ClipPreview });

function ClipPreview() {
  const { id } = Route.useParams();
  const imported = useHoorspel((s) => s.imported);
  const lesson = lessonById(imported, id);
  const enqueue = useHoorspel((s) => s.enqueueLesson);
  const navigate = useNavigate();
  const [rate, setRate] = useState(0.92);
  const src = useMediaUrl(lesson?.media_id);

  if (!lesson) {
    return <Missing />;
  }

  const preview = lesson.segments.slice(0, 2);
  const previewText = preview.map((s) => s.text).join(" ");

  return (
    <div className="flex flex-col gap-5">
      <Link to="/shelf" className="text-sm text-muted-foreground hover:text-foreground">
        ← Find a clip
      </Link>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{lesson.cefr}</Badge>
          <Badge>{lesson.register}</Badge>
          <Badge>{lesson.licence.spdx}</Badge>
        </div>
        <h1 className="mt-2 font-display text-3xl">{lesson.title}</h1>
        <p className="mt-1 text-muted-foreground">{lesson.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDuration(lesson.duration_s)} · {lesson.speakers.map((s) => s.name).join(" & ")} ·{" "}
          {lesson.speech_rate_wpm} wpm · {lesson.region_label}
        </p>
      </header>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            20-second preview
          </p>
          <RateToggle value={rate} onChange={setRate} />
        </div>
        <PlayButton text={previewText} src={src} start={0} end={Math.min(20, lesson.duration_s)} rate={rate} label="Play preview" />
        <ul className="mt-3 space-y-2">
          {preview.map((s) => (
            <li key={s.id}>
              <p className="font-display text-lg" lang="nl">{s.text}</p>
              <p className="text-sm text-muted-foreground">{s.translation}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Attribution lesson={lesson} />

      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          enqueue(lesson);
          void navigate({ to: "/lesson/$id", params: { id: lesson.lesson_id } });
        }}
      >
        Use this clip
      </Button>
    </div>
  );
}

function Missing() {
  return (
    <div>
      <h1 className="font-display text-2xl">Clip not found</h1>
      <Link to="/shelf" className="mt-3 inline-block text-primary">
        Back to the shelf
      </Link>
    </div>
  );
}
