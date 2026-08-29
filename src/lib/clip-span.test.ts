import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipSpan } from "./clip-span.ts";
import type { Segment, Word } from "./types.ts";

function word(text: string, start: number, end: number): Word {
  return { text, start, end, conf: 0.9, speaker: "A" };
}

function seg(id: string, text: string, start: number, end: number, words: Word[]): Segment {
  return { id, speaker: "A", start, end, text, translation: "", words };
}

const segs: Segment[] = [
  seg("s0", "Goedemorgen, zegt u het maar.", 0.4, 2.8, [
    word("Goedemorgen,", 0.4, 1.1),
    word("zegt", 1.2, 1.5),
    word("u", 1.5, 1.65),
    word("het", 1.65, 1.9),
    word("maar.", 1.9, 2.8),
  ]),
  seg("s1", "Mag ik twee bolletjes?", 3.1, 5.4, [
    word("Mag", 3.1, 3.3),
    word("ik", 3.3, 3.45),
    word("twee", 3.45, 3.8),
    word("bolletjes?", 3.8, 5.4),
  ]),
];

describe("clipSpan", () => {
  it("matches a line even when token spacing differs from the exercise target", () => {
    const span = clipSpan(segs, { target: "Goedemorgen, zegt u het maar.", span_start: 0 });
    assert.equal(span?.start, 0.4);
    assert.equal(span?.end, 2.8);
  });

  it("does not fall back to the whole take when guessed span_start is 0", () => {
    const span = clipSpan(segs, { target: "Mag ik twee bolletjes?", span_start: 0 });
    assert.equal(span?.start, 3.1);
    assert.equal(span?.end, 5.4);
  });

  it("cuts a single word when the target is not a full line", () => {
    const span = clipSpan(segs, { target: "bolletjes" });
    assert.ok(span);
    assert.equal(span.start, 3.8);
    assert.ok(span.end > 3.8);
    assert.ok(span.end < 6);
  });

  it("uses the covering line when only a guessed timestamp is available", () => {
    const span = clipSpan(segs, { span_start: 4.0 });
    assert.equal(span?.start, 3.1);
    assert.equal(span?.end, 5.4);
  });
});
