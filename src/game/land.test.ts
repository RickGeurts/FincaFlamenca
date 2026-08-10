// Buying land from the town hall makes the meadow bigger. The thing that must
// not happen is her crops moving: tiles are stored by index, and a wider grid
// renumbers every index, so an expansion done carelessly shuffles a morning's
// planting across the farm.

import { describe, expect, it } from "vitest";
import { expandFarm, initialFarm, landSize, tillTile, LAND_SIZES } from "./farm";
import * as crops from "./crops";
import { PLACE_COLS, PLACE_ROWS, tileCell } from "./placement";

/** Where a tile sits on the island, by id. */
function cellOf(farm: ReturnType<typeof initialFarm>, tileId: string) {
  const index = farm.tiles.findIndex((t) => t.id === tileId);
  return tileCell(farm.cols, farm.rows, index);
}

describe("how much land there is", () => {
  it("starts smaller than the island and ends filling it", () => {
    expect(landSize(1).cols).toBeLessThan(PLACE_COLS);
    expect(landSize(LAND_SIZES.length)).toEqual({ cols: PLACE_COLS, rows: PLACE_ROWS });
  });

  it("keeps every size on whole cells", () => {
    // A meadow whose parity differs from the island sits half a cell off
    // centre, and every rule in the game counts in whole cells.
    for (const size of LAND_SIZES) {
      expect((PLACE_COLS - size.cols) % 2, `${size.cols} columns`).toBe(0);
      expect((PLACE_ROWS - size.rows) % 2, `${size.rows} rows`).toBe(0);
    }
  });

  it("clamps a level nobody has written yet", () => {
    expect(landSize(99)).toEqual(landSize(LAND_SIZES.length));
    expect(landSize(0)).toEqual(landSize(1));
  });
});

describe("expanding the meadow", () => {
  it("gives her more ground", () => {
    const before = initialFarm();
    const after = expandFarm(before, 2);
    expect(after.tiles.length).toBeGreaterThan(before.tiles.length);
    expect(after.tiles).toHaveLength(after.cols * after.rows);
  });

  it("leaves a planted crop exactly where she planted it", () => {
    let farm = initialFarm();
    // Find a tile she is allowed to plough, and plant something on it.
    const tile = farm.tiles.find((_tile, i) => {
      const cell = tileCell(farm.cols, farm.rows, i);
      return cell.col > 0 && cell.row > 2;
    })!;
    farm = tillTile(farm, tile.id);
    const planted = farm.tiles.find((t) => t.id === tile.id)!;
    expect(planted.kind, "test needs a tile it can plough").toBe("field");
    planted.crop = crops.plant("koffie", 1000);
    const where = cellOf(farm, tile.id);

    const after = expandFarm(farm, 2);
    const moved = after.tiles.find((t) => t.crop?.cropId === "koffie")!;
    expect(moved, "the coffee vanished").toBeDefined();
    const nowAt = cellOf(after, moved.id);
    expect(nowAt, "the coffee moved house").toEqual(where);
    expect(moved.kind).toBe("field");
  });

  it("hands out the new ground as plain grass", () => {
    const before = initialFarm();
    const after = expandFarm(before, 2);
    const added = after.tiles.length - before.tiles.length;
    expect(after.tiles.filter((t) => t.kind === "grass")).toHaveLength(
      before.tiles.filter((t) => t.kind === "grass").length + added,
    );
  });

  it("gives every tile its own id", () => {
    const after = expandFarm(initialFarm(), 2);
    expect(new Set(after.tiles.map((t) => t.id)).size).toBe(after.tiles.length);
  });

  it("does nothing when there is nothing to add", () => {
    const full = expandFarm(initialFarm(), 2);
    expect(expandFarm(full, 2)).toBe(full);
    // ...and never shrinks the farm back down over a stale level.
    expect(expandFarm(full, 1)).toBe(full);
  });

  it("leaves the animals and decorations standing where they were", () => {
    const before = initialFarm();
    const after = expandFarm(before, 2);
    expect(after.placements).toEqual(before.placements);
    expect(after.decor).toEqual(before.decor);
    expect(after.animals).toEqual(before.animals);
  });
});
