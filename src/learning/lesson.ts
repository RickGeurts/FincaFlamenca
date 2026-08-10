// Lesson session builder: composes exercise sessions from unit content and
// SRS state, plus farm-driven micro-learning (chore questions, wilt revival).
// Pure module — randomness and time are injected.

import type { Exercise, ChoiceExercise, LessonUnit, Word } from "../content/types";
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
  const others = vocab.filter((w) => w.id !== word.id && w.es !== word.es);
  const sameCategory = others.filter((w) => w.category === word.category);
  const pool = sameCategory.length >= 3 ? sameCategory : others;
  const distractors = shuffle(pool, rng)
    .slice(0, 3)
    .map((w) => w.es);
  if (distractors.length === 0) return null;
  return {
    type: "choice",
    prompt_nl: displayNl(word),
    answer_es: word.es,
    distractors_es: distractors,
    word: word.id,
  };
}

/** Build a review session from due words: one choice exercise per word. */
export function buildReviewSession(
  due: WordProgress[],
  vocab: Word[],
  rng: Rng,
): ChoiceExercise[] {
  const session: ChoiceExercise[] = [];
  for (const progress of due.slice(0, SESSION_MAX)) {
    const exercise = buildWordChoice(progress.wordId, vocab, rng);
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
  }
}

/** Word ids an exercise gives SRS credit for. */
export function exerciseWordIds(exercise: Exercise): string[] {
  if (exercise.type === "match") {
    return exercise.pairs.flatMap((p) => (p.word ? [p.word] : []));
  }
  return exercise.word ? [exercise.word] : [];
}
