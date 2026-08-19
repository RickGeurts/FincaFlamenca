import { describe, expect, it } from "vitest";
import { BIRTHDAY, PLAYER_NAME, isBirthday } from "./player";

/** Local noon, so a timezone shift cannot slide the date either way. */
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12, 0, 0).getTime();

describe("isBirthday", () => {
  it("is true on the day itself", () => {
    expect(isBirthday(noon(2026, BIRTHDAY.month, BIRTHDAY.day))).toBe(true);
  });

  it("is false the day before and the day after", () => {
    expect(isBirthday(noon(2026, BIRTHDAY.month, BIRTHDAY.day - 1))).toBe(false);
    expect(isBirthday(noon(2026, BIRTHDAY.month, BIRTHDAY.day + 1))).toBe(false);
  });

  it("holds at both edges of the local day", () => {
    const { month, day } = BIRTHDAY;
    expect(isBirthday(new Date(2026, month - 1, day, 0, 0, 0).getTime())).toBe(true);
    expect(isBirthday(new Date(2026, month - 1, day, 23, 59, 59).getTime())).toBe(true);
  });

  it("does not care which year it is", () => {
    expect(isBirthday(noon(2031, BIRTHDAY.month, BIRTHDAY.day))).toBe(true);
  });

  it("ignores the same day in another month", () => {
    const otherMonth = (BIRTHDAY.month % 12) + 1;
    expect(isBirthday(noon(2026, otherMonth, BIRTHDAY.day))).toBe(false);
  });
});

describe("the player", () => {
  it("has a name for the game to greet", () => {
    expect(PLAYER_NAME.trim().length).toBeGreaterThan(0);
  });
});
