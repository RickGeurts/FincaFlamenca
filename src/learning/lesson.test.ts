import { describe, expect, it } from "vitest";
import type { LessonUnit, PickAsk, PickExercise, Word } from "../content/types";
import { mulberry32 } from "../utils/rng";
import { initProgress, type WordProgress } from "./srs";
import {
  SESSION_MAX,
  SESSION_MIN,
  buildLessonSession,
  buildReviewSession,
  buildReviveSession,
  buildWordChoice,
  buildWordQuestion,
  exerciseWordIds,
  gradeExercise,
  pickChoreWordId,
  shouldTriggerChoreQuestion,
  shuffle,
  shuffleMatchColumns,
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

describe("shuffleMatchColumns", () => {
  const pairs = [
    { nl: "de kip", es: "la gallina" },
    { nl: "het varken", es: "el cerdo" },
    { nl: "het ei", es: "el huevo" },
    { nl: "de melk", es: "la leche" },
  ];
  const esFor = (nl: string) => pairs.find((p) => p.nl === nl)!.es;
  const aligned = (left: string[], right: string[]) =>
    left.every((nl, i) => esFor(nl) === right[i]);

  it("keeps every word, on both sides", () => {
    const { left, right } = shuffleMatchColumns(pairs, mulberry32(7));
    expect([...left].sort()).toEqual(pairs.map((p) => p.nl).sort());
    expect([...right].sort()).toEqual(pairs.map((p) => p.es).sort());
  });

  it("never lines a word up with its own translation across many deals", () => {
    // The bug this guards: both columns were dealt from separately seeded
    // generators, which — seeded from the same millisecond — produced the same
    // permutation every time, so the whole grid could be solved row by row
    // without reading it.
    for (let seed = 0; seed < 500; seed++) {
      const { left, right } = shuffleMatchColumns(pairs, mulberry32(seed));
      expect(aligned(left, right), `seed ${seed} dealt a fully aligned grid`).toBe(false);
    }
  });

  it("gives up rather than spinning on a set that cannot be misaligned", () => {
    const one = [{ nl: "de kip", es: "la gallina" }];
    const { left, right } = shuffleMatchColumns(one, mulberry32(1));
    expect(left).toEqual(["de kip"]);
    expect(right).toEqual(["la gallina"]);
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
  const settled = (wordId: string, box: WordProgress["box"]) => ({
    ...initProgress(wordId, 0),
    box,
  });
  /** Every way the review asks about a word over many deals. */
  const asksOver = (
    progress: WordProgress,
    deals: number,
    opts?: { canListen: boolean },
  ) => {
    const seen = new Set<string>();
    for (let seed = 0; seed < deals; seed++) {
      for (const ex of buildReviewSession([progress], VOCAB, mulberry32(seed), opts)) {
        if (ex.type === "pick") seen.add(ex.ask);
      }
    }
    return seen;
  };

  it("builds one question per due word", () => {
    const due = [initProgress("koe", 0), initProgress("hallo", 0)];
    const session = buildReviewSession(due, VOCAB, mulberry32(7));
    expect(session).toHaveLength(2);
    expect(session.map((e) => e.type === "pick" && e.word).sort()).toEqual(["hallo", "koe"]);
  });

  it("asks a freshly met word only what it means", () => {
    // Box 0 is new or just lapsed. Asking her to produce a word she cannot
    // yet recognise is the discouraging kind of hard, so it is not asked.
    expect(asksOver(initProgress("koe", 0), 60, { canListen: true })).toEqual(
      new Set(["meaning"]),
    );
  });

  it("asks a word she knows from every side", () => {
    expect(asksOver(settled("koe", 4), 60, { canListen: true })).toEqual(
      new Set(["meaning", "article", "recall", "listen"]),
    );
  });

  it("stays silent on a device with no Dutch voice", () => {
    expect(asksOver(settled("koe", 4), 60, { canListen: false })).not.toContain("listen");
  });

  it("never asks the article of a word that has none", () => {
    // "hallo" is not a noun; there is no de/het to ask for.
    expect(asksOver(settled("hallo", 4), 60)).not.toContain("article");
  });

  it("offers de and het, and reads the whole answer back", () => {
    const article = firstAsk("koe", "article");
    expect(article.options).toEqual(["de", "het"]);
    expect(article.prompt).toBe("koe"); // bare: the article is the question
    expect(article.answer).toBe("de");
    expect(article.reveal).toBe("de koe");
    expect(gradeExercise(article, "het").correct).toBe(false);
    expect(gradeExercise(article, "de")).toMatchObject({ correct: true, expected: "de koe" });
  });

  it("asks backwards in Spanish, with Dutch answers carrying their article", () => {
    const recall = firstAsk("koe", "recall");
    expect(recall.prompt).toBe("la vaca");
    expect(recall.prompt_lang).toBe("es");
    expect(recall.options_lang).toBe("nl");
    expect(recall.answer).toBe("de koe");
    expect(recall.options).toContain("de koe");
    expect(recall.options).toHaveLength(4);
    // Every option is a word she could be shown — articles included, so the
    // wrong ones teach de/het too.
    for (const option of recall.options) {
      expect(option).toMatch(/^(de|het) \S|^\S+$/);
    }
  });

  it("never repeats an option, whichever way round it asks", () => {
    for (let seed = 0; seed < 200; seed++) {
      const due = VOCAB.slice(0, 12).map((w) => settled(w.id, 4));
      for (const ex of buildReviewSession(due, VOCAB, mulberry32(seed), { canListen: true })) {
        if (ex.type !== "pick") continue;
        expect(new Set(ex.options).size, `seed ${seed}: ${ex.options}`).toBe(ex.options.length);
        expect(ex.options).toContain(ex.answer);
      }
    }
  });

  it("prefers same-category distractors", () => {
    const meaning = firstAsk("koe", "meaning");
    const animalEs = VOCAB.filter((w) => w.category === "animals").map((w) => w.es);
    for (const option of meaning.options) expect(animalEs).toContain(option);
  });

  it("caps a long queue at one session", () => {
    // A month away leaves far more due than one sitting; she is asked a
    // session's worth and the rest keeps.
    const big: Word[] = Array.from({ length: 40 }, (_, i) => ({
      id: `w${i}`,
      nl: `woord${i}`,
      article: "de",
      es: `palabra${i}`,
      category: "test",
      unit: 1,
    }));
    const due = big.map((w) => initProgress(w.id, 0));
    expect(buildReviewSession(due, big, mulberry32(2)).length).toBe(SESSION_MAX);
  });

  it("skips unknown word ids", () => {
    const session = buildReviewSession([initProgress("bestaat-niet", 0)], VOCAB, mulberry32(7));
    expect(session).toEqual([]);
  });
});

describe("buildWordQuestion", () => {
  it("returns nothing for a word the vocabulary does not have", () => {
    expect(buildWordQuestion("bestaat-niet", 4, VOCAB, mulberry32(1))).toBeNull();
  });

  it("asks a word met for the first time on the farm only what it means", () => {
    // A chore question about a word she has never seen has to be answerable
    // from the card she just tapped, not from memory she has not built yet.
    for (let seed = 0; seed < 40; seed++) {
      const q = buildWordQuestion("koe", 0, VOCAB, mulberry32(seed), { canListen: true });
      expect(q!.ask).toBe("meaning");
    }
  });
});

/** The first deal that asks `wordId` the given way — for inspecting one shape. */
function firstAsk(wordId: string, ask: PickAsk): PickExercise {
  for (let seed = 0; seed < 500; seed++) {
    const [ex] = buildReviewSession(
      [{ ...initProgress(wordId, 0), box: 4 }],
      VOCAB,
      mulberry32(seed),
      { canListen: true },
    );
    if (ex?.type === "pick" && ex.ask === ask) return ex;
  }
  throw new Error(`no ${ask} question was ever dealt for ${wordId}`);
}

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
