// Object placement on the island grid.
//
// Decor and animals sit on an invisible lattice that extends the crop grid by
// one ring on every side, so the farmhouse row and the animal row line up with
// the fields instead of floating at hand-tuned offsets. One object per cell;
// rotation is quarter turns only. Pure logic — the 3D scene just reads cells.

/** Quarter turns; multiply by 90° when rendering. */
export type Quarter = 0 | 1 | 2 | 3;

export interface Placement {
  col: number;
  row: number;
  rot: Quarter;
}

/** Object id -> cell. Ids are namespaced (`decor:house`, `animal:a1`). */
export type Placements = Record<string, Placement>;

/**
 * Grid size. Chosen so the 5x6 crop grid sits centred with exactly one spare
 * ring around it, and the outer ring still lands on the island mesh
 * (7x8 cells vs. an island of 7.8 x 9.0 world units).
 */
export const PLACE_COLS = 7;
export const PLACE_ROWS = 8;

export const decorKey = (id: string): string => `decor:${id}`;
export const animalKey = (id: string): string => `animal:${id}`;

const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < PLACE_COLS && row >= 0 && row < PLACE_ROWS;
}

/** Cell centre in world units, on the same lattice as the crop tiles. */
export function cellToWorld(col: number, row: number): { x: number; z: number } {
  return { x: col - (PLACE_COLS - 1) / 2, z: row - (PLACE_ROWS - 1) / 2 };
}

/** Nearest cell to a world point, clamped to the island. This is the snap. */
export function worldToCell(x: number, z: number): { col: number; row: number } {
  return {
    col: clamp(Math.round(x + (PLACE_COLS - 1) / 2), PLACE_COLS - 1),
    row: clamp(Math.round(z + (PLACE_ROWS - 1) / 2), PLACE_ROWS - 1),
  };
}

/**
 * Anchor cell for dragging an object of a given size: the footprint centres
 * under the pointer instead of hanging down and to the right of it, and is
 * clamped so the whole shape stays on the island.
 */
export function worldToAnchor(
  x: number,
  z: number,
  spec: ObjectSpec = UNIT_SPEC,
  rot: Quarter = 0,
): { col: number; row: number } {
  const { w, h } = rotatedSize(spec, rot);
  return {
    col: clamp(Math.round(x + (PLACE_COLS - 1) / 2 - (w - 1) / 2), PLACE_COLS - w),
    row: clamp(Math.round(z + (PLACE_ROWS - 1) / 2 - (h - 1) / 2), PLACE_ROWS - h),
  };
}

/** Which placement cell a crop tile occupies, so crops and decor can't collide. */
export function tileCell(
  cols: number,
  rows: number,
  index: number,
): { col: number; row: number } {
  return {
    col: (index % cols) + (PLACE_COLS - cols) / 2,
    row: Math.floor(index / cols) + (PLACE_ROWS - rows) / 2,
  };
}

// ---------------------------------------------------------------------------
// Footprints
//
// Most objects fill one cell. A pasture covers several, and — unlike anything
// else — animals are allowed to stand inside one. That is the whole trick
// behind dropping animals into a pen: shared cells, not nested objects.

export type ObjectKind = "animal" | "pasture" | "object";

export interface ObjectSpec {
  /** Footprint in cells, before rotation. */
  w: number;
  h: number;
  kind: ObjectKind;
}

export type SpecOf = (id: string) => ObjectSpec;

export const UNIT_SPEC: ObjectSpec = { w: 1, h: 1, kind: "object" };
const unitSpecOf: SpecOf = () => UNIT_SPEC;

/** Footprint size after a quarter turn: odd turns swap width and depth. */
function rotatedSize(spec: ObjectSpec, rot: Quarter): { w: number; h: number } {
  return rot % 2 === 1 ? { w: spec.h, h: spec.w } : { w: spec.w, h: spec.h };
}

/** Every cell an object covers from a given anchor. */
export function footprintOf(place: Placement, spec: ObjectSpec): { col: number; row: number }[] {
  const { w, h } = rotatedSize(spec, place.rot);
  const cells: { col: number; row: number }[] = [];
  for (let dc = 0; dc < w; dc++) {
    for (let dr = 0; dr < h; dr++) cells.push({ col: place.col + dc, row: place.row + dr });
  }
  return cells;
}

/** Where the object is drawn: the middle of its footprint, in world units. */
export function centerWorld(place: Placement, spec: ObjectSpec): { x: number; z: number } {
  const { w, h } = rotatedSize(spec, place.rot);
  const anchor = cellToWorld(place.col, place.row);
  return { x: anchor.x + (w - 1) / 2, z: anchor.z + (h - 1) / 2 };
}

export function occupantsAt(
  placements: Placements,
  col: number,
  row: number,
  specOf: SpecOf = unitSpecOf,
): string[] {
  return Object.keys(placements).filter((id) =>
    footprintOf(placements[id], specOf(id)).some((c) => c.col === col && c.row === row),
  );
}

/** The first thing standing on a cell, if anything is. */
export function occupantAt(
  placements: Placements,
  col: number,
  row: number,
  specOf: SpecOf = unitSpecOf,
): string | undefined {
  return occupantsAt(placements, col, row, specOf)[0];
}

/** A cell the player may not drop onto (a growing crop would be crushed). */
export type Blocked = (col: number, row: number) => boolean;

/** Core test: would this footprint sit here without clashing? */
function fits(
  placements: Placements,
  spec: ObjectSpec,
  place: Placement,
  blocked: Blocked,
  specOf: SpecOf,
  ignoreId?: string,
): boolean {
  const cells = footprintOf(place, spec);
  for (const cell of cells) {
    if (!inBounds(cell.col, cell.row)) return false;
    if (blocked(cell.col, cell.row)) return false;
  }
  for (const otherId of Object.keys(placements)) {
    if (otherId === ignoreId) continue;
    const otherCells = footprintOf(placements[otherId], specOf(otherId));
    const clash = otherCells.some((o) => cells.some((c) => c.col === o.col && c.row === o.row));
    if (clash) return false;
  }
  return true;
}

export function canPlace(
  placements: Placements,
  id: string,
  col: number,
  row: number,
  blocked: Blocked = () => false,
  specOf: SpecOf = unitSpecOf,
): boolean {
  const rot = placements[id]?.rot ?? 0;
  return fits(placements, specOf(id), { col, row, rot }, blocked, specOf, id);
}

/** Move an object. Returns the map unchanged when the target is not free. */
export function move(
  placements: Placements,
  id: string,
  col: number,
  row: number,
  blocked: Blocked = () => false,
  specOf: SpecOf = unitSpecOf,
): Placements {
  const current = placements[id];
  if (!current) return placements;
  if (!canPlace(placements, id, col, row, blocked, specOf)) return placements;
  return { ...placements, [id]: { ...current, col, row } };
}

/** Turn an object a quarter turn clockwise, if the turned shape still fits. */
export function rotate(
  placements: Placements,
  id: string,
  blocked: Blocked = () => false,
  specOf: SpecOf = unitSpecOf,
): Placements {
  const current = placements[id];
  if (!current) return placements;
  const rot = ((current.rot + 1) % 4) as Quarter;
  const turned = { ...current, rot };
  if (!fits(placements, specOf(id), turned, blocked, specOf, id)) return placements;
  return { ...placements, [id]: turned };
}

/**
 * First spot the given footprint fits, scanning from the front row backwards
 * so newly bought things appear where the player is already looking.
 */
export function firstFreeSpot(
  placements: Placements,
  spec: ObjectSpec = UNIT_SPEC,
  blocked: Blocked = () => false,
  specOf: SpecOf = unitSpecOf,
): { col: number; row: number } | undefined {
  for (let row = PLACE_ROWS - 1; row >= 0; row--) {
    for (let col = 0; col < PLACE_COLS; col++) {
      if (fits(placements, spec, { col, row, rot: 0 }, blocked, specOf)) return { col, row };
    }
  }
  return undefined;
}

/** First free single cell — the common case. */
export function firstFreeCell(
  placements: Placements,
  blocked: Blocked = () => false,
  specOf: SpecOf = unitSpecOf,
): { col: number; row: number } | undefined {
  return firstFreeSpot(placements, UNIT_SPEC, blocked, specOf);
}
