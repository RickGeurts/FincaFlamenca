import { describe, expect, it } from "vitest";
import {
  BOX_INTERVALS_MS,
  LAPSE_DELAY_MS,
  MAX_BOX,
  dueWords,
  initProgress,
  isDue,
  review,
} from "./srs";

const NOW = 1_700_000_000_000;

describe("initProgress", () => {
  it("starts in box 0, due immediately", () => {
    const p = initProgress("koe", NOW);
    expect(p.box).toBe(0);
    expect(isDue(p, NOW)).toBe(true);
    expect(p.seen).toBe(0);
  });
});

describe("review", () => {
  it("moves up a box on a correct answer and schedules the interval", () => {
    const p = review(initProgress("koe", NOW), true, NOW);
    expect(p.box).toBe(1);
    expect(p.dueAt).toBe(NOW + BOX_INTERVALS_MS[1]);
    expect(p.seen).toBe(1);
    expect(p.correct).toBe(1);
  });

  it("caps at the top box", () => {
    let p = initProgress("koe", NOW);
    for (let i = 0; i < 10; i++) p = review(p, true, NOW);
    expect(p.box).toBe(MAX_BOX);
    expect(p.dueAt).toBe(NOW + BOX_INTERVALS_MS[MAX_BOX]);
  });

  it("drops one box on a wrong answer, never below 0, and comes back soon", () => {
    let p = initProgress("koe", NOW);
    p = review(p, true, NOW);
    p = review(p, true, NOW);
    expect(p.box).toBe(2);
    p = review(p, false, NOW);
    expect(p.box).toBe(1);
    expect(p.dueAt).toBe(NOW + LAPSE_DELAY_MS);
    p = review(p, false, NOW);
    p = review(p, false, NOW);
    expect(p.box).toBe(0);
  });

  it("counts seen but not correct on a miss", () => {
    const p = review(initProgress("koe", NOW), false, NOW);
    expect(p.seen).toBe(1);
    expect(p.correct).toBe(0);
  });
});

describe("dueWords", () => {
  it("returns only due words, most overdue first", () => {
    const overdue = { ...initProgress("a", NOW), dueAt: NOW - 5000 };
    const justDue = { ...initProgress("b", NOW), dueAt: NOW };
    const future = { ...initProgress("c", NOW), dueAt: NOW + 5000 };
    const due = dueWords([future, justDue, overdue], NOW);
    expect(due.map((p) => p.wordId)).toEqual(["a", "b"]);
  });
});
