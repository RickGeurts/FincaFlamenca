import { describe, expect, it } from "vitest";
import { EMPTY_STREAK, daysBetween, touchStreak } from "./streak";

describe("daysBetween", () => {
  it("computes whole day differences", () => {
    expect(daysBetween("2026-08-01", "2026-08-02")).toBe(1);
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(0);
    expect(daysBetween("2026-07-31", "2026-08-02")).toBe(2);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("touchStreak", () => {
  it("starts at 1 on first activity", () => {
    expect(touchStreak(EMPTY_STREAK, "2026-08-09")).toEqual({
      days: 1,
      lastActive: "2026-08-09",
    });
  });

  it("does not change on a second session the same day", () => {
    const s = { days: 4, lastActive: "2026-08-09" };
    expect(touchStreak(s, "2026-08-09")).toEqual(s);
  });

  it("increments on consecutive days", () => {
    expect(touchStreak({ days: 4, lastActive: "2026-08-08" }, "2026-08-09").days).toBe(5);
  });

  it("one missed day is absorbed by the freeze", () => {
    expect(touchStreak({ days: 4, lastActive: "2026-08-07" }, "2026-08-09").days).toBe(5);
  });

  it("a longer gap pauses the streak instead of breaking it", () => {
    const s = touchStreak({ days: 10, lastActive: "2026-08-01" }, "2026-08-09");
    expect(s.days).toBe(10);
    expect(s.lastActive).toBe("2026-08-09");
  });
});
