import { describe, expect, it } from "vitest";
import {
  cropState,
  growthProgress,
  plant,
  readyAt,
  revive,
  water,
  wiltAt,
} from "./crops";
import { WATER_BOOST, WILT_AFTER_MS, getCropDef } from "./economy";

const NOW = 1_700_000_000_000;
const wortel = getCropDef("wortel"); // 30 min grow
const koffie = getCropDef("koffie"); // 8 h prestige

describe("crop lifecycle", () => {
  it("starts growing and becomes ready after growMs", () => {
    const crop = plant("wortel", NOW);
    expect(cropState(crop, wortel, NOW)).toBe("growing");
    expect(cropState(crop, wortel, NOW + wortel.growMs - 1)).toBe("growing");
    expect(cropState(crop, wortel, NOW + wortel.growMs)).toBe("ready");
  });

  it("wilts after the wilt window", () => {
    const crop = plant("wortel", NOW);
    const wiltTime = NOW + wortel.growMs + WILT_AFTER_MS;
    expect(cropState(crop, wortel, wiltTime - 1)).toBe("ready");
    expect(cropState(crop, wortel, wiltTime)).toBe("wilted");
    expect(wiltAt(crop, wortel)).toBe(readyAt(crop, wortel) + WILT_AFTER_MS);
  });

  it("progress goes from 0 to 1", () => {
    const crop = plant("koffie", NOW);
    expect(growthProgress(crop, koffie, NOW)).toBe(0);
    expect(growthProgress(crop, koffie, NOW + koffie.growMs / 2)).toBeCloseTo(0.5);
    expect(growthProgress(crop, koffie, NOW + koffie.growMs * 2)).toBe(1);
  });
});

describe("dev fast mode (growMsOverride)", () => {
  it("uses the override for ready time and progress", () => {
    const crop = plant("koffie", NOW, 10_000);
    expect(cropState(crop, koffie, NOW + 9_999)).toBe("growing");
    expect(cropState(crop, koffie, NOW + 10_000)).toBe("ready");
    expect(growthProgress(crop, koffie, NOW + 5_000)).toBeCloseTo(0.5);
  });

  it("watering boosts relative to the override", () => {
    const crop = water(plant("koffie", NOW, 10_000), koffie);
    expect(readyAt(crop, koffie)).toBe(NOW + 10_000 * (1 - WATER_BOOST));
  });
});

describe("water", () => {
  it("shaves WATER_BOOST off the grow time", () => {
    const crop = water(plant("koffie", NOW), koffie);
    expect(crop.watered).toBe(true);
    expect(readyAt(crop, koffie)).toBe(NOW + koffie.growMs * (1 - WATER_BOOST));
  });

  it("only works once", () => {
    const once = water(plant("koffie", NOW), koffie);
    const twice = water(once, koffie);
    expect(twice).toEqual(once);
  });
});

describe("revive", () => {
  it("makes a wilted crop freshly ready with a new wilt window", () => {
    const crop = plant("wortel", NOW);
    const muchLater = NOW + wortel.growMs + WILT_AFTER_MS + 999_999;
    expect(cropState(crop, wortel, muchLater)).toBe("wilted");
    const revived = revive(crop, wortel, muchLater);
    expect(cropState(revived, wortel, muchLater)).toBe("ready");
    expect(wiltAt(revived, wortel)).toBe(muchLater + WILT_AFTER_MS);
  });
});
