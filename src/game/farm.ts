// Farm layout: a grid of grass tiles the player tills into farmable fields,
// plus animals. Land expansion beyond the grid is quest-gated (M3+).

import { createAnimal, type Animal } from "./animals";
import type { PlantedCrop } from "./crops";
import { DECOR_BY_ID, decorSize, getSpeciesDef } from "./economy";
import { animalSpace, penSpace } from "./pen";
import {
  PLACE_ROWS,
  UNIT_SPEC,
  animalKey,
  decorKey,
  canPlace,
  firstFreeSpot,
  footprintOf,
  move,
  rotate,
  tileCell,
  type Blocked,
  type ObjectSpec,
  type Placements,
  type Quarter,
  type SpecOf,
} from "./placement";

export const FARM_COLS = 5;
export const FARM_ROWS = 6;

export type TileKind = "grass" | "field";

export interface Tile {
  id: string;
  kind: TileKind;
  crop?: PlantedCrop;
}

/** One owned decoration. `kind` is a DecorDef id from game/economy. */
export interface DecorItem {
  id: string;
  kind: string;
}

export interface FarmState {
  cols: number;
  rows: number;
  tiles: Tile[];
  animals: Animal[];
  /** Decorations the player owns, bought from the shop or given at the start. */
  decor: DecorItem[];
  /** Where decor and animals stand on the island grid. See ./placement. */
  placements: Placements;
}

/** The farm she wakes up to: a back row of buildings and two front corners. */
const STARTER_DECOR: { kind: string; col: number; row: number }[] = [
  // The farmhouse is 2x2, so it sits in the corner where it costs the least
  // farmland: only cell (1,1) of the crop grid ends up underneath it.
  { kind: "huis", col: 0, row: 0 },
  { kind: "boom", col: 2, row: 0 },
  { kind: "kraam", col: 3, row: 0 },
  { kind: "molen", col: 5, row: 0 },
  { kind: "boom", col: 6, row: 0 },
  { kind: "put", col: 0, row: PLACE_ROWS - 1 },
  { kind: "kar", col: 6, row: PLACE_ROWS - 1 },
];

/** Decor ids are `d1`, `d2`, ... — sequential so saves stay diffable. */
export function nextDecorId(farm: FarmState): string {
  const used = farm.decor.map((d) => Number(d.id.slice(1))).filter((n) => Number.isFinite(n));
  return `d${Math.max(0, ...used) + 1}`;
}

/** Starting farm: an open meadow (she tills it herself) and 1 chicken. */
export function initialFarm(): FarmState {
  const animals = [createAnimal("a1", "kip")];
  const decor = STARTER_DECOR.map((d, i) => ({ id: `d${i + 1}`, kind: d.kind }));
  const placements: Placements = {};
  STARTER_DECOR.forEach((d, i) => {
    placements[decorKey(decor[i].id)] = { col: d.col, row: d.row, rot: 0 };
  });
  // Spec-aware, or the chicken could be tucked under the 2x2 farmhouse.
  const starterSpec = specOf({ decor, placements } as FarmState);
  for (const animal of animals) {
    const cell = firstFreeSpot(placements, ANIMAL_SPEC, undefined, starterSpec);
    if (cell) placements[animalKey(animal.id)] = { ...cell, rot: 0 };
  }
  return {
    cols: FARM_COLS,
    rows: FARM_ROWS,
    tiles: Array.from({ length: FARM_COLS * FARM_ROWS }, (_, i) => ({
      id: `t${i + 1}`,
      kind: "grass" as const,
    })),
    animals,
    decor,
    placements,
  };
}

// ---------------------------------------------------------------------------
// Pens
//
// A pen covers several cells and, unlike everything else, does not put its
// animals on the grid: a penned animal has no placement at all and wanders
// loose inside the fence. Capacity is measured in slots, so a cow crowds a
// pen more than a chicken does.

const ANIMAL_SPEC: ObjectSpec = { w: 1, h: 1, kind: "animal" };

const isAnimalKey = (id: string) => id.startsWith("animal:");
const idFromKey = (key: string) => key.slice(key.indexOf(":") + 1);

/**
 * Footprint of a decoration kind. Size and "is a pen" are separate: the
 * farmhouse covers four cells without animals living in it.
 */
export function specForKind(kind: string): ObjectSpec {
  const def = DECOR_BY_ID.get(kind);
  if (!def) return UNIT_SPEC;
  const size = decorSize(def);
  if (def.pen) return { w: size, h: size, kind: "pasture" };
  return size > 1 ? { w: size, h: size, kind: "object" } : UNIT_SPEC;
}

export const isPen = (kind: string): boolean => DECOR_BY_ID.get(kind)?.pen === true;

/**
 * Tells the placement rules how big each object is. Rebuilt per call from the
 * farm, so a newly bought pen is known at once.
 */
export function specOf(farm: FarmState): SpecOf {
  const kinds = new Map((farm.decor ?? []).map((d) => [decorKey(d.id), d.kind]));
  return (id) => {
    if (isAnimalKey(id)) return ANIMAL_SPEC;
    const kind = kinds.get(id);
    return kind ? specForKind(kind) : UNIT_SPEC;
  };
}

/** The pen covering this cell, if any. */
export function penAt(farm: FarmState, col: number, row: number): DecorItem | undefined {
  return (farm.decor ?? []).find((item) => {
    if (!isPen(item.kind)) return false;
    const place = farm.placements[decorKey(item.id)];
    if (!place) return false;
    return footprintOf(place, specForKind(item.kind)).some(
      (c) => c.col === col && c.row === row,
    );
  });
}

/** Animals living in the given pen. */
export function animalsInPen(farm: FarmState, penId: string): Animal[] {
  return farm.animals.filter((a) => a.penId === penId);
}

export function penSizeOf(farm: FarmState, penId: string): number {
  const item = (farm.decor ?? []).find((d) => d.id === penId);
  const def = item ? DECOR_BY_ID.get(item.kind) : undefined;
  return def ? decorSize(def) : 0;
}

export function penSlots(farm: FarmState, penId: string): { used: number; total: number } {
  const total = penSpace(penSizeOf(farm, penId));
  const used = animalsInPen(farm, penId).reduce(
    (sum, a) => sum + animalSpace(getSpeciesDef(a.speciesId).radius),
    0,
  );
  return { used, total };
}

/** Would this animal still fit? Its own slots don't count twice. */
export function penHasRoomFor(farm: FarmState, penId: string, animalId: string): boolean {
  const animal = farm.animals.find((a) => a.id === animalId);
  if (!animal) return false;
  const { used, total } = penSlots(farm, penId);
  const needs = animalSpace(getSpeciesDef(animal.speciesId).radius);
  // Its own space does not count twice when it is already inside.
  const own = animal.penId === penId ? needs : 0;
  return used - own + needs <= total + 1e-9;
}

/** Animal ids are `a1`, `a2`, ... in the order she buys them. */
export function nextAnimalId(farm: FarmState): string {
  const used = farm.animals.map((a) => Number(a.id.slice(1))).filter((n) => Number.isFinite(n));
  return `a${Math.max(0, ...used) + 1}`;
}

/**
 * Add a bought animal on the first free cell. Returns the farm unchanged when
 * the island is full, so the caller knows not to charge for it.
 */
export function addAnimal(farm: FarmState, speciesId: string, name?: string): FarmState {
  const cell = firstFreeSpot(farm.placements, ANIMAL_SPEC, blockedCells(farm), specOf(farm));
  if (!cell) return farm;
  const animal = createAnimal(nextAnimalId(farm), speciesId, name?.trim() || undefined);
  return {
    ...farm,
    animals: [...farm.animals, animal],
    placements: { ...farm.placements, [animalKey(animal.id)]: { ...cell, rot: 0 } },
  };
}

/**
 * Add a bought decoration on the first free cell. Returns the farm unchanged
 * when the island is full, so the caller knows not to charge for it.
 */
export function addDecor(farm: FarmState, kind: string): FarmState {
  const spec = specForKind(kind);
  const cell = firstFreeSpot(farm.placements, spec, blockedCells(farm), specOf(farm));
  if (!cell) return farm;
  const item: DecorItem = { id: nextDecorId(farm), kind };
  return {
    ...farm,
    decor: [...farm.decor, item],
    placements: { ...farm.placements, [decorKey(item.id)]: { ...cell, rot: 0 } },
  };
}

/**
 * Cells the player may not drop an object onto: all farmland, whether or not
 * something is growing in it.
 *
 * This is the mirror of `canTill` — you cannot plough under a building, and
 * you cannot stand a building on a plough. Keeping both halves of that rule
 * means the fields stay fields, and nothing ever ends up half-buried under a
 * pen. Open grass is still free for anything.
 */
export function blockedCells(farm: FarmState): Blocked {
  const taken = new Set<string>();
  farm.tiles.forEach((tile, i) => {
    if (tile.kind !== "field") return;
    const cell = tileCell(farm.cols, farm.rows, i);
    taken.add(`${cell.col},${cell.row}`);
  });
  return (col, row) => taken.has(`${col},${row}`);
}

/**
 * Can this object be dropped here? Same as the grid rule, except an animal
 * may be dropped onto a pen that still has room — it moves in rather than
 * standing on a cell.
 */
export function canDropOn(farm: FarmState, id: string, col: number, row: number): boolean {
  if (isAnimalKey(id)) {
    const pen = penAt(farm, col, row);
    if (pen) return penHasRoomFor(farm, pen.id, idFromKey(id));
  }
  return canPlace(farm.placements, id, col, row, blockedCells(farm), specOf(farm));
}

function setPen(farm: FarmState, animalId: string, penId: string | undefined): FarmState {
  return {
    ...farm,
    animals: farm.animals.map((a) => (a.id === animalId ? { ...a, penId } : a)),
  };
}

/** Drag an object to a grid cell. No-op when the cell is taken or blocked. */
export function moveObject(farm: FarmState, id: string, col: number, row: number): FarmState {
  if (isAnimalKey(id)) {
    const animalId = idFromKey(id);
    const animal = farm.animals.find((a) => a.id === animalId);
    if (!animal) return farm;
    const pen = penAt(farm, col, row);

    if (pen) {
      // Into a pen: it leaves the grid and roams loose inside the fence.
      if (animal.penId === pen.id) return farm;
      if (!penHasRoomFor(farm, pen.id, animalId)) return farm;
      const placements = { ...farm.placements };
      delete placements[id];
      return { ...setPen(farm, animalId, pen.id), placements };
    }

    if (animal.penId) {
      // Out of a pen: it needs a cell of its own again.
      if (!canPlace(farm.placements, id, col, row, blockedCells(farm), specOf(farm))) return farm;
      const out = setPen(farm, animalId, undefined);
      return { ...out, placements: { ...out.placements, [id]: { col, row, rot: 0 } } };
    }
  }

  const placements = move(farm.placements, id, col, row, blockedCells(farm), specOf(farm));
  return placements === farm.placements ? farm : { ...farm, placements };
}

/**
 * Remove an object from the farm. Animals living in a deleted pen are turned
 * back out onto the grass rather than vanishing with it.
 */
export function removeObject(farm: FarmState, id: string): FarmState {
  const placements = { ...farm.placements };
  delete placements[id];

  if (isAnimalKey(id)) {
    const animalId = idFromKey(id);
    if (!farm.animals.some((a) => a.id === animalId)) return farm;
    return { ...farm, animals: farm.animals.filter((a) => a.id !== animalId), placements };
  }

  const decorId = idFromKey(id);
  const item = (farm.decor ?? []).find((d) => d.id === decorId);
  if (!item) return farm;

  const next: FarmState = {
    ...farm,
    decor: farm.decor.filter((d) => d.id !== decorId),
    animals: farm.animals.map((a) => (a.penId === decorId ? { ...a, penId: undefined } : a)),
    placements,
  };
  // Evicted animals need cells again; withPlacements finds them one each.
  return isPen(item.kind) ? withPlacements(next) : next;
}

/** Set an object's rotation outright, e.g. after a twist gesture. */
export function setObjectRotation(farm: FarmState, id: string, rot: Quarter): FarmState {
  const current = farm.placements[id];
  if (!current || current.rot === rot) return farm;
  const turned = { ...current, rot };
  if (!canPlace({ ...farm.placements, [id]: turned }, id, current.col, current.row, blockedCells(farm), specOf(farm))) {
    return farm;
  }
  return { ...farm, placements: { ...farm.placements, [id]: turned } };
}

/** Turn an object a quarter turn clockwise. */
export function rotateObject(farm: FarmState, id: string): FarmState {
  const placements = rotate(farm.placements, id, blockedCells(farm), specOf(farm));
  return placements === farm.placements ? farm : { ...farm, placements };
}

/**
 * Fill in any missing cells, keeping what the player has already arranged.
 * Used by save migration and after buying an animal. Placements for animals
 * that no longer exist are dropped so they don't hold a cell hostage.
 */
export function withPlacements(farm: FarmState): FarmState {
  const existing = farm.placements ?? {};
  const decor = farm.decor ?? [];
  const placements: Placements = {};
  // Keep only what still exists, so a sold or removed object can't hold a cell.
  for (const item of decor) {
    const key = decorKey(item.id);
    if (existing[key]) placements[key] = existing[key];
  }
  const penIds = new Set(decor.filter((d) => isPen(d.kind)).map((d) => d.id));
  // An animal in a pen holds no cell. If its pen is gone, it needs one again.
  const animals = farm.animals.map((a) =>
    a.penId && !penIds.has(a.penId) ? { ...a, penId: undefined } : a,
  );
  for (const animal of animals) {
    if (animal.penId) continue;
    const key = animalKey(animal.id);
    if (existing[key]) placements[key] = existing[key];
  }
  const blocked = blockedCells({ ...farm, decor, placements });
  const spec = specOf({ ...farm, decor } as FarmState);

  // An object's footprint can grow between versions — the farmhouse went from
  // one cell to four. Anything that no longer fits where it stood is lifted
  // and re-placed, rather than being left overlapping or off the island.
  const kept: Placements = {};
  for (const [key, place] of Object.entries(placements)) {
    if (canPlace({ ...kept, [key]: place }, key, place.col, place.row, blocked, spec)) {
      kept[key] = place;
    }
  }

  const missing = [
    ...decor.map((d) => decorKey(d.id)),
    ...animals.filter((a) => !a.penId).map((a) => animalKey(a.id)),
  ];
  for (const key of missing) {
    if (kept[key]) continue;
    const cell = firstFreeSpot(kept, spec(key), blocked, spec);
    if (cell) kept[key] = { ...cell, rot: 0 };
  }
  return { ...farm, decor, animals, placements: kept };
}

/** Saves from before pens came in sizes stored a single kind, `wei`. */
export function migrateDecorKinds(farm: FarmState): FarmState {
  if (!farm.decor?.some((d) => d.kind === "wei")) return farm;
  return {
    ...farm,
    decor: farm.decor.map((d) => (d.kind === "wei" ? { ...d, kind: "wei2" } : d)),
  };
}

/**
 * Saves from before the decor shop stored one fixed piece per name. Turn those
 * into owned instances, keeping the cell and rotation she arranged them into.
 */
const LEGACY_DECOR: Record<string, string> = {
  house: "huis",
  windmill: "molen",
  stand: "kraam",
  tree1: "boom",
  tree2: "boom",
  cart: "kar",
  well: "put",
};

export function migrateDecorToItems(farm: FarmState): FarmState {
  if (farm.decor) return farm;
  const placements: Placements = {};
  const decor: DecorItem[] = [];
  let n = 0;
  for (const [legacy, kind] of Object.entries(LEGACY_DECOR)) {
    const old = farm.placements?.[decorKey(legacy)];
    if (!old) continue;
    const id = `d${++n}`;
    decor.push({ id, kind });
    placements[decorKey(id)] = old;
  }
  for (const animal of farm.animals ?? []) {
    const key = animalKey(animal.id);
    const old = farm.placements?.[key];
    if (old) placements[key] = old;
  }
  return withPlacements({ ...farm, decor, placements });
}

/** Cells standing under a decoration — pens included. */
export function decorCells(farm: FarmState): Set<string> {
  const taken = new Set<string>();
  for (const item of farm.decor ?? []) {
    const place = farm.placements[decorKey(item.id)];
    if (!place) continue;
    for (const cell of footprintOf(place, specForKind(item.kind))) {
      taken.add(`${cell.col},${cell.row}`);
    }
  }
  return taken;
}

/**
 * Ploughing is only for open grass. You cannot plough the ground under a barn
 * or inside a pen — the pen is pasture, not a field.
 */
export function canTill(farm: FarmState, tileId: string): boolean {
  const index = farm.tiles.findIndex((t) => t.id === tileId);
  if (index < 0 || farm.tiles[index].kind !== "grass") return false;
  const cell = tileCell(farm.cols, farm.rows, index);
  return !decorCells(farm).has(`${cell.col},${cell.row}`);
}

/** Turn a grass tile into a farmable field. No-op where ploughing isn't allowed. */
export function tillTile(farm: FarmState, tileId: string): FarmState {
  if (!canTill(farm, tileId)) return farm;
  return {
    ...farm,
    tiles: farm.tiles.map((t) => (t.id === tileId ? { ...t, kind: "field" } : t)),
  };
}

/** Let the grass back over an empty field, so a mis-placed plot is fixable. */
export function untillTile(farm: FarmState, tileId: string): FarmState {
  const tile = farm.tiles.find((t) => t.id === tileId);
  if (!tile || tile.kind !== "field" || tile.crop) return farm;
  return {
    ...farm,
    tiles: farm.tiles.map((t) => (t.id === tileId ? { id: t.id, kind: "grass" } : t)),
  };
}

/**
 * Migrate a pre-grid farm (v2: fixed plots) onto the tile grid: each old plot
 * becomes a tilled field near the middle of the meadow, keeping its crop.
 */
export function migratePlotsToTiles(
  oldPlots: { id: string; crop?: PlantedCrop }[],
  animals: Animal[],
): FarmState {
  const farm = initialFarm();
  const startIndex = FARM_COLS * 2 + 1; // row 3, second column — roughly centered
  oldPlots.forEach((plot, i) => {
    const tile = farm.tiles[startIndex + i];
    if (tile) {
      tile.kind = "field";
      tile.crop = plot.crop;
    }
  });
  return withPlacements({
    ...farm,
    animals: animals.length > 0 ? animals : farm.animals,
  });
}
