import { describe, expect, it } from "vitest";
import {
  ANIMAL_SPECIES,
  CROPS,
  ECONOMY,
  sessionReward,
  streakMultiplier,
  unlockedUnitsForXp,
  xpRequiredForUnit,
} from "./economy";

describe("streakMultiplier", () => {
  it("is 1 below day 3", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(2)).toBe(1);
  });
  it("is 1.25 from day 3", () => {
    expect(streakMultiplier(3)).toBe(1.25);
    expect(streakMultiplier(6)).toBe(1.25);
  });
  it("caps at 1.5 from day 7", () => {
    expect(streakMultiplier(7)).toBe(1.5);
    expect(streakMultiplier(100)).toBe(1.5);
  });
});

describe("sessionReward", () => {
  it("pays base lesson reward", () => {
    const r = sessionReward({ kind: "lesson", correct: 6, total: 10, streakDays: 0 });
    expect(r.munten).toBe(ECONOMY.LESSON_MUNTEN);
    expect(r.perfect).toBe(false);
  });

  it("adds the perfect bonus", () => {
    const r = sessionReward({ kind: "lesson", correct: 10, total: 10, streakDays: 0 });
    expect(r.munten).toBe(ECONOMY.LESSON_MUNTEN + ECONOMY.LESSON_PERFECT_BONUS);
    expect(r.perfect).toBe(true);
  });

  it("applies the streak multiplier", () => {
    const r = sessionReward({ kind: "lesson", correct: 10, total: 10, streakDays: 7 });
    expect(r.munten).toBe(Math.round((15 + 5) * 1.5));
  });

  it("pays review reward", () => {
    const r = sessionReward({ kind: "review", correct: 3, total: 5, streakDays: 0 });
    expect(r.munten).toBe(ECONOMY.REVIEW_MUNTEN);
  });

  it("grants xp per correct answer plus completion xp", () => {
    const r = sessionReward({ kind: "lesson", correct: 7, total: 10, streakDays: 0 });
    expect(r.xp).toBe(ECONOMY.XP_SESSION_COMPLETE + 7 * ECONOMY.XP_PER_CORRECT);
  });

  it("an empty session is never 'perfect'", () => {
    const r = sessionReward({ kind: "review", correct: 0, total: 0, streakDays: 0 });
    expect(r.perfect).toBe(false);
  });
});

describe("farm balancing tables", () => {
  it("every crop sells for at least 2x its seed cost", () => {
    for (const crop of CROPS) {
      expect(crop.sellPrice, crop.id).toBeGreaterThanOrEqual(crop.seedCost * 2);
    }
  });

  it("seed costs and grow times stay within the design range", () => {
    for (const crop of CROPS) {
      expect(crop.seedCost).toBeGreaterThanOrEqual(5);
      expect(crop.seedCost).toBeLessThanOrEqual(30);
      expect(crop.growMs).toBeGreaterThanOrEqual(30 * 60_000);
      expect(crop.growMs).toBeLessThanOrEqual(8 * 3_600_000);
    }
  });

  it("animals produce after feeding, before getting hungry again", () => {
    for (const species of ANIMAL_SPECIES) {
      expect(species.produceMs, species.id).toBeLessThan(species.hungerAfterMs);
    }
  });

  it("a revive session pays no munten but still grants xp", () => {
    const r = sessionReward({ kind: "revive", correct: 4, total: 5, streakDays: 10 });
    expect(r.munten).toBe(0);
    expect(r.xp).toBeGreaterThan(0);
  });
});

describe("unit unlocks", () => {
  it("unit 1 is free", () => {
    expect(xpRequiredForUnit(1)).toBe(0);
    expect(unlockedUnitsForXp(0)).toEqual([1]);
  });
  it("unlocks progressively with xp", () => {
    expect(unlockedUnitsForXp(ECONOMY.XP_PER_UNIT_UNLOCK)).toEqual([1, 2]);
    expect(unlockedUnitsForXp(ECONOMY.XP_PER_UNIT_UNLOCK * 3)).toEqual([1, 2, 3, 4]);
  });
});
