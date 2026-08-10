import { describe, expect, it } from "vitest";
import type { LessonUnit, Word } from "../content/types";
import { mulberry32 } from "../utils/rng";
import { initProgress } from "./srs";
import {
  SESSION_MAX,
  SESSION_MIN,
  buildLessonSession,
  buildReviewSession,
  buildReviveSession,
  buildWordChoice,
  exerciseWordIds,
  gradeExercise,
  pickChoreWordId,
  shouldTriggerChoreQuestion,
  shuffle,
} from "./lesson";

const makeUnit = (exerciseCount: number): LessonUnit => ({
  unit: 1,
  title_es: "Prueba",
  title_nl: "Test",
  reviewed: false,
  words: [],
  exercises: Array.from({ length: exerciseCount }, (_, i) => ({
    type: "choice" as const,
    prompt_nl: `woord${i}`,
    answer_es: `palabra${i}`,
    distractors_es: ["a", "b", "c"],
  })),
});

const VOCAB: Word[] = [
  { id: "koe", nl: "koe", article: "de", es: "la vaca", category: "animals", unit: 3 },
  { id: "kip", nl: "kip", article: "de", es: "la gallina", category: "animals", unit: 3 },
  { id: "paard", nl: "paard", article: "het", es: "el caballo", category: "animals", unit: 3 },
  { id: "schaap", nl: "schaap", article: "het", es: "la oveja", category: "animals", unit: 3 },
  { id: "varken", nl: "varken", article: "het", es: "el cerdo", category: "animals", unit: 3 },
  { id: "hallo", nl: "hallo", es: "hola", category: "greetings", unit: 1 },
];

describe("shuffle", () => {
  it("is deterministic for a given seed and keeps all items", () => {
    const a = shuffle([1, 2, 3, 4, 5], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5], mulberry32(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildLessonSession", () => {
  it("caps a large unit at SESSION_MAX", () => {
    const session = buildLessonSession(makeUnit(30), mulberry32(1));
    expect(session.length).toBe(SESSION_MAX);
  });

  it("tops up a small unit to at least SESSION_MIN", () => {
    const session = buildLessonSession(makeUnit(3), mulberry32(1));
    expect(session.length).toBeGreaterThanOrEqual(SESSION_MIN);
  });

  it("returns an empty session for an empty unit", () => {
    expect(buildLessonSession(makeUnit(0), mulberry32(1))).toEqual([]);
  });
});

describe("buildReviewSession", () => {
  it("builds one choice exercise per due word with 3 distractors", () => {
    const due = [initProgress("koe", 0), initProgress("hallo", 0)];
    const session = buildReviewSession(due, VOCAB, mulberry32(7));
    expect(session).toHaveLength(2);
    const koe = session.find((e) => e.word === "koe")!;
    expect(koe.prompt_nl).toBe("de koe");
    expect(koe.answer_es).toBe("la vaca");
    expect(koe.distractors_es).toHaveLength(3);
    expect(koe.distractors_es).not.toContain("la vaca");
  });

  it("prefers same-category distractors", () => {
    const session = buildReviewSession([initProgress("koe", 0)], VOCAB, mulberry32(7));
    const animalEs = VOCAB.filter((w) => w.category === "animals").map((w) => w.es);
    for (const d of session[0].distractors_es) {
      expect(animalEs).toContain(d);
    }
  });

  it("skips unknown word ids", () => {
    const session = buildReviewSession([initProgress("bestaat-niet", 0)], VOCAB, mulberry32(7));
    expect(session).toEqual([]);
  });
});

describe("chore questions", () => {
  it("triggers roughly 1 in 3 chores (deterministic rng)", () => {
    expect(shouldTriggerChoreQuestion(() => 0.1)).toBe(true);
    expect(shouldTriggerChoreQuestion(() => 0.5)).toBe(false);
  });

  it("uses the object's word when nothing is due", () => {
    const id = pickChoreWordId("koe", [], 0, mulberry32(1));
    expect(id).toBe("koe");
  });

  it("can pick a due word instead of the object's word", () => {
    const due = [{ ...initProgress("kip", 0), dueAt: -1 }];
    // rng sequence: first call < 0.5 chooses the due branch
    const id = pickChoreWordId("koe", due, 0, () => 0.1);
    expect(id).toBe("kip");
  });
});

describe("buildWordChoice", () => {
  it("builds a card with the article in the prompt", () => {
    const ex = buildWordChoice("paard", VOCAB, mulberry32(3));
    expect(ex).not.toBeNull();
    expect(ex!.prompt_nl).toBe("het paard");
    expect(ex!.distractors_es).toHaveLength(3);
  });

  it("returns null for an unknown word", () => {
    expect(buildWordChoice("bestaat-niet", VOCAB, mulberry32(3))).toBeNull();
  });
});

describe("buildReviveSession", () => {
  it("falls back to vocab words when nothing was ever reviewed", () => {
    const session = buildReviveSession([], VOCAB, 0, mulberry32(5));
    expect(session.length).toBeGreaterThan(0);
    expect(session.length).toBeLessThanOrEqual(6);
  });

  it("puts due words first", () => {
    const due = [{ ...initProgress("koe", 0), dueAt: -1 }];
    const session = buildReviveSession(due, VOCAB, 0, mulberry32(5));
    expect(session[0].word).toBe("koe");
  });

  it("has no duplicate words", () => {
    const session = buildReviveSession([], VOCAB, 0, mulberry32(5));
    const ids = session.map((e) => e.word);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("gradeExercise", () => {
  it("grades choice by exact option", () => {
    const ex = makeUnit(1).exercises[0];
    expect(gradeExercise(ex, "palabra0").correct).toBe(true);
    expect(gradeExercise(ex, "a").correct).toBe(false);
  });

  it("grades translate tolerantly", () => {
    const r = gradeExercise(
      { type: "translate", prompt_es: "La vaca come hierba.", answer_nl: "De koe eet gras." },
      "de koe eet gras",
    );
    expect(r.correct).toBe(true);
  });

  it("grades assemble without typo tolerance", () => {
    const ex = {
      type: "assemble" as const,
      prompt_es: "El caballo bebe agua.",
      tiles_nl: ["Het", "paard", "drinkt", "water"],
      answer_nl: "Het paard drinkt water.",
    };
    expect(gradeExercise(ex, "Het paard drinkt water").correct).toBe(true);
    expect(gradeExercise(ex, "Het paard water drinkt").correct).toBe(false);
  });
});

describe("exerciseWordIds", () => {
  it("collects the word of a simple exercise", () => {
    expect(
      exerciseWordIds({
        type: "choice",
        prompt_nl: "de koe",
        answer_es: "la vaca",
        distractors_es: [],
        word: "koe",
      }),
    ).toEqual(["koe"]);
  });

  it("collects all pair words of a match exercise", () => {
    expect(
      exerciseWordIds({
        type: "match",
        pairs: [
          { nl: "koe", es: "vaca", word: "koe" },
          { nl: "kip", es: "gallina", word: "kip" },
          { nl: "x", es: "y" },
        ],
      }),
    ).toEqual(["koe", "kip"]);
  });
});
