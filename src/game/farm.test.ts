import { describe, expect, it } from "vitest";
import { plant } from "./crops";
import {
  FARM_COLS,
  FARM_ROWS,
  addDecor,
  canTill,
  initialFarm,
  migratePlotsToTiles,
  tillTile,
} from "./farm";

describe("initialFarm", () => {
  it("starts as an open meadow with one chicken", () => {
    const farm = initialFarm();
    expect(farm.tiles).toHaveLength(FARM_COLS * FARM_ROWS);
    expect(farm.tiles.every((t) => t.kind === "grass")).toBe(true);
    expect(farm.animals).toHaveLength(1);
    expect(farm.animals[0].speciesId).toBe("kip");
  });
});

describe("tillTile", () => {
  /** The starting layout puts a building over some tiles; pick a free one. */
  const openTile = (farm = initialFarm()) => farm.tiles.find((t) => canTill(farm, t.id))!.id;

  it("turns grass into a field", () => {
    const id = openTile();
    const farm = tillTile(initialFarm(), id);
    expect(farm.tiles.find((t) => t.id === id)?.kind).toBe("field");
  });

  it("leaves other tiles untouched and is a no-op on fields", () => {
    const id = openTile();
    const once = tillTile(initialFarm(), id);
    const twice = tillTile(once, id);
    expect(twice.tiles).toEqual(once.tiles);
    expect(twice.tiles.filter((t) => t.kind === "field")).toHaveLength(1);
  });

  it("refuses the tiles the farmhouse stands on", () => {
    // She starts on bare ground, so the house has to be put up before there
    // is anything standing in the way of the plough.
    const farm = addDecor(initialFarm(), "huis");
    const covered = farm.tiles.filter((t) => !canTill(farm, t.id));
    // Four plots under the 2x2 house, and one under the starting hen.
    expect(covered).toHaveLength(5);
    for (const tile of covered) expect(tillTile(farm, tile.id)).toBe(farm);
  });
});

describe("migratePlotsToTiles", () => {
  it("moves old plots with their crops onto field tiles", () => {
    const crop = plant("wortel", 123);
    const farm = migratePlotsToTiles(
      [{ id: "p1", crop }, { id: "p2" }],
      [],
    );
    const fields = farm.tiles.filter((t) => t.kind === "field");
    expect(fields).toHaveLength(2);
    expect(fields[0].crop).toEqual(crop);
    expect(fields[1].crop).toBeUndefined();
    expect(farm.animals).toHaveLength(1); // falls back to the starter chicken
  });

  it("keeps existing animals", () => {
    const farm = migratePlotsToTiles([], [
      { id: "a1", speciesId: "kip", name: "Manchas", lastFedAt: 5, lastCollectedAt: 0, happiness: 90 },
    ]);
    expect(farm.animals[0].name).toBe("Manchas");
  });
});
