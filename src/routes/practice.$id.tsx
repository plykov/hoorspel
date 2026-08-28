import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlayButton } from "@/components/player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasSpeechRecognition, recognizeDutch, scoreTranscript } from "@/lib/speech";
import { useMediaUrl } from "@/lib/media";
import { lessonById, useHoorspel } from "@/lib/store";
import type { Exercise } from "@/lib/types";
import {
  choiceIsCorrect,
  cn,
  joinDutch,
  sameDutch,
  shuffle,
  shuffleWordOrder,
  tokenizeDutch,
} from "@/lib/utils";
import { Mic } from "lucide-react";

export const Route = createFileRoute("/practice/$id")({ component: PracticePage });

function PracticePage() {
  const { id } = Route.useParams();
  const imported = useHoorspel((s) => s.imported);
  const lesson = lessonById(imported, id);
  const log = useHoorspel((s) => s.logAttempt);
  const mark = useHoorspel((s) => s.markProgress);
  const enqueue = useHoorspel((s) => s.enqueueLesson);
  const rawProgress = useHoorspel((s) => s.progress[id]);
  const src = useMediaUrl(lesson?.media_id);
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [correctN, setCorrectN] = useState(0);
  const started = useRef(Date.now());
  useEffect(() => {
    started.current = Date.now();
  }, [idx]);
  const [order, setOrder] = useState<string[]>([]);

  const droppedKey = (rawProgress?.dropped_vocab ?? []).join(",");
  const grammarKey = (rawProgress?.dropped_grammar ?? []).join(",");
  const knownKey = (rawProgress?.known_vocab ?? []).join(",");
  const pool = useMemo(() => {
    if (!lesson) return [];
    const droppedV = new Set(droppedKey ? droppedKey.split(",") : []);
    const droppedG = new Set(grammarKey ? grammarKey.split(",") : []);
    const known = new Set(knownKey ? knownKey.split(",") : []);
    return lesson.exercises.filter((ex) => {
      if (ex.rule && droppedG.has(ex.rule)) return false;
      const answer = Array.isArray(ex.answer) ? ex.answer[0] : ex.answer;
      const hit = lesson.vocabulary.find(
        (v) =>
          (droppedV.has(v.id) || known.has(v.id)) &&
          (answer === v.dutch ||
            answer === v.lemma ||
            String(answer).toLowerCase() === v.dutch.toLowerCase()),
      );
      if (hit && (ex.kind === "gapfill" || ex.kind === "reduction")) return false;
      return true;
    });
  }, [lesson, droppedKey, grammarKey, knownKey]);

  const poolKey = pool.map((e) => e.id).join(",");
  useLayoutEffect(() => {
    setOrder(shuffle(poolKey ? poolKey.split(",") : []));
    setIdx(0);
    setCorrectN(0);
  }, [id, poolKey]);

  if (!lesson) {
    return <p>Lesson not found.</p>;
  }
  const current = lesson;

  const queue = order
    .map((eid) => pool.find((e) => e.id === eid))
    .filter((e): e is Exercise => Boolean(e));
  const ex = queue[idx];

  if (!ex && pool.length > 0 && order.length === 0) {
    return null;
  }

  function finish(correct: boolean, rule?: Exercise["rule"]) {
    if (!ex) return;
    log({
      target_id: ex.id,
      kind: "exercise",
      correct,
      rule,
      latency_ms: Math.max(400, Date.now() - started.current),
    });
    started.current = Date.now();
    if (correct) setCorrectN((n) => n + 1);
    if (idx + 1 >= queue.length) {
      enqueue(current);
      mark(current.lesson_id, { percent: 100 });
    }
    setIdx((i) => i + 1);
  }

  if (!ex) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl">{pool.length === 0 ? "Nothing left to practise." : "Done for now."}</h1>
        <p className="text-muted-foreground">
          {pool.length === 0
            ? "You dropped or marked known every item. Restore some from the lesson, or pick another clip."
            : `${correctN} of ${queue.length || pool.length} correct. Cards from this clip are in your queue.`}
        </p>
        <Button asChild>
          <Link to="/review">Open review queue</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/lesson/$id" params={{ id: current.lesson_id }}>
            Back to the lesson
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {idx + 1} / {queue.length} · {ex.kind}
      </p>
      <h1 className="font-display text-2xl">{ex.prompt}</h1>
      <ExerciseView
        key={ex.id}
        ex={ex}
        src={src}
        lesson={current}
        onSkip={() => finish(false, ex.rule)}
        onAnswer={(ok) => finish(ok, ex.rule)}
      />
      <button
        type="button"
        className="text-sm text-muted-foreground"
        onClick={() => void navigate({ to: "/lesson/$id", params: { id: current.lesson_id } })}
      >
        Exit practice
      </button>
    </div>
  );
}

function ExerciseView({
  ex,
  src,
  lesson,
  onAnswer,
  onSkip,
}: {
  ex: Exercise;
  src?: string | null;
  lesson: { segments: { text: string; start: number; end: number }[] };
  onAnswer: (ok: boolean) => void;
  onSkip: () => void;
}) {
  const expected = Array.isArray(ex.answer) ? ex.answer[0] : ex.answer;
  const seg =
    lesson.segments.find((s) => s.text === ex.target) ??
    lesson.segments.find((s) => s.start === ex.span_start);

  if (ex.kind === "dictation") {
    return (
      <Dictation
        expected={expected}
        target={ex.target}
        src={src}
        start={seg?.start}
        end={seg?.end}
        onAnswer={onAnswer}
      />
    );
  }
  if (ex.kind === "gapfill" || ex.kind === "reduction" || ex.kind === "comprehension") {
    return (
      <Choices
        options={ex.options ?? [expected]}
        expected={expected}
        target={ex.target}
        src={src}
        start={seg?.start}
        end={seg?.end}
        onAnswer={onAnswer}
      />
    );
  }
  if (ex.kind === "wordorder") {
    return <WordOrder expected={expected} tokens={ex.options ?? tokenizeDutch(expected)} onAnswer={onAnswer} />;
  }
  if (ex.kind === "transform") {
    return <Transform expected={expected} target={ex.target} onAnswer={onAnswer} />;
  }
  if (ex.kind === "repeat" || ex.kind === "shadow") {
    return <Repeat target={ex.target} expected={expected} src={src} start={seg?.start} end={seg?.end} onAnswer={onAnswer} onSkip={onSkip} />;
  }
  return (
    <Button onClick={() => onAnswer(true)} variant="secondary">
      Continue
    </Button>
  );
}

function Dictation({
  expected,
  target,
  src,
  start,
  end,
  onAnswer,
}: {
  expected: string;
  target: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean) => void;
}) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const score = scoreTranscript(expected, val);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <PlayButton text={target} src={src} start={start} end={end} label="Play line" />
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Type what you hear"
        autoCapitalize="off"
        autoCorrect="off"
        onKeyDown={(e) => {
          if (e.key === "Enter" && checked === null) setChecked(score >= 70);
        }}
      />
      {checked === null ? (
        <Button
          onClick={() => {
            setChecked(score >= 70);
          }}
        >
          Check
        </Button>
      ) : (
        <>
          <p className={checked ? "text-good" : "text-destructive"}>
            {checked ? `Close enough · ${score}%` : `Not yet · ${score}%`}
          </p>
          <p className="text-sm text-muted-foreground">{joinDutch(tokenizeDutch(expected))}</p>
          <Button onClick={() => onAnswer(Boolean(checked))}>Next</Button>
        </>
      )}
    </Card>
  );
}

function Choices({
  options,
  expected,
  target,
  src,
  start,
  end,
  onAnswer,
}: {
  options: string[];
  expected: string;
  target: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean) => void;
}) {
  const optionKey = options.join("\0");
  const [order, setOrder] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  useLayoutEffect(() => {
    setOrder(shuffle(optionKey ? optionKey.split("\0") : []));
    setPicked(null);
  }, [optionKey]);

  const pickedOk = picked !== null && choiceIsCorrect(picked, expected);

  return (
    <Card className="flex flex-col gap-3 p-4">
      {target ? <PlayButton text={target} src={src} start={start} end={end} label="Play" /> : null}
      <div className="flex flex-col gap-2">
        {order.map((o, i) => {
          const mine = picked === o;
          return (
            <button
              key={`${o}-${i}`}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(o)}
              className={cn(
                "min-h-11 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm",
                "bg-muted",
                mine && pickedOk && "bg-good/15 text-good",
                mine && !pickedOk && "bg-destructive/10 text-destructive",
                mine && "ring-2 ring-foreground/20",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked ? (
        <>
          <p className={pickedOk ? "text-good" : "text-destructive"}>
            {pickedOk ? "That's right." : "Not this time."}
          </p>
          <Button onClick={() => onAnswer(pickedOk)}>Next</Button>
        </>
      ) : null}
    </Card>
  );
}

function WordOrder({
  expected,
  tokens,
  onAnswer,
}: {
  expected: string;
  tokens: string[];
  onAnswer: (ok: boolean) => void;
}) {
  const tokenKey = tokens.join("\0");
  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setPool(shuffleWordOrder(tokenKey ? tokenKey.split("\0") : []));
    setBuilt([]);
    setChecked(null);
  }, [tokenKey]);

  const joined = joinDutch(built);
  const ok = sameDutch(joined, expected);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex min-h-14 flex-wrap gap-2 rounded-[var(--radius-md)] bg-muted p-2">
        {built.map((t, i) => (
          <button
            key={`${t}-${i}`}
            type="button"
            className="h-9 rounded-[var(--radius-sm)] bg-card px-2.5 text-sm shadow-[var(--shadow-border)]"
            onClick={() => {
              setBuilt(built.filter((_, j) => j !== i));
              setPool([...pool, t]);
              setChecked(null);
            }}
          >
            {t}
          </button>
        ))}
        {built.length ? (
          <p className="w-full px-0.5 pt-1 text-sm text-foreground" lang="nl">{joined}</p>
        ) : (
          <p className="self-center px-1 text-sm text-muted-foreground">Tap tiles to build the sentence</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((t, i) => (
          <button
            key={`${t}-p-${i}`}
            type="button"
            className="h-11 rounded-[var(--radius-sm)] bg-secondary px-3 text-sm"
            onClick={() => {
              setPool(pool.filter((_, j) => j !== i));
              setBuilt([...built, t]);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {checked === null ? (
        <Button disabled={!built.length} onClick={() => setChecked(ok)}>
          Check
        </Button>
      ) : (
        <>
          {ok ? (
            <p className="text-good">Right order.</p>
          ) : (
            <p className="text-destructive" lang="nl">
              {joinDutch(tokenizeDutch(expected))}
            </p>
          )}
          <Button onClick={() => onAnswer(ok)}>Next</Button>
        </>
      )}
    </Card>
  );
}

function Transform({
  expected,
  target,
  onAnswer,
}: {
  expected: string;
  target: string;
  onAnswer: (ok: boolean) => void;
}) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const ok = scoreTranscript(expected, val) >= 75;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="font-display text-lg" lang="nl">{target}</p>
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Rewrite in Dutch" />
      {checked === null ? (
        <Button onClick={() => setChecked(ok)}>Check</Button>
      ) : (
        <>
          <p className={ok ? "text-good" : "text-destructive"}>{ok ? "Accepted." : joinDutch(tokenizeDutch(expected))}</p>
          <Button onClick={() => onAnswer(ok)}>Next</Button>
        </>
      )}
    </Card>
  );
}

function Repeat({
  target,
  expected,
  src,
  start: clipStart,
  end: clipEnd,
  onAnswer,
  onSkip,
}: {
  target: string;
  expected: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean) => void;
  onSkip: () => void;
}) {
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const can = hasSpeechRecognition();

  function beginListen() {
    setListening(true);
    setHeard("");
    const stop = recognizeDutch((text, final) => {
      setHeard(text);
      if (final) {
        setListening(false);
        stop();
      }
    });
  }

  const score = heard ? scoreTranscript(expected, heard) : 0;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="font-display text-xl" lang="nl">{target}</p>
      <PlayButton text={target} src={src} start={clipStart} end={clipEnd} label="Listen" />
      {can ? (
        <Button variant={listening ? "primary" : "secondary"} onClick={beginListen}>
          <Mic className="size-4" />
          {listening ? "Listening…" : "Hold to speak (tap)"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Speech recognition is not available in this browser. Play, repeat out loud, then continue.
        </p>
      )}
      {heard ? (
        <p className="text-sm">
          Heard: {heard} · {score}%
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={() => onAnswer(score >= 55 || !can)}>{can ? "Next" : "I said it"}</Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </Card>
  );
}