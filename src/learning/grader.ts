// Answer grading: accent/case tolerant, punctuation ignored, and one typo
// allowed (Levenshtein <= 1) with a gentle spelling nudge.

export interface GradeResult {
  correct: boolean;
  /** Correct but with a small typo — show "¡Cuidado con la ortografía!" */
  typo: boolean;
  /** The canonical expected answer, for kind feedback when wrong. */
  expected: string;
}

/** Answers shorter than this get no typo tolerance ("ja" vs "na" matters). */
const TYPO_MIN_LENGTH = 4;

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // strip accents/diacritics (combining marks after NFD)
    .toLowerCase()
    .replace(/[.,!?¡¿;:'"«»()]/g, "") // punctuation never counts against her
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Grade a typed answer against one or more accepted answers.
 * `accepted[0]` is treated as the canonical form shown in feedback.
 */
export function grade(input: string, accepted: string[]): GradeResult {
  const expected = accepted[0] ?? "";
  const normInput = normalize(input);
  const normAccepted = accepted.map(normalize);

  if (normAccepted.some((a) => a === normInput)) {
    return { correct: true, typo: false, expected };
  }
  if (normInput.length >= TYPO_MIN_LENGTH) {
    if (normAccepted.some((a) => levenshtein(a, normInput) <= 1)) {
      return { correct: true, typo: true, expected };
    }
  }
  return { correct: false, typo: false, expected };
}
