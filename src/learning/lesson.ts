// Lesson session builder: composes exercise sessions from unit content and
// SRS state, plus farm-driven micro-learning (chore questions, wilt revival).
// Pure module — randomness and time are injected.

import type {
  Exercise,
  ChoiceExercise,
  LessonUnit,
  PickAsk,
  PickExercise,
  Word,
} from "../content/types";
import { CHORE_QUESTION_CHANCE, REVIVE_SESSION_MAX } from "../game/economy";
import type { GradeResult } from "./grader";
import { grade, normalize } from "./grader";
import { dueWords, type WordProgress } from "./srs";

export const SESSION_MIN = 8;
export const SESSION_MAX = 12;

export type Rng = () => number; // [0, 1)

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How many times a fully aligned match grid is re-dealt before giving up. */
const MATCH_REDEAL_LIMIT = 5;

function fullyAligned(left: readonly string[], right: readonly string[], es: Map<string, string>) {
  return left.every((nl, i) => es.get(nl) === right[i]);
}

/**
 * The two columns of a match exercise, each in its own order.
 *
 * Both columns are dealt from a single generator on purpose. Two separately
 * seeded ones are seeded from the same millisecond and produce the identical
 * permutation, which puts every word on the same row as its own translation
 * and lets her solve the whole grid without reading a word of it.
 *
 * Even independent shuffles land fully aligned now and then — one time in 24
 * with four pairs — so such a grid is re-dealt. The limit keeps a set that
 * cannot be misaligned (a single pair) from spinning forever.
 */
export function shuffleMatchColumns(
  pairs: readonly { nl: string; es: string }[],
  rng: Rng,
): { left: string[]; right: string[] } {
  const es = new Map(pairs.map((p) => [p.nl, p.es]));
  const left = shuffle(pairs.map((p) => p.nl), rng);
  let right = shuffle(pairs.map((p) => p.es), rng);
  for (let i = 0; i < MATCH_REDEAL_LIMIT && fullyAligned(left, right, es); i++) {
    right = shuffle(right, rng);
  }
  return { left, right };
}

/**
 * Build a lesson session of SESSION_MIN..SESSION_MAX exercises from a unit.
 * If the unit has fewer than SESSION_MIN exercises, repeats are added
 * (reshuffled) so a session always has enough practice.
 */
export function buildLessonSession(unit: LessonUnit, rng: Rng): Exercise[] {
  let session = shuffle(unit.exercises, rng).slice(0, SESSION_MAX);
  while (session.length < SESSION_MIN && unit.exercises.length > 0) {
    const refill = shuffle(unit.exercises, rng);
    session = session.concat(refill.slice(0, SESSION_MIN - session.length));
  }
  return session;
}

function displayNl(word: Word): string {
  return word.article ? `${word.article} ${word.nl}` : word.nl;
}

/**
 * Up to three other words to offer alongside the right answer, drawn from the
 * same category when there are enough of them — telling a cow from a horse is
 * the exercise; telling a cow from a raincoat is not.
 *
 * Words that mean or read the same as this one are left out, so an option is
 * never right in a way the grader would call wrong.
 */
function neighbourWords(word: Word, vocab: Word[], rng: Rng): Word[] {
  const others = vocab.filter(
    (w) => w.id !== word.id && w.es !== word.es && w.nl !== word.nl,
  );
  const sameCategory = others.filter((w) => w.category === word.category);
  const pool = sameCategory.length >= 3 ? sameCategory : others;
  return shuffle(pool, rng).slice(0, 3);
}

/**
 * One choice exercise for a single word (Dutch prompt -> pick the Spanish
 * meaning), distractors drawn from the same category when possible.
 * Returns null if the word is unknown or no distractors exist.
 */
export function buildWordChoice(
  wordId: string,
  vocab: Word[],
  rng: Rng,
): ChoiceExercise | null {
  const word = vocab.find((w) => w.id === wordId);
  if (!word) return null;
  const distractors = neighbourWords(word, vocab, rng).map((w) => w.es);
  if (distractors.length === 0) return null;
  return {
    type: "choice",
    prompt_nl: displayNl(word),
    answer_es: word.es,
    distractors_es: distractors,
    word: word.id,
  };
}

/** Box at which a word starts being asked for its article, and backwards. */
const ARTICLE_FROM_BOX = 1;
const RECALL_FROM_BOX = 2;

/**
 * The ways a word can be asked in a review, given how well she knows it.
 *
 * A word she has only just met is asked the way she met it: the Dutch in front
 * of her, meanings to choose between. Once it has stuck a little the question
 * turns around — Spanish first, and she has to find the Dutch, which is the
 * harder direction and the one that has to work in the end — and it starts
 * arriving through the ear as well as the eye.
 *
 * The article joins as soon as the word has stuck at all. De/het is learned
 * one word at a time and never learned by reading alone, and a review that
 * only ever asks what a word means will let her go a year without deciding.
 *
 * A word that lapses drops a box and with it these questions, so a word she is
 * struggling with is asked the gentlest way until it is back on its feet.
 */
function reviewAsks(word: Word, box: number, canListen: boolean): PickAsk[] {
  const asks: PickAsk[] = ["meaning"];
  if (word.article && box >= ARTICLE_FROM_BOX) asks.push("article");
  if (box >= RECALL_FROM_BOX) asks.push("recall");
  if (box >= RECALL_FROM_BOX && canListen) asks.push("listen");
  return asks;
}

/** The two Dutch articles, always offered in this order — a stable pair reads faster. */
const ARTICLES = ["de", "het"];

/** One review question about one word, or null if the vocab cannot furnish it. */
function buildPick(
  ask: PickAsk,
  word: Word,
  vocab: Word[],
  rng: Rng,
): PickExercise | null {
  if (ask === "article") {
    if (!word.article) return null;
    return {
      type: "pick",
      ask,
      prompt: word.nl,
      prompt_lang: "nl",
      options: [...ARTICLES],
      options_lang: "nl",
      answer: word.article,
      // "de" on its own is not an answer worth reading back; "de koe" is.
      reveal: displayNl(word),
      word: word.id,
    };
  }

  const others = neighbourWords(word, vocab, rng);
  if (others.length === 0) return null;

  if (ask === "recall") {
    const answer = displayNl(word);
    return {
      type: "pick",
      ask,
      prompt: word.es,
      prompt_lang: "es",
      options: shuffle([answer, ...others.map(displayNl)], rng),
      options_lang: "nl",
      answer,
      word: word.id,
    };
  }

  // meaning and listen ask the same question; only the prompt differs, and for
  // `listen` the card says it aloud instead of printing it. No `reveal` for
  // either: the answer is the Spanish, and the card is what writes the Dutch
  // out afterwards for the one she only heard.
  return {
    type: "pick",
    ask,
    prompt: displayNl(word),
    prompt_lang: "nl",
    options: shuffle([word.es, ...others.map((w) => w.es)], rng),
    options_lang: "es",
    answer: word.es,
    word: word.id,
  };
}

export interface ReviewOptions {
  /** Whether this device can say a Dutch word aloud. */
  canListen?: boolean;
}

/**
 * One question about one word, asked from a side the word has earned.
 *
 * The way round is drawn rather than fixed, so the same word asked twice in a
 * week is not the same question twice. Returns null only if the word is
 * unknown, or the vocabulary is too thin to furnish any wrong answers at all.
 */
export function buildWordQuestion(
  wordId: string,
  box: number,
  vocab: Word[],
  rng: Rng,
  opts: ReviewOptions = {},
): PickExercise | null {
  const word = vocab.find((w) => w.id === wordId);
  if (!word) return null;
  const asks = reviewAsks(word, box, opts.canListen ?? false);
  // Start at the drawn ask and walk on, so a word the vocabulary cannot
  // furnish a question for falls back to one it can rather than dropping out.
  const start = Math.floor(rng() * asks.length);
  for (let i = 0; i < asks.length; i++) {
    const exercise = buildPick(asks[(start + i) % asks.length], word, vocab, rng);
    if (exercise) return exercise;
  }
  return null;
}

/**
 * Build the daily review from the words that have come due.
 *
 * One question per word, but not the same question every day: which way round
 * a word is asked is drawn from the ways it has earned (see `reviewAsks`). She
 * meets these same words every morning for months, and a review that always
 * asks "what does this mean?" teaches her to recognise a shape rather than to
 * know a word.
 */
export function buildReviewSession(
  due: WordProgress[],
  vocab: Word[],
  rng: Rng,
  opts: ReviewOptions = {},
): Exercise[] {
  const session: Exercise[] = [];
  for (const progress of due.slice(0, SESSION_MAX)) {
    const exercise = buildWordQuestion(progress.wordId, progress.box, vocab, rng, opts);
    if (exercise) session.push(exercise);
  }
  return session;
}

/** Roughly 1 in 3 chores triggers a one-tap review question. */
export function shouldTriggerChoreQuestion(rng: Rng): boolean {
  return rng() < CHORE_QUESTION_CHANCE;
}

/**
 * Pick the word for a chore question: the tapped object's own word, or
 * (half the time, when available) a due word from the SRS queue.
 */
export function pickChoreWordId(
  objectWordId: string,
  progress: WordProgress[],
  now: number,
  rng: Rng,
): string {
  const due = dueWords(progress, now).filter((p) => p.wordId !== objectWordId);
  if (due.length > 0 && rng() < 0.5) {
    return due[Math.floor(rng() * due.length)].wordId;
  }
  return objectWordId;
}

/**
 * Short review session that revives wilted crops: due words first, then other
 * seen words, then any vocab — so there is always something to review.
 */
export function buildReviveSession(
  progress: WordProgress[],
  vocab: Word[],
  now: number,
  rng: Rng,
): ChoiceExercise[] {
  const due = dueWords(progress, now).map((p) => p.wordId);
  const seen = progress.map((p) => p.wordId);
  const all = vocab.map((w) => w.id);
  const candidates: string[] = [];
  for (const id of [...due, ...shuffle(seen, rng), ...shuffle(all, rng)]) {
    if (!candidates.includes(id)) candidates.push(id);
  }
  const session: ChoiceExercise[] = [];
  for (const id of candidates) {
    if (session.length >= REVIVE_SESSION_MAX) break;
    const exercise = buildWordChoice(id, vocab, rng);
    if (exercise) session.push(exercise);
  }
  return session; // capped at REVIVE_SESSION_MAX by the loop; MIN is best-effort
}

/**
 * Grade a submitted answer for any exercise type.
 * - choice: exact option match
 * - translate / listen: tolerant text grading against answer + accept list
 * - assemble: tiles are exact words, so no typo tolerance
 * - match: the UI tracks pair mistakes; grading happens there
 * - pick: exact option match, shown back as the option's `reveal` if it has one
 */
export function gradeExercise(exercise: Exercise, answer: string): GradeResult {
  switch (exercise.type) {
    case "choice":
      return {
        correct: answer === exercise.answer_es,
        typo: false,
        expected: exercise.answer_es,
      };
    case "translate":
      return grade(answer, [exercise.answer_nl, ...(exercise.accept ?? [])]);
    case "listen":
      return grade(answer, [exercise.answer_nl, ...(exercise.accept ?? [])]);
    case "assemble": {
      const correct = normalize(answer) === normalize(exercise.answer_nl);
      return { correct, typo: false, expected: exercise.answer_nl };
    }
    case "match":
      return { correct: true, typo: false, expected: "" };
    case "pick":
      return {
        correct: answer === exercise.answer,
        typo: false,
        expected: exercise.reveal ?? exercise.answer,
      };
  }
}

/** Word ids an exercise gives SRS credit for. */
export function exerciseWordIds(exercise: Exercise): string[] {
  if (exercise.type === "match") {
    return exercise.pairs.flatMap((p) => (p.word ? [p.word] : []));
  }
  return exercise.word ? [exercise.word] : [];
}
