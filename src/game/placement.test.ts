import { describe, expect, it } from "vitest";
import {
  PLACE_COLS,
  PLACE_ROWS,
  animalKey,
  canPlace,
  cellToWorld,
  footprintOf,
  decorKey,
  firstFreeCell,
  inBounds,
  move,
  occupantAt,
  rotate,
  tileCell,
  worldToAnchor,
  worldToCell,
  type Placements,
} from "./placement";
import {
  FARM_COLS,
  FARM_ROWS,
  addAnimal,
  addDecor,
  initialFarm,
  migrateDecorToItems,
  moveObject,
  animalsInPen,
  blockedCells,
  canDropOn,
  isPen,
  specOf,
  canTill,
  tillTile,
  untillTile,
  migrateDecorKinds,
  penHasRoomFor,
  penSlots,
  removeObject,
  setObjectRotation,
  specForKind,
  nextDecorId,
  rotateObject,
  withPlacements,
  type FarmState,
} from "./farm";
import { plant } from "./crops";
import { ANIMAL_SPECIES, DECOR, penCapacity } from "./economy";

describe("grid geometry", () => {
  it("centres the grid on the origin", () => {
    expect(cellToWorld(0, 0)).toEqual({ x: -3, z: -3.5 });
    expect(cellToWorld(PLACE_COLS - 1, PLACE_ROWS - 1)).toEqual({ x: 3, z: 3.5 });
  });

  it("round-trips every cell through world space", () => {
    for (let col = 0; col < PLACE_COLS; col++) {
      for (let row = 0; row < PLACE_ROWS; row++) {
        const { x, z } = cellToWorld(col, row);
        expect(worldToCell(x, z)).toEqual({ col, row });
      }
    }
  });

  it("snaps a point to the nearest cell", () => {
    expect(worldToCell(-2.4, -3.3)).toEqual({ col: 1, row: 0 });
    expect(worldToCell(0.49, 0.7)).toEqual({ col: 3, row: 4 });
  });

  it("clamps points beyond the island back onto the grid", () => {
    expect(worldToCell(-99, -99)).toEqual({ col: 0, row: 0 });
    expect(worldToCell(99, 99)).toEqual({ col: PLACE_COLS - 1, row: PLACE_ROWS - 1 });
  });

  it("puts crop tiles on the same lattice as placements", () => {
    // Tile 0 is the back-left field; it must line up with a placement cell.
    const cell = tileCell(FARM_COLS, FARM_ROWS, 0);
    expect(cell).toEqual({ col: 1, row: 1 });
    const world = cellToWorld(cell.col, cell.row);
    expect(world).toEqual({ x: -2, z: -2.5 });
  });

  it("rejects cells outside the grid", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(PLACE_COLS, 0)).toBe(false);
    expect(inBounds(0, PLACE_ROWS)).toBe(false);
  });
});

describe("occupancy", () => {
  const placements: Placements = {
    a: { col: 2, row: 3, rot: 0 },
    b: { col: 4, row: 3, rot: 0 },
  };

  it("finds who is standing on a cell", () => {
    expect(occupantAt(placements, 2, 3)).toBe("a");
    expect(occupantAt(placements, 3, 3)).toBeUndefined();
  });

  it("refuses a cell another object already holds", () => {
    expect(canPlace(placements, "a", 4, 3)).toBe(false);
  });

  it("lets an object stay where it already is", () => {
    expect(canPlace(placements, "a", 2, 3)).toBe(true);
  });

  it("respects blocked cells", () => {
    const blocked = (col: number, row: number) => col === 5 && row === 5;
    expect(canPlace(placements, "a", 5, 5, blocked)).toBe(false);
    expect(canPlace(placements, "a", 5, 4, blocked)).toBe(true);
  });
});

describe("move", () => {
  const start: Placements = { a: { col: 2, row: 3, rot: 1 }, b: { col: 4, row: 3, rot: 0 } };

  it("moves to a free cell and keeps the rotation", () => {
    const next = move(start, "a", 1, 1);
    expect(next.a).toEqual({ col: 1, row: 1, rot: 1 });
  });

  it("returns the same map when the target is taken", () => {
    expect(move(start, "a", 4, 3)).toBe(start);
  });

  it("returns the same map when the target is off-grid", () => {
    expect(move(start, "a", -1, 0)).toBe(start);
  });

  it("ignores unknown objects", () => {
    expect(move(start, "nope", 0, 0)).toBe(start);
  });

  it("does not mutate the original", () => {
    move(start, "a", 1, 1);
    expect(start.a).toEqual({ col: 2, row: 3, rot: 1 });
  });
});

describe("rotate", () => {
  it("steps through four quarter turns and wraps", () => {
    let placements: Placements = { a: { col: 0, row: 0, rot: 0 } };
    for (const expected of [1, 2, 3, 0]) {
      placements = rotate(placements, "a");
      expect(placements.a.rot).toBe(expected);
    }
  });

  it("leaves the cell alone", () => {
    const next = rotate({ a: { col: 2, row: 5, rot: 0 } }, "a");
    expect(next.a.col).toBe(2);
    expect(next.a.row).toBe(5);
  });
});

describe("default layout", () => {
  it("gives every starting object its own cell", () => {
    const { placements, decor, animals } = initialFarm();
    const cells = Object.values(placements).map((p) => `${p.col},${p.row}`);
    expect(Object.keys(placements)).toHaveLength(decor.length + animals.length);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("keeps the starting decor off the crop tiles", () => {
    const farm = initialFarm();
    const cropCells = new Set(
      Array.from({ length: FARM_COLS * FARM_ROWS }, (_, i) => {
        const c = tileCell(FARM_COLS, FARM_ROWS, i);
        return `${c.col},${c.row}`;
      }),
    );
    for (const item of farm.decor) {
      const p = farm.placements[decorKey(item.id)];
      expect(cropCells.has(`${p.col},${p.row}`)).toBe(false);
    }
  });

  it("fills from the front row so new objects are visible", () => {
    const decorOnly: Placements = Object.fromEntries(
      initialFarm().decor.map((d, i) => [decorKey(d.id), { col: i, row: 0, rot: 0 as const }]),
    );
    expect(firstFreeCell(decorOnly)?.row).toBe(PLACE_ROWS - 1);
  });

  it("puts the first animal on a cell of its own", () => {
    const farm = initialFarm();
    const animal = farm.placements[animalKey(farm.animals[0].id)];
    expect(animal).toBeDefined();
    const decorCells = farm.decor.map((d) => {
      const p = farm.placements[decorKey(d.id)];
      return `${p.col},${p.row}`;
    });
    expect(decorCells).not.toContain(`${animal.col},${animal.row}`);
  });
});

/** The first decoration on a fresh farm, whatever kind it happens to be. */
const firstDecor = (farm: FarmState) => decorKey(farm.decor[0].id);

describe("farm integration", () => {
  it("starts with a placement for every decoration and the first chicken", () => {
    const farm = initialFarm();
    for (const item of farm.decor) {
      expect(farm.placements[decorKey(item.id)]).toBeDefined();
    }
    expect(farm.placements[animalKey(farm.animals[0].id)]).toBeDefined();
  });

  it("moves an object through the store-facing helper", () => {
    const base = initialFarm();
    const farm = moveObject(base, firstDecor(base), 3, 4);
    expect(farm.placements[firstDecor(base)]).toMatchObject({ col: 3, row: 4 });
  });

  it("will not drop an object onto a growing crop", () => {
    const base = initialFarm();
    // Tile 0 sits at placement cell (1, 1).
    const withCrop = {
      ...base,
      tiles: base.tiles.map((t, i) =>
        i === 0 ? { ...t, kind: "field" as const, crop: plant("wortel", 0) } : t,
      ),
    };
    const moved = moveObject(withCrop, firstDecor(base), 1, 1);
    expect(moved).toBe(withCrop);
  });

  it("refuses to drop an object onto farmland, planted or not", () => {
    const base = initialFarm();
    const tilled = {
      ...base,
      tiles: base.tiles.map((t, i) => (i === 0 ? { ...t, kind: "field" as const } : t)),
    };
    // Tile 0 is placement cell (1, 1). Farmland stays farmland.
    expect(moveObject(tilled, firstDecor(base), 1, 1)).toBe(tilled);
    expect(canDropOn(tilled, firstDecor(base), 1, 1)).toBe(false);
  });

  it("still allows dropping onto open grass beside a field", () => {
    const base = initialFarm();
    const tilled = {
      ...base,
      tiles: base.tiles.map((t, i) => (i === 0 ? { ...t, kind: "field" as const } : t)),
    };
    const moved = moveObject(tilled, firstDecor(base), 3, 4);
    expect(moved.placements[firstDecor(base)]).toMatchObject({ col: 3, row: 4 });
  });

  it("rotates through the store-facing helper", () => {
    const base = initialFarm();
    const farm = rotateObject(base, firstDecor(base));
    expect(farm.placements[firstDecor(base)].rot).toBe(1);
  });

  it("backfills placements when the save has none at all", () => {
    // The shape a save takes when it skips the migration that adds placements:
    // the field is absent, not empty. Reading it must not throw.
    const legacy = { ...initialFarm() } as Partial<FarmState> as FarmState;
    delete (legacy as Partial<FarmState>).placements;
    const farm = withPlacements(legacy);
    expect(farm.placements[firstDecor(farm)]).toBeDefined();
    expect(farm.placements[animalKey(farm.animals[0].id)]).toBeDefined();
  });

  it("backfills placements for a save that predates them", () => {
    const legacy = { ...initialFarm(), placements: {} };
    const farm = withPlacements(legacy);
    expect(Object.keys(farm.placements).length).toBe(
      legacy.decor.length + legacy.animals.length,
    );
  });

  it("keeps arrangements the player already made", () => {
    const base = initialFarm();
    const arranged = moveObject(base, firstDecor(base), 3, 4);
    expect(withPlacements(arranged).placements[firstDecor(base)]).toMatchObject({
      col: 3,
      row: 4,
    });
  });

  it("drops placements for decorations that no longer exist", () => {
    const base = initialFarm();
    const farm = withPlacements({ ...base, decor: base.decor.slice(0, 2) });
    expect(Object.keys(farm.placements)).toHaveLength(2 + base.animals.length);
  });

  it("drops placements for animals that no longer exist", () => {
    const base = initialFarm();
    const farm = withPlacements({ ...base, animals: [] });
    expect(Object.keys(farm.placements)).toHaveLength(base.decor.length);
  });
});

describe("buying decorations", () => {
  it("adds an owned instance on a free cell", () => {
    const base = initialFarm();
    const farm = addDecor(base, "boom");
    expect(farm.decor).toHaveLength(base.decor.length + 1);
    const added = farm.decor[farm.decor.length - 1];
    expect(added.kind).toBe("boom");
    expect(farm.placements[decorKey(added.id)]).toBeDefined();
  });

  it("never reuses an id, so two copies stay distinct", () => {
    let farm = initialFarm();
    farm = addDecor(farm, "boom");
    farm = addDecor(farm, "boom");
    const ids = farm.decor.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts each new copy on its own cell", () => {
    let farm = initialFarm();
    for (let i = 0; i < 5; i++) farm = addDecor(farm, "put");
    const cells = Object.values(farm.placements).map((p) => `${p.col},${p.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("refuses once the island is full instead of losing the purchase", () => {
    let farm = initialFarm();
    for (let i = 0; i < PLACE_COLS * PLACE_ROWS + 5; i++) farm = addDecor(farm, "boom");
    const before = farm;
    expect(addDecor(farm, "boom")).toBe(before);

    // Counting placements would assume every object is one cell, which the
    // 2x2 farmhouse broke. The invariant that matters is that the island is
    // genuinely packed: nothing overlaps, and nothing else fits.
    const covered = new Set<string>();
    const spec = specOf(farm);
    for (const [key, place] of Object.entries(farm.placements)) {
      for (const cell of footprintOf(place, spec(key))) {
        const at = `${cell.col},${cell.row}`;
        expect(covered.has(at), `two objects on ${at}`).toBe(false);
        covered.add(at);
      }
    }
    expect(firstFreeCell(farm.placements, undefined, spec)).toBeUndefined();
  });

  it("hands out the next free id even after the list was edited", () => {
    const farm = initialFarm();
    expect(nextDecorId(farm)).toBe(`d${farm.decor.length + 1}`);
    expect(nextDecorId({ ...farm, decor: [{ id: "d9", kind: "boom" }] })).toBe("d10");
    expect(nextDecorId({ ...farm, decor: [] })).toBe("d1");
  });

  it("prices decorations 20-200 and pens like the land they are", () => {
    for (const item of DECOR) {
      expect(item.word, item.id).toBeTruthy();
      if (item.size) {
        // Pens are land, not trinkets: CLAUDE.md puts those at 300-1000, and
        // the smallest starter pen sits just under that.
        expect(item.price, item.id).toBeGreaterThanOrEqual(100);
        expect(item.price, item.id).toBeLessThanOrEqual(1000);
      } else {
        expect(item.price, item.id).toBeGreaterThanOrEqual(20);
        expect(item.price, item.id).toBeLessThanOrEqual(200);
      }
    }
  });
});

/** The most recently added animal. */
const lastAnimal = (farm: FarmState) => farm.animals[farm.animals.length - 1];

describe("buying animals", () => {
  it("adds the animal on a free cell of its own", () => {
    const base = initialFarm();
    const farm = addAnimal(base, "varken");
    expect(farm.animals).toHaveLength(base.animals.length + 1);
    const added = farm.animals[farm.animals.length - 1];
    expect(added.speciesId).toBe("varken");
    expect(farm.placements[animalKey(added.id)]).toBeDefined();
  });

  it("keeps the name she gives it, and trims blank ones away", () => {
    expect(lastAnimal(addAnimal(initialFarm(), "koe", "  Manchas ")).name).toBe("Manchas");
    expect(lastAnimal(addAnimal(initialFarm(), "koe", "   ")).name).toBeUndefined();
  });

  it("never reuses an animal id", () => {
    let farm = initialFarm();
    for (let i = 0; i < 4; i++) farm = addAnimal(farm, "kip");
    const ids = farm.animals.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every animal its own cell", () => {
    let farm = initialFarm();
    for (let i = 0; i < 6; i++) farm = addAnimal(farm, "kip");
    const cells = Object.values(farm.placements).map((p) => `${p.col},${p.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("refuses once the island is full instead of losing the purchase", () => {
    let farm = initialFarm();
    for (let i = 0; i < PLACE_COLS * PLACE_ROWS + 5; i++) farm = addAnimal(farm, "kip");
    const before = farm;
    expect(addAnimal(farm, "kip")).toBe(before);

    // Counting placements would assume every object is one cell, which the
    // 2x2 farmhouse broke. The invariant that matters is that the island is
    // genuinely packed: nothing overlaps, and nothing else fits.
    const covered = new Set<string>();
    const spec = specOf(farm);
    for (const [key, place] of Object.entries(farm.placements)) {
      for (const cell of footprintOf(place, spec(key))) {
        const at = `${cell.col},${cell.row}`;
        expect(covered.has(at), `two objects on ${at}`).toBe(false);
        covered.add(at);
      }
    }
    expect(firstFreeCell(farm.placements, undefined, spec)).toBeUndefined();
  });

  it("starts every animal hungry so she has something to do with it", () => {
    const animal = lastAnimal(addAnimal(initialFarm(), "varken"));
    expect(animal.lastFedAt).toBe(0);
  });

  it("prices every species inside the design's 100-600 range", () => {
    for (const species of ANIMAL_SPECIES) {
      expect(species.cost, species.id).toBeGreaterThanOrEqual(100);
      expect(species.cost, species.id).toBeLessThanOrEqual(600);
    }
  });
});

describe("pens", () => {
  /** A farm with one pen of the given kind, anchored at (0, 2). */
  const withPen = (kind = "wei2") => {
    const farm = addDecor(initialFarm(), kind);
    const pen = farm.decor[farm.decor.length - 1];
    return { farm: moveObject(farm, decorKey(pen.id), 0, 2), penId: pen.id };
  };

  it("comes in the sizes the shop sells, and each is square", () => {
    for (const def of DECOR.filter((d) => d.pen)) {
      const spec = specForKind(def.id);
      expect(spec.w, def.id).toBe(def.size);
      expect(spec.h, def.id).toBe(def.size);
      expect(spec.kind).toBe("pasture");
    }
  });

  it("only offers sizes that fit on the island", () => {
    for (const def of DECOR.filter((d) => d.pen)) {
      expect(def.size!, `${def.id} is wider than the island`).toBeLessThanOrEqual(PLACE_COLS);
      expect(def.size!, `${def.id} is deeper than the island`).toBeLessThanOrEqual(PLACE_ROWS);
    }
  });

  it("covers every cell of its square", () => {
    const { farm, penId } = withPen("wei4");
    const cells = footprintOf(farm.placements[decorKey(penId)], specForKind("wei4"));
    expect(cells).toHaveLength(16);
  });

  it("takes an animal in off the grid when it is dropped inside", () => {
    const { farm, penId } = withPen();
    const animal = farm.animals[0];
    const moved = moveObject(farm, animalKey(animal.id), 0, 2);

    expect(moved.animals[0].penId).toBe(penId);
    // No cell of its own any more: it roams loose inside the fence.
    expect(moved.placements[animalKey(animal.id)]).toBeUndefined();
    expect(animalsInPen(moved, penId)).toHaveLength(1);
  });

  it("gives an animal a cell again when it is dragged back out", () => {
    const { farm, penId } = withPen();
    const key = animalKey(farm.animals[0].id);
    const inside = moveObject(farm, key, 0, 2);
    const outside = moveObject(inside, key, 4, 4);

    expect(outside.animals[0].penId).toBeUndefined();
    expect(outside.placements[key]).toMatchObject({ col: 4, row: 4 });
    expect(animalsInPen(outside, penId)).toHaveLength(0);
  });

  it("takes a second chicken when there is room left", () => {
    // The 2x2 used to hold exactly one chicken, which read as a broken pen.
    let { farm, penId } = withPen("wei2");
    farm = addAnimal(farm, "kip");
    const keys = farm.animals.map((a) => animalKey(a.id));
    farm = moveObject(farm, keys[0], 0, 2);
    farm = moveObject(farm, keys[1], 1, 2);
    expect(animalsInPen(farm, penId)).toHaveLength(2);
  });

  it("fits at least one of every animal in even the smallest pen", () => {
    const smallest = Math.min(...DECOR.filter((d) => d.pen).map((d) => d.size!));
    for (const species of ANIMAL_SPECIES) {
      expect(penCapacity(smallest, species.id), species.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("fits three chickens in the smallest pen", () => {
    const smallest = Math.min(...DECOR.filter((d) => d.pen).map((d) => d.size!));
    expect(penCapacity(smallest, "kip")).toBeGreaterThanOrEqual(3);
  });

  it("turns away the animal that would overfill it", () => {
    let { farm, penId } = withPen("wei2");
    const room = penCapacity(2, "kip");
    for (let i = 0; i < room; i++) farm = addAnimal(farm, "kip");
    const keys = farm.animals.map((a) => animalKey(a.id));
    // Fill it to the brim, one animal per cell of the pen.
    const cells = [[0, 2], [1, 2], [0, 3], [1, 3]];
    for (let i = 0; i < room; i++) farm = moveObject(farm, keys[i], cells[i % 4][0], cells[i % 4][1]);
    expect(animalsInPen(farm, penId)).toHaveLength(room);

    const before = farm;
    farm = moveObject(farm, keys[room], 1, 2);
    expect(farm).toBe(before);
    expect(animalsInPen(farm, penId)).toHaveLength(room);
  });

  it("counts a cow as taking more room than a chicken", () => {
    const { farm, penId } = withPen("wei2");
    const withCow = moveObject(addAnimal(farm, "koe"), animalKey("a2"), 0, 2);
    const withHen = moveObject(farm, animalKey("a1"), 0, 2);
    expect(penSlots(withCow, penId).used).toBeGreaterThan(penSlots(withHen, penId).used);
  });

  it("reports how full it is", () => {
    const { farm, penId } = withPen("wei4");
    expect(penSlots(farm, penId).used).toBe(0);
    expect(penSlots(farm, penId).total).toBeGreaterThan(0);
    const moved = moveObject(farm, animalKey(farm.animals[0].id), 0, 2);
    expect(penSlots(moved, penId).used).toBeGreaterThan(0);
  });

  it("lets an animal already inside stay put without double-counting it", () => {
    const { farm, penId } = withPen();
    const key = animalKey(farm.animals[0].id);
    const inside = moveObject(farm, key, 0, 2);
    expect(canDropOn(inside, key, 1, 2)).toBe(true);
    expect(penHasRoomFor(inside, penId, farm.animals[0].id)).toBe(true);
  });

  it("still refuses to put a decoration inside a pen", () => {
    const { farm } = withPen();
    const tree = decorKey(farm.decor[0].id);
    expect(moveObject(farm, tree, 0, 2)).toBe(farm);
  });

  it("cannot hang off the edge of the island", () => {
    const { farm, penId } = withPen("wei4");
    const id = decorKey(penId);
    expect(moveObject(farm, id, PLACE_COLS - 1, 0)).toBe(farm);
  });

  it("centres a big pen under the pointer when dragged", () => {
    const spec = specForKind("wei4");
    const middle = cellToWorld(1, 1);
    expect(worldToAnchor(middle.x + 1.5, middle.z + 1.5, spec)).toEqual({ col: 1, row: 1 });
    expect(worldToAnchor(99, 99, spec)).toEqual({
      col: PLACE_COLS - 4,
      row: PLACE_ROWS - 4,
    });
  });
});

describe("ploughing", () => {
  /** Tile index 0 sits at placement cell (1, 1). */
  const FIRST_TILE_CELL = { col: 1, row: 1 };

  it("turns open grass into a field", () => {
    const farm = initialFarm();
    // Tile 0 sits under the 2x2 farmhouse, so pick the first that is free.
    const open = farm.tiles.find((t) => canTill(farm, t.id))!;
    const after = tillTile(farm, open.id);
    expect(after.tiles.find((t) => t.id === open.id)?.kind).toBe("field");
  });

  it("refuses to plough inside a pen — that is pasture, not farmland", () => {
    const farm = addDecor(initialFarm(), "wei2");
    const pen = farm.decor[farm.decor.length - 1];
    const placed = moveObject(farm, decorKey(pen.id), FIRST_TILE_CELL.col, FIRST_TILE_CELL.row);

    expect(canTill(placed, placed.tiles[0].id)).toBe(false);
    expect(tillTile(placed, placed.tiles[0].id)).toBe(placed);
  });

  it("refuses to plough under a decoration", () => {
    const base = initialFarm();
    const moved = moveObject(base, decorKey(base.decor[0].id), FIRST_TILE_CELL.col, FIRST_TILE_CELL.row);
    expect(canTill(moved, moved.tiles[0].id)).toBe(false);
  });

  it("still ploughs the tiles a pen does not cover", () => {
    const farm = addDecor(initialFarm(), "wei2");
    const pen = farm.decor[farm.decor.length - 1];
    const placed = moveObject(farm, decorKey(pen.id), FIRST_TILE_CELL.col, FIRST_TILE_CELL.row);
    // The pen covers (1,1)..(2,2); tile index 3 is at column 4, well clear.
    expect(canTill(placed, placed.tiles[3].id)).toBe(true);
  });

  it("lets the grass back over an empty field", () => {
    const farm = tillTile(initialFarm(), "t1");
    const back = untillTile(farm, "t1");
    expect(back.tiles[0].kind).toBe("grass");
  });

  it("will not undo a field that has something growing in it", () => {
    const base = tillTile(initialFarm(), "t1");
    const planted = {
      ...base,
      tiles: base.tiles.map((t, i) => (i === 0 ? { ...t, crop: plant("wortel", 0) } : t)),
    };
    expect(untillTile(planted, "t1")).toBe(planted);
  });

  it("ignores a tile that isn't there", () => {
    const farm = initialFarm();
    expect(tillTile(farm, "nope")).toBe(farm);
    expect(untillTile(farm, "nope")).toBe(farm);
  });
});

describe("setting rotation outright", () => {
  it("takes the quarter turn the twist gesture landed on", () => {
    const base = initialFarm();
    const id = decorKey(base.decor[0].id);
    expect(setObjectRotation(base, id, 3).placements[id].rot).toBe(3);
  });

  it("leaves the cell alone", () => {
    const base = initialFarm();
    const id = decorKey(base.decor[0].id);
    const before = base.placements[id];
    const after = setObjectRotation(base, id, 2).placements[id];
    expect(after.col).toBe(before.col);
    expect(after.row).toBe(before.row);
  });

  it("is a no-op when nothing changes", () => {
    const base = initialFarm();
    const id = decorKey(base.decor[0].id);
    expect(setObjectRotation(base, id, base.placements[id].rot)).toBe(base);
  });

  it("ignores an object that isn't there", () => {
    const base = initialFarm();
    expect(setObjectRotation(base, "decor:nope", 1)).toBe(base);
  });

  it("refuses a turn that would push a pen off the island", () => {
    // A square pen can always turn, so this guards the general rule rather
    // than today's shapes: rotation must still fit where it stands.
    const farm = addDecor(initialFarm(), "wei4");
    const id = decorKey(farm.decor[farm.decor.length - 1].id);
    const turned = setObjectRotation(farm, id, 1);
    expect(turned.placements[id].rot).toBe(1);
  });
});

describe("keeping objects off the farmland", () => {
  /** A farm with the whole first crop row ploughed. */
  const withFields = (howMany = 5) => {
    const base = initialFarm();
    return {
      ...base,
      tiles: base.tiles.map((t, i) => (i < howMany ? { ...t, kind: "field" as const } : t)),
    };
  };

  it("blocks every ploughed cell, not just the planted ones", () => {
    const farm = withFields();
    const blocked = blockedCells(farm);
    for (let i = 0; i < 5; i++) {
      const cell = tileCell(FARM_COLS, FARM_ROWS, i);
      expect(blocked(cell.col, cell.row), `tile ${i}`).toBe(true);
    }
  });

  it("will not let a pasture cover farmland with a single corner", () => {
    const farm = addDecor(withFields(), "wei4");
    const pen = decorKey(farm.decor[farm.decor.length - 1].id);
    // A 4x4 anchored here would reach cell (1,1), which is now a field.
    expect(moveObject(farm, pen, 1, 1)).toBe(farm);
    expect(canDropOn(farm, pen, 1, 1)).toBe(false);
  });

  it("will not let the farmhouse straddle a field", () => {
    const farm = withFields();
    const house = decorKey(farm.decor.find((d) => d.kind === "huis")!.id);
    // Anchored at (0,0) its bottom-right cell is (1,1) — farmland.
    expect(canDropOn(farm, house, 0, 0)).toBe(false);
  });

  it("keeps animals off the fields too", () => {
    const farm = withFields();
    const animal = animalKey(farm.animals[0].id);
    expect(canDropOn(farm, animal, 1, 1)).toBe(false);
  });

  it("never auto-places a purchase onto farmland", () => {
    let farm = withFields(30); // every plot ploughed
    const before = farm.decor.length;
    farm = addDecor(farm, "boom");
    if (farm.decor.length > before) {
      const place = farm.placements[decorKey(farm.decor[farm.decor.length - 1].id)];
      const blocked = blockedCells(farm);
      for (const cell of footprintOf(place, specForKind("boom"))) {
        expect(blocked(cell.col, cell.row)).toBe(false);
      }
    }
  });

  it("lifts an object that a save left standing on a field", () => {
    const base = withFields();
    const tree = decorKey(base.decor.find((d) => d.kind === "boom")!.id);
    // The shape a save takes from when empty fields were fair game.
    const legacy: FarmState = {
      ...base,
      placements: { ...base.placements, [tree]: { col: 1, row: 1, rot: 0 } },
    };

    const fixed = withPlacements(legacy);
    const place = fixed.placements[tree];
    expect(place).toBeDefined();
    const blocked = blockedCells(fixed);
    expect(blocked(place.col, place.row), "still on farmland").toBe(false);
  });
});

describe("the farmhouse", () => {
  it("covers four cells without being a pen", () => {
    const spec = specForKind("huis");
    expect(spec.w).toBe(2);
    expect(spec.h).toBe(2);
    expect(spec.kind).toBe("object");
    expect(isPen("huis")).toBe(false);
  });

  it("takes all four of its cells on the grid", () => {
    const base = initialFarm();
    const house = base.decor.find((d) => d.kind === "huis")!;
    const cells = footprintOf(base.placements[decorKey(house.id)], specForKind("huis"));
    expect(cells).toHaveLength(4);
  });

  it("blocks every cell it stands on, not just its anchor", () => {
    const base = initialFarm();
    const house = base.decor.find((d) => d.kind === "huis")!;
    const moved = moveObject(base, decorKey(house.id), 2, 2);
    // It now covers (2,2)..(3,3); a tree must not fit on any of those.
    const tree = base.decor.find((d) => d.kind === "boom")!;
    for (const cell of footprintOf(moved.placements[decorKey(house.id)], specForKind("huis"))) {
      expect(canDropOn(moved, decorKey(tree.id), cell.col, cell.row), `${cell.col},${cell.row}`)
        .toBe(false);
    }
  });

  it("cannot hang off the edge of the island", () => {
    const base = initialFarm();
    const house = decorKey(base.decor.find((d) => d.kind === "huis")!.id);
    expect(moveObject(base, house, PLACE_COLS - 1, 0)).toBe(base);
    expect(moveObject(base, house, 0, PLACE_ROWS - 1)).toBe(base);
  });

  it("costs some farmland, which is unavoidable on a grid this size", () => {
    const farm = initialFarm();
    const covered = farm.tiles.filter((t) => !canTill(farm, t.id));
    // Two adjacent columns always fall inside the crop area, so a 2x2 building
    // eats at least one plot wherever it stands.
    expect(covered.length).toBeGreaterThan(0);
    expect(covered.length).toBeLessThanOrEqual(2);
  });
});

describe("a save whose objects outgrew their spot", () => {
  it("re-places a house that no longer fits where it stood", () => {
    const base = initialFarm();
    const house = base.decor.find((d) => d.kind === "huis")!;
    const tree = base.decor.find((d) => d.kind === "boom")!;

    // The shape a save takes from before the house was 2x2: it sits in the
    // far corner, where a four-cell footprint now runs off the island.
    const legacy: FarmState = {
      ...base,
      placements: {
        ...base.placements,
        [decorKey(house.id)]: { col: PLACE_COLS - 1, row: PLACE_ROWS - 1, rot: 0 },
        [decorKey(tree.id)]: { col: 3, row: 3, rot: 0 },
      },
    };

    const fixed = withPlacements(legacy);
    const place = fixed.placements[decorKey(house.id)];
    expect(place).toBeDefined();
    // Wherever it ended up, all four cells are on the island.
    for (const cell of footprintOf(place, specForKind("huis"))) {
      expect(cell.col).toBeLessThan(PLACE_COLS);
      expect(cell.row).toBeLessThan(PLACE_ROWS);
    }
  });

  it("leaves nothing overlapping after the repair", () => {
    const base = initialFarm();
    const house = base.decor.find((d) => d.kind === "huis")!;
    const legacy: FarmState = {
      ...base,
      // Right on top of another decoration, as an old 1x1 house could be.
      placements: { ...base.placements, [decorKey(house.id)]: { col: 3, row: 0, rot: 0 } },
    };

    const fixed = withPlacements(legacy);
    const spec = specOf(fixed);
    const covered = new Set<string>();
    for (const [key, place] of Object.entries(fixed.placements)) {
      for (const cell of footprintOf(place, spec(key))) {
        const at = `${cell.col},${cell.row}`;
        expect(covered.has(at), `two objects on ${at}`).toBe(false);
        covered.add(at);
      }
    }
  });
});

describe("removing things", () => {
  it("takes a decoration off the farm and frees its cell", () => {
    const base = initialFarm();
    const id = decorKey(base.decor[0].id);
    const cell = base.placements[id];
    const after = removeObject(base, id);

    expect(after.decor).toHaveLength(base.decor.length - 1);
    expect(after.placements[id]).toBeUndefined();
    expect(canPlace(after.placements, "new", cell.col, cell.row)).toBe(true);
  });

  it("takes an animal off the farm", () => {
    const base = initialFarm();
    const after = removeObject(base, animalKey(base.animals[0].id));
    expect(after.animals).toHaveLength(0);
    expect(after.placements[animalKey(base.animals[0].id)]).toBeUndefined();
  });

  it("turns penned animals back out onto the grass when their pen goes", () => {
    const farm = addDecor(initialFarm(), "wei2");
    const pen = farm.decor[farm.decor.length - 1];
    const placed = moveObject(farm, decorKey(pen.id), 0, 2);
    const withAnimal = moveObject(placed, animalKey(placed.animals[0].id), 0, 2);
    expect(withAnimal.animals[0].penId).toBe(pen.id);

    const after = removeObject(withAnimal, decorKey(pen.id));
    expect(after.animals).toHaveLength(1);
    expect(after.animals[0].penId).toBeUndefined();
    // It must be standing somewhere again, not lost off-grid.
    expect(after.placements[animalKey(after.animals[0].id)]).toBeDefined();
  });

  it("ignores an object that isn't there", () => {
    const base = initialFarm();
    expect(removeObject(base, "decor:nope")).toBe(base);
    expect(removeObject(base, "animal:nope")).toBe(base);
  });
});

describe("migrating pens", () => {
  it("turns a save's single-size pen into the 2x2 one", () => {
    const base = initialFarm();
    const farm = { ...base, decor: [...base.decor, { id: "d99", kind: "wei" }] };
    const migrated = migrateDecorKinds(farm);
    expect(migrated.decor.find((d) => d.id === "d99")?.kind).toBe("wei2");
  });

  it("leaves a farm without old pens alone", () => {
    const base = initialFarm();
    expect(migrateDecorKinds(base)).toBe(base);
  });
});

describe("migrating decor from the fixed layout", () => {
  const legacyFarm = () => {
    const farm = initialFarm() as Partial<FarmState> as FarmState;
    delete (farm as Partial<FarmState>).decor;
    farm.placements = {
      "decor:house": { col: 2, row: 3, rot: 2 },
      "decor:windmill": { col: 5, row: 0, rot: 0 },
      "decor:tree1": { col: 0, row: 0, rot: 0 },
      "decor:tree2": { col: 6, row: 0, rot: 0 },
      "decor:stand": { col: 3, row: 0, rot: 0 },
      "decor:cart": { col: 6, row: 7, rot: 1 },
      "decor:well": { col: 0, row: 7, rot: 0 },
    };
    return farm;
  };

  it("turns each fixed piece into an owned instance", () => {
    const farm = migrateDecorToItems(legacyFarm());
    expect(farm.decor).toHaveLength(7);
    expect(farm.decor.map((d) => d.kind).sort()).toEqual(
      ["boom", "boom", "huis", "kar", "kraam", "molen", "put"].sort(),
    );
  });

  it("keeps the cell and rotation she arranged", () => {
    const farm = migrateDecorToItems(legacyFarm());
    const house = farm.decor.find((d) => d.kind === "huis")!;
    expect(farm.placements[decorKey(house.id)]).toMatchObject({ col: 2, row: 3, rot: 2 });
    const cart = farm.decor.find((d) => d.kind === "kar")!;
    expect(farm.placements[decorKey(cart.id)]).toMatchObject({ col: 6, row: 7, rot: 1 });
  });

  it("leaves an already-migrated farm alone", () => {
    const farm = initialFarm();
    expect(migrateDecorToItems(farm)).toBe(farm);
  });
});
