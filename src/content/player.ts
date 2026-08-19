// Who the game is for.
//
// Finca Flamenca is a gift built for one person, so her name is not something
// the app asks for on a form — it is content, like the vocabulary and the
// dialogues, and it lives here where it can be read aloud in a greeting.

/** The player's name, used wherever the game speaks to her directly. */
export const PLAYER_NAME = "Carolina";

/**
 * Her birthday, as a local month and day. The greeting fires on this date and
 * is then marked as given, so it happens exactly once and never nags.
 */
export const BIRTHDAY = { month: 8, day: 19 } as const;

/** True on her birthday, in her own timezone — a gift is a local-day thing. */
export function isBirthday(now: number): boolean {
  const date = new Date(now);
  return date.getMonth() + 1 === BIRTHDAY.month && date.getDate() === BIRTHDAY.day;
}
