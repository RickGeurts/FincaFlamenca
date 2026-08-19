import { describe, expect, it } from "vitest";
import {
  BIRTHDAY,
  BIRTHDAY_WINDOW_DAYS,
  PLAYER_NAME,
  isBirthdayWindow,
  isWithinWindow,
} from "./player";

/** Local noon, so a timezone shift cannot slide the date either way. */
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12, 0, 0).getTime();

/** `offset` days after that year's birthday, at local noon. */
const afterBirthday = (offset: number, year = 2026) =>
  noon(year, BIRTHDAY.month, BIRTHDAY.day + offset);

describe("isBirthdayWindow", () => {
  it("is open on the day itself", () => {
    expect(isBirthdayWindow(afterBirthday(0))).toBe(true);
  });

  it("stays open for the rest of the window", () => {
    for (let day = 0; day < BIRTHDAY_WINDOW_DAYS; day++) {
      expect(isBirthdayWindow(afterBirthday(day)), `day ${day}`).toBe(true);
    }
  });

  it("closes the day the window runs out", () => {
    expect(isBirthdayWindow(afterBirthday(BIRTHDAY_WINDOW_DAYS))).toBe(false);
  });

  it("is shut the day before, so it never arrives early", () => {
    expect(isBirthdayWindow(afterBirthday(-1))).toBe(false);
  });

  it("holds at both edges of the local day", () => {
    const { month, day } = BIRTHDAY;
    expect(isBirthdayWindow(new Date(2026, month - 1, day, 0, 0, 0).getTime())).toBe(true);
    const last = new Date(2026, month - 1, day + BIRTHDAY_WINDOW_DAYS - 1, 23, 59, 59);
    expect(isBirthdayWindow(last.getTime())).toBe(true);
  });

  it("does not care which year it is", () => {
    expect(isBirthdayWindow(afterBirthday(0, 2031))).toBe(true);
    expect(isBirthdayWindow(afterBirthday(BIRTHDAY_WINDOW_DAYS, 2031))).toBe(false);
  });

  it("ignores the same day in another month", () => {
    const otherMonth = (BIRTHDAY.month % 12) + 1;
    expect(isBirthdayWindow(noon(2026, otherMonth, BIRTHDAY.day))).toBe(false);
  });
});

describe("isWithinWindow", () => {
  const newYearsEve = { month: 12, day: 30 };

  it("carries a December window into January", () => {
    expect(isWithinWindow(noon(2026, 12, 30), newYearsEve, 4)).toBe(true);
    expect(isWithinWindow(noon(2026, 12, 31), newYearsEve, 4)).toBe(true);
    expect(isWithinWindow(noon(2027, 1, 1), newYearsEve, 4)).toBe(true);
    expect(isWithinWindow(noon(2027, 1, 2), newYearsEve, 4)).toBe(true);
  });

  it("still closes on the far side of New Year", () => {
    expect(isWithinWindow(noon(2027, 1, 3), newYearsEve, 4)).toBe(false);
  });

  it("does not open early in the new year", () => {
    // 1 January is not inside a window that has not opened yet this year.
    expect(isWithinWindow(noon(2027, 6, 1), newYearsEve, 4)).toBe(false);
  });

  it("spans a leap day without losing a date", () => {
    const lateFebruary = { month: 2, day: 27 };
    // 2028 is a leap year: 27, 28, 29 Feb, then 1 March.
    expect(isWithinWindow(noon(2028, 2, 29), lateFebruary, 4)).toBe(true);
    expect(isWithinWindow(noon(2028, 3, 1), lateFebruary, 4)).toBe(true);
    expect(isWithinWindow(noon(2028, 3, 2), lateFebruary, 4)).toBe(false);
  });

  it("a one-day window is the day itself and nothing else", () => {
    expect(isWithinWindow(afterBirthday(0), BIRTHDAY, 1)).toBe(true);
    expect(isWithinWindow(afterBirthday(1), BIRTHDAY, 1)).toBe(false);
  });
});

describe("the player", () => {
  it("has a name for the game to greet", () => {
    expect(PLAYER_NAME.trim().length).toBeGreaterThan(0);
  });
});
