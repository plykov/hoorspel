import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlayButton } from "@/components/player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasSpeechRecognition, recognizeDutch, scoreSpeaking, scoreTranscript } from "@/lib/speech";
import { envelopeFromText, resample, ScoreMeters, WaveRow } from "@/components/waveform";
import { useMediaUrl } from "@/lib/media";
import { lessonById, useHoorspel, weakPointsOf } from "@/lib/store";
import type { Exercise, Segment } from "@/lib/types";
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
  const attempts = useHoorspel((s) => s.attempts);
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
    const ids = poolKey ? poolKey.split(",") : [];
    const byId = new Map(pool.map((e) => [e.id, e]));
    const hotRules = new Set(
      weakPointsOf(attempts)
        .filter((w) => w.n >= 2 && w.accuracy < 0.75)
        .slice(0, 2)
        .map((w) => w.rule),
    );
    const hot = ids.filter((eid) => {
      const ex = byId.get(eid);
      return Boolean(ex?.rule && hotRules.has(ex.rule));
    });
    const cold = ids.filter((eid) => !hot.includes(eid));
    setOrder([...shuffle(hot), ...shuffle(cold)]);
    setIdx(0);
    setCorrectN(0);
    // attempts are read once per lesson/pool so answering does not reshuffle
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function finish(correct: boolean, rule?: Exercise["rule"], score?: number) {
    if (!ex) return;
    log({
      target_id: ex.id,
      kind: "exercise",
      correct,
      rule,
      score,
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
        onAnswer={(ok, score) => finish(ok, ex.rule, score)}
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
  lesson: { segments: Segment[] };
  onAnswer: (ok: boolean, score?: number) => void;
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
        rate={ex.rate}
        onAnswer={onAnswer}
      />
    );
  }
  if (ex.kind === "disfluency") {
    return (
      <DisfluencyTap
        expected={expected}
        target={ex.target}
        words={seg?.words ?? []}
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
  if (ex.kind === "roleplay") {
    return (
      <RolePlay
        cue={ex.target}
        expected={expected}
        hint={ex.hint}
        src={src}
        start={seg?.start}
        end={seg?.end}
        onAnswer={onAnswer}
        onSkip={onSkip}
      />
    );
  }
  if (ex.kind === "shadow") {
    return (
      <Shadow
        target={ex.target}
        expected={expected}
        src={src}
        start={seg?.start}
        end={seg?.end}
        onAnswer={onAnswer}
        onSkip={onSkip}
      />
    );
  }
  if (ex.kind === "repeat") {
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
  rate,
  onAnswer,
}: {
  options: string[];
  expected: string;
  target: string;
  src?: string | null;
  start?: number;
  end?: number;
  rate?: number;
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
      {target ? (
        <PlayButton text={target} src={src} start={start} end={end} rate={rate ?? 0.92} label={rate ? `Play ${rate}×` : "Play"} />
      ) : null}
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

function DisfluencyTap({
  expected,
  target,
  words,
  src,
  start,
  end,
  onAnswer,
}: {
  expected: string;
  target: string;
  words: Segment["words"];
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const tiles = words.length ? words.map((w) => w.text) : tokenizeDutch(target);
  const pickedOk = picked !== null && choiceIsCorrect(picked, expected);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <PlayButton text={target} src={src} start={start} end={end} label="Play line" />
      <p className="text-sm text-muted-foreground">Tap the hesitation, restart, or repair.</p>
      <div className="flex flex-wrap gap-2">
        {tiles.map((t, i) => {
          const mine = picked === t;
          return (
            <button
              key={`${t}-${i}`}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(t)}
              className={cn(
                "min-h-11 rounded-[var(--radius-sm)] px-3 text-sm",
                "bg-muted",
                mine && pickedOk && "bg-good/15 text-good",
                mine && !pickedOk && "bg-destructive/10 text-destructive",
                mine && "ring-2 ring-foreground/20",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      {picked ? (
        <>
          <p className={pickedOk ? "text-good" : "text-destructive"}>
            {pickedOk ? "That's the hitch." : `The hesitation was ${expected}.`}
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
  const [fails, setFails] = useState(0);

  useLayoutEffect(() => {
    setPool(shuffleWordOrder(tokenKey ? tokenKey.split("\0") : []));
    setBuilt([]);
    setChecked(null);
    setFails(0);
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
      ) : ok ? (
        <>
          <p className="text-good">Right order.</p>
          <Button onClick={() => onAnswer(true)}>Next</Button>
        </>
      ) : fails < 1 ? (
        <>
          <p className="text-destructive">Not yet. Try once more.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setFails((n) => n + 1);
              setChecked(null);
            }}
          >
            Try again
          </Button>
        </>
      ) : (
        <>
          <p className="text-destructive" lang="nl">
            {joinDutch(tokenizeDutch(expected))}
          </p>
          <Button onClick={() => onAnswer(false)}>Next</Button>
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

function Shadow({
  target,
  expected,
  src,
  start,
  end,
  onAnswer,
  onSkip,
}: {
  target: string;
  expected: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean, score?: number) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {step === 0 ? "1 / 3 · slow" : step === 1 ? "2 / 3 · normal" : "3 / 3 · speak"}
      </p>
      <p className="font-display text-xl" lang="nl">
        {target}
      </p>
      {step < 2 ? (
        <>
          <PlayButton
            text={target}
            src={src}
            start={start}
            end={end}
            rate={step === 0 ? 0.75 : 1}
            label={step === 0 ? "Play 0.75×" : "Play 1.0×"}
          />
          <Button onClick={() => setStep(step === 0 ? 1 : 2)}>
            {step === 0 ? "Heard it slow" : "Ready to speak"}
          </Button>
        </>
      ) : (
        <Repeat
          target={target}
          expected={expected}
          src={src}
          start={start}
          end={end}
          onAnswer={onAnswer}
          onSkip={onSkip}
          hidePrompt
        />
      )}
    </Card>
  );
}

function RolePlay({
  cue,
  expected,
  hint,
  src,
  start,
  end,
  onAnswer,
  onSkip,
}: {
  cue: string;
  expected: string;
  hint?: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean, score?: number) => void;
  onSkip: () => void;
}) {
  const [heardCue, setHeardCue] = useState(false);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">They say</p>
      <p className="font-display text-xl" lang="nl">
        {cue}
      </p>
      <PlayButton
        text={cue}
        src={src}
        start={start}
        end={end}
        label="Play their line"
        onEnd={() => setHeardCue(true)}
      />
      {hint ? <p className="text-sm text-muted-foreground">Your move: {hint}</p> : null}
      {heardCue ? (
        <Repeat target={expected} expected={expected} onAnswer={onAnswer} onSkip={onSkip} hidePrompt />
      ) : (
        <Button variant="secondary" onClick={() => setHeardCue(true)}>
          Ready to answer
        </Button>
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
  hidePrompt = false,
}: {
  target: string;
  expected: string;
  src?: string | null;
  start?: number;
  end?: number;
  onAnswer: (ok: boolean, score?: number) => void;
  onSkip: () => void;
  hidePrompt?: boolean;
}) {
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [attempt, setAttempt] = useState<number[]>([]);
  const [actualMs, setActualMs] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const startedAt = useRef(0);
  const can = hasSpeechRecognition();
  const reference = useMemo(() => envelopeFromText(expected || target), [expected, target]);
  const expectedMs = clipStart != null && clipEnd != null && clipEnd > clipStart
    ? (clipEnd - clipStart) * 1000
    : tokenizeDutch(expected).length * 320;

  useEffect(() => () => stopRef.current?.(), []);

  async function beginSpeak() {
    if (listening) return;
    setListening(true);
    setHeard("");
    setAttempt([]);
    startedAt.current = Date.now();
    const samples: number[] = [];
    let recStop = () => {};
    let recogStop = () => {};

    if (can) {
      recogStop = recognizeDutch((text, final) => {
        setHeard(text);
        if (final) recogStop();
      });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const timer = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i]! - 128) / 128;
          sum += v * v;
        }
        samples.push(Math.min(1, Math.sqrt(sum / data.length) * 3.5));
      }, 40);
      recStop = () => {
        window.clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    } catch {
      recStop = () => {};
    }

    const stop = () => {
      recogStop();
      recStop();
      setAttempt(resample(samples, 28));
      setActualMs(Date.now() - startedAt.current);
      setListening(false);
      stopRef.current = null;
    };
    stopRef.current = stop;
    window.setTimeout(() => {
      if (stopRef.current === stop) stop();
    }, 8000);
  }

  function endSpeak() {
    stopRef.current?.();
  }

  const scores = scoreSpeaking(expected, heard, { expectedMs, actualMs });
  const ready = Boolean(heard) || attempt.some((v) => v > 0.12);

  return (
    <Card className={hidePrompt ? "flex flex-col gap-3 border-0 p-0 shadow-none" : "flex flex-col gap-3 p-4"}>
      {hidePrompt ? null : <p className="font-display text-xl" lang="nl">{target}</p>}
      {hidePrompt ? null : <PlayButton text={target} src={src} start={clipStart} end={clipEnd} label="Listen" />}
      <WaveRow values={reference} label="Reference" tone="ref" />
      <WaveRow values={attempt.length ? attempt : Array.from({ length: 28 }, () => 0.08)} label="Your attempt" tone="mine" />
      <Button
        variant={listening ? "primary" : "secondary"}
        onPointerDown={(e) => {
          e.preventDefault();
          void beginSpeak();
        }}
        onPointerUp={endSpeak}
        onPointerCancel={endSpeak}
      >
        <Mic className="size-4" />
        {listening ? "Listening…" : "Hold to speak"}
      </Button>
      {!can ? (
        <p className="text-sm text-muted-foreground">
          Speech recognition is not available in this browser. The waveform still records if the mic is allowed.
        </p>
      ) : null}
      {heard ? <p className="text-sm">Heard: {heard}</p> : null}
      {ready ? <ScoreMeters accuracy={scores.accuracy} fluency={scores.fluency} completeness={scores.completeness} /> : null}
      <div className="flex gap-2">
        <Button
          onClick={() => onAnswer(scores.accuracy >= 55 || !can, heard ? scores.accuracy : undefined)}
        >
          {can || ready ? "Next" : "I said it"}
        </Button>
        {ready ? (
          <Button
            variant="secondary"
            onClick={() => {
              setHeard("");
              setAttempt([]);
              setActualMs(0);
            }}
          >
            Try again
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </Card>
  );
}
