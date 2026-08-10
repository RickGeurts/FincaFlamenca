// Spaced-repetition scheduler: Leitner system with 5 boxes (0-4).
// Box 0 = new or lapsed (due immediately); higher boxes = longer intervals.
// Pure module — `now` is always injected, never read from the clock.

export interface WordProgress {
  wordId: string;
  box: 0 | 1 | 2 | 3 | 4;
  dueAt: number; // epoch ms
  seen: number;
  correct: number;
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** Interval until next review after landing in each box. */
export const BOX_INTERVALS_MS: readonly number[] = [
  0, // box 0: due immediately
  1 * DAY_MS, // box 1
  2 * DAY_MS, // box 2
  4 * DAY_MS, // box 3
  8 * DAY_MS, // box 4
];

/** How long a wrongly-answered word waits before it can come back (same session-ish). */
export const LAPSE_DELAY_MS = 10 * MINUTE_MS;

export const MAX_BOX = 4;

export function initProgress(wordId: string, now: number): WordProgress {
  return { wordId, box: 0, dueAt: now, seen: 0, correct: 0 };
}

/**
 * Apply a review result. Correct: move up one box (capped) and schedule by the
 * new box's interval. Wrong: drop one box (kind — never a full reset) and come
 * back after a short delay.
 */
export function review(p: WordProgress, wasCorrect: boolean, now: number): WordProgress {
  if (wasCorrect) {
    const box = Math.min(p.box + 1, MAX_BOX) as WordProgress["box"];
    return {
      ...p,
      box,
      dueAt: now + (BOX_INTERVALS_MS[box] ?? 0),
      seen: p.seen + 1,
      correct: p.correct + 1,
    };
  }
  const box = Math.max(p.box - 1, 0) as WordProgress["box"];
  return { ...p, box, dueAt: now + LAPSE_DELAY_MS, seen: p.seen + 1 };
}

export function isDue(p: WordProgress, now: number): boolean {
  return p.dueAt <= now;
}

/** Due words, most overdue first. */
export function dueWords(progress: Iterable<WordProgress>, now: number): WordProgress[] {
  return [...progress].filter((p) => isDue(p, now)).sort((a, b) => a.dueAt - b.dueAt);
}
