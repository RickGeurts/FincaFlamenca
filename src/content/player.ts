// Who the game is for.
//
// Finca Flamenca is a gift built for one person, so her name is not something
// the app asks for on a form — it is content, like the vocabulary and the
// dialogues, and it lives here where it can be read aloud in a greeting.

/** The player's name, used wherever the game speaks to her directly. */
export const PLAYER_NAME = "Carolina";

/** A day of the year, without a year attached. */
export interface MonthDay {
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
}

/** Her birthday, as a local month and day. */
export const BIRTHDAY: MonthDay = { month: 8, day: 19 };

/**
 * How long the greeting stays on offer, counting the birthday itself.
 *
 * Not one day: a phone that stays in a bag until the weekend would otherwise
 * miss the only thing the app was made to say. She still sees it exactly once
 * — `birthdayGreeted` closes it the moment she has read it — so the window
 * only decides how long it waits for her, never how often it appears.
 */
export const BIRTHDAY_WINDOW_DAYS = 4;

/** Local midnight, so a window is counted in her days and not in hours. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Whole days from an anniversary of `date` to the day `now` falls on.
 *
 * Rounded, because a clock change inside the span shifts it by an hour and a
 * truncating divide would then report the wrong day.
 */
function daysSince(now: number, date: MonthDay, year: number): number {
  const then = new Date(year, date.month - 1, date.day);
  return Math.round((startOfDay(new Date(now)) - startOfDay(then)) / 86_400_000);
}

/**
 * Is `now` inside the `days`-long window that opens on `date`?
 *
 * Takes the date and the length rather than reading the constants, so the
 * awkward cases — a window running over New Year above all — can be tested
 * without moving her birthday to December.
 */
export function isWithinWindow(now: number, date: MonthDay, days: number): boolean {
  const year = new Date(now).getFullYear();
  // Last year's date as well: a window opened in late December is still open
  // in January, when `year` has already ticked over.
  return [year, year - 1].some((y) => {
    const since = daysSince(now, date, y);
    return since >= 0 && since < days;
  });
}

/** True on her birthday and for a few days after. */
export function isBirthdayWindow(now: number): boolean {
  return isWithinWindow(now, BIRTHDAY, BIRTHDAY_WINDOW_DAYS);
}
