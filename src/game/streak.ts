// Streak logic. Kind, never punishing: one missed day is a free "freeze",
// and longer absences pause the streak instead of resetting it to zero.

export interface Streak {
  days: number;
  lastActive: string; // local date string "YYYY-MM-DD", "" if never active
}

export const EMPTY_STREAK: Streak = { days: 0, lastActive: "" };

/** Whole days between two "YYYY-MM-DD" strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86_400_000);
}

/**
 * Register activity on `today`. Rules:
 * - first ever activity        -> streak starts at 1
 * - same day again             -> unchanged
 * - next day                   -> +1
 * - one missed day (gap of 2)  -> +1 (the freeze absorbs the missed day)
 * - longer gap                 -> days kept as-is (paused, not broken)
 */
export function touchStreak(streak: Streak, today: string): Streak {
  if (!streak.lastActive) return { days: 1, lastActive: today };
  const gap = daysBetween(streak.lastActive, today);
  if (gap <= 0) return streak;
  if (gap <= 2) return { days: streak.days + 1, lastActive: today };
  return { days: Math.max(streak.days, 1), lastActive: today };
}
