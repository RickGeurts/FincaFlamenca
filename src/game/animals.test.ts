import { describe, expect, it } from "vitest";
import {
  collect,
  createAnimal,
  displayName,
  feed,
  hasProduce,
  isHungry,
} from "./animals";
import { getSpeciesDef } from "./economy";

const NOW = 1_700_000_000_000;
const kip = getSpeciesDef("kip");

describe("hunger cycle", () => {
  it("a new animal is hungry", () => {
    expect(isHungry(createAnimal("a1", "kip"), kip, NOW)).toBe(true);
  });

  it("feeding satisfies until hungerAfterMs passes", () => {
    const fed = feed(createAnimal("a1", "kip"), kip, NOW);
    expect(fed.lastFedAt).toBe(NOW);
    expect(isHungry(fed, kip, NOW + kip.hungerAfterMs - 1)).toBe(false);
    expect(isHungry(fed, kip, NOW + kip.hungerAfterMs)).toBe(true);
  });

  it("feeding a full animal is a no-op", () => {
    const fed = feed(createAnimal("a1", "kip"), kip, NOW);
    expect(feed(fed, kip, NOW + 1000)).toEqual(fed);
  });

  it("feeding raises happiness, capped at 100", () => {
    let a = createAnimal("a1", "kip"); // starts at 80
    a = feed(a, kip, NOW);
    expect(a.happiness).toBe(90);
    a = feed(a, kip, NOW + kip.hungerAfterMs);
    a = feed(a, kip, NOW + kip.hungerAfterMs * 2);
    expect(a.happiness).toBe(100);
  });
});

describe("produce", () => {
  it("appears produceMs after feeding and can be collected once", () => {
    const fed = feed(createAnimal("a1", "kip"), kip, NOW);
    expect(hasProduce(fed, kip, NOW + kip.produceMs - 1)).toBe(false);
    expect(hasProduce(fed, kip, NOW + kip.produceMs)).toBe(true);

    const collected = collect(fed, kip, NOW + kip.produceMs);
    expect(hasProduce(collected, kip, NOW + kip.produceMs + 1)).toBe(false);
  });

  it("an unfed animal has no produce", () => {
    expect(hasProduce(createAnimal("a1", "kip"), kip, NOW)).toBe(false);
  });

  it("collecting with nothing ready is a no-op", () => {
    const a = createAnimal("a1", "kip");
    expect(collect(a, kip, NOW)).toEqual(a);
  });

  it("produce returns after the next feed cycle", () => {
    let a = feed(createAnimal("a1", "kip"), kip, NOW);
    a = collect(a, kip, NOW + kip.produceMs);
    a = feed(a, kip, NOW + kip.hungerAfterMs);
    expect(hasProduce(a, kip, NOW + kip.hungerAfterMs + kip.produceMs)).toBe(true);
  });
});

describe("displayName", () => {
  it("uses the given name, falling back to the species word", () => {
    const a = createAnimal("a1", "kip");
    expect(displayName(a, kip)).toBe("kip");
    expect(displayName({ ...a, name: "Manchas" }, kip)).toBe("Manchas");
    expect(displayName({ ...a, name: "  " }, kip)).toBe("kip");
  });
});
