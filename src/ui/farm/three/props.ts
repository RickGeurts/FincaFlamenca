// Mapping of game entities onto named nodes inside public/models/farm-props.glb
// (extracted from the purchased "Cartoon Farm Islands" pack by
// scripts/extract-farm-props.mjs). Swap art here without touching the scene.

import { DECOR } from "../../../game/economy";

export const MODEL_URL = "/models/farm-props.glb";

export const PROP = {
  garden: "Isl_1_Garden_1", // tilled soil bed
  sprout: "Isl_3_Plant_1", // growth stage 1
  // Growth stage 2 reuses Plant_1 at a larger size: the pack's Plant_2 is a
  // nearly flat ground-cover mesh (h≈0.25×w) and scales up like a pancake.
  young: "Isl_3_Plant_1",
  house: "Isl_1_House_1",
  windmill: "Isl_8_Windmill_1",
  tree: "Isl_5_Tree_1",
  cart: "Isl_1_Cart_1",
  stand: "Isl_4_Stand_1",
  well: "Isl_9_Well_1",
  flowers: "Isl_2_Flowers_1",
  // Decoration shop
  stone: "Isl_5_Stone_1",
  path: "Isl_9_Path_1",
  potPlant: "Isl_6_Plant_1",
  bush: "Isl_5_Bush_1",
  flowerBed: "Isl_9_Garden_with_Flowers_1",
  fence: "Isl_5_Fence_1",
  pumpkin: "Isl_1_Pumpkin_1",
  barrel: "Isl_1_Barrel_1",
  wateringCan: "Isl_9_Watering_can_1",
  bench: "Isl_9_Bench_1",
  table: "Isl_10_Table_1",
  stool: "Isl_10_Stool_1",
  lamp: "Isl_7_Lamp_1",
  // Chimney smoke. The pack's clouds are the right shape and palette, so the
  // smoke is made of the same art as everything else rather than a sprite.
  puffs: ["Isl_8_Cloud_1", "Isl_8_Cloud_2", "Isl_8_Cloud_3"],
  haystack: "Isl_4_Haystack_1",
  bridge: "Isl_7_Bridge_1",
  lake: "Isl_6_Lake_1",
  tallTree: "Isl_9_Tree_1",
  beehouse: "Isl_10_Beehouse_1",
  barn: "Isl_9_Barn_1",
  tractor: "Isl_8_Tractor_1",
} as const;

/** Grown-crop model per crop id. */
export const CROP_PROP: Record<string, string> = {
  wortel: "Isl_1_Carrot_2",
  tulp: "Isl_2_Flowers_1",
  aardappel: "Isl_1_Turnip_1",
  tomaat: "Isl_3_Tomato_Bush_2",
  mais: "Isl_2_Corn_1",
  banaan: "Isl_4_Wheat_Ear_1", // closest match in the pack
  koffie: "Isl_10_Bush_1",
};

/**
 * One mesh inside a decoration. Most pieces are a single part; a few compose
 * several copies into one object, which is how a 19-mesh pack yields more
 * than 19 decorations.
 */
export interface DecorPart {
  node: string;
  /** Max height. Omit for flat pieces (paths, ponds) sized by footprint alone. */
  height?: number;
  footprint: number;
  /** Offset within the cell, world units. */
  x?: number;
  z?: number;
  rotY?: number;
}

/**
 * Fence ring for every pen size the shop sells. One panel per cell along each
 * side: the mesh is 0.57 tall for every 1.0 of length, so a panel per cell
 * stays fence-height while a single long panel would rise into a wall.
 */
function penParts(): Record<string, readonly DecorPart[]> {
  const pens: Record<string, readonly DecorPart[]> = {};
  for (const def of DECOR) {
    if (!def.pen) continue;
    const size = def.size ?? 1;
    const half = size / 2;
    const parts: DecorPart[] = [];
    for (let i = 0; i < size; i++) {
      // Panel centres run -half+0.5, ..., +half-0.5 along each side.
      const along = -half + 0.5 + i;
      parts.push({ node: PROP.fence, footprint: 0.95, x: along, z: -half });
      parts.push({ node: PROP.fence, footprint: 0.95, x: along, z: half });
      parts.push({ node: PROP.fence, footprint: 0.95, x: -half, z: along, rotY: Math.PI / 2 });
      parts.push({ node: PROP.fence, footprint: 0.95, x: half, z: along, rotY: Math.PI / 2 });
    }
    pens[def.id] = parts;
  }
  return pens;
}

/**
 * Parts per decor kind (DecorDef id). Sizes are world units, chosen from the
 * measured aspect ratios printed by scripts/measure-props.mjs.
 */
export const DECOR_PROP: Record<string, readonly DecorPart[]> = {
  // Ground cover — flat, sized by footprint so they lie in the grass
  pad: [{ node: PROP.path, footprint: 0.95 }],
  vijver: [{ node: PROP.lake, footprint: 0.9 }],
  brug: [{ node: PROP.bridge, footprint: 0.95 }],
  bloemen: [{ node: PROP.flowerBed, footprint: 0.82 }],

  // Small things
  steen: [{ node: PROP.stone, height: 0.3, footprint: 0.44 }],
  plant: [{ node: PROP.potPlant, height: 0.45, footprint: 0.4 }],
  struik: [{ node: PROP.bush, height: 0.5, footprint: 0.6 }],
  pompoen: [{ node: PROP.pumpkin, height: 0.3, footprint: 0.42 }],
  vat: [{ node: PROP.barrel, height: 0.5, footprint: 0.46 }],
  gieter: [{ node: PROP.wateringCan, height: 0.28, footprint: 0.42 }],
  // The raised bed that used to stand in for ploughed soil; now a decoration
  // in its own right, since a field is flat earth, not a planter.
  plantenbak: [{ node: PROP.garden, footprint: 0.88 }],
  hek: [{ node: PROP.fence, footprint: 0.92 }],
  lamp: [{ node: PROP.lamp, height: 0.85, footprint: 0.35 }],

  // Furniture and farm gear
  bank: [{ node: PROP.bench, height: 0.42, footprint: 0.75 }],
  tafel: [
    { node: PROP.table, height: 0.45, footprint: 0.66 },
    { node: PROP.stool, height: 0.28, footprint: 0.26, x: 0.3, z: 0.26 },
  ],
  hooiberg: [{ node: PROP.haystack, height: 0.6, footprint: 0.7 }],
  kar: [{ node: PROP.cart, height: 0.7, footprint: 1.0 }],
  put: [{ node: PROP.well, height: 0.95, footprint: 0.85 }],
  bijenkorf: [{ node: PROP.beehouse, height: 0.7, footprint: 0.6 }],

  // Trees
  boom: [{ node: PROP.tree, height: 1.4, footprint: 1.15 }],
  boomgaard: [
    { node: PROP.tallTree, height: 0.95, footprint: 0.5, x: -0.25, z: -0.19 },
    { node: PROP.tallTree, height: 1.15, footprint: 0.54, x: 0.24, z: -0.08, rotY: 0.9 },
    { node: PROP.tallTree, height: 0.85, footprint: 0.46, x: 0.01, z: 0.27, rotY: 2.1 },
  ],

  // Buildings and big pieces
  kraam: [{ node: PROP.stand, height: 0.9, footprint: 1.3 }],
  tractor: [{ node: PROP.tractor, height: 0.9, footprint: 1.2 }],
  // Stands a head above the 2.01 farmhouse, the way a mill should.
  molen: [{ node: PROP.windmill, height: 2.45, footprint: 1.1 }],
  schuur: [{ node: PROP.barn, height: 1.5, footprint: 1.5 }],
  // Two cells across (size: 2 in economy), so it can be a real farmhouse
  // rather than a cottage squeezed into a single square.
  huis: [{ node: PROP.house, height: 2.2, footprint: 2.1 }],

  // Pens, one entry per size the shop sells
  ...penParts(),
};

const FALLBACK_DECOR: readonly DecorPart[] = [
  { node: PROP.tree, height: 1.2, footprint: 1.0 },
];

export function getDecorProp(kind: string): readonly DecorPart[] {
  return DECOR_PROP[kind] ?? FALLBACK_DECOR;
}

/**
 * Where a chimney sits, so smoke comes out of the right spot rather than a
 * guessed one.
 *
 * Found by reading the mesh: on Isl_1_House_1 the top 4% of vertices form a
 * narrow stack (15% x 2% of the model) offset from the roof ridge, while 15%
 * down the slice widens to the ridge itself. Stored as fractions of the
 * model's own size, so it survives the runtime rescale.
 */
export interface Chimney {
  /** Offset from the model's centre, as a fraction of its width and depth. */
  fx: number;
  fz: number;
}

export const CHIMNEYS: Record<string, Chimney> = {
  huis: { fx: 0.194, fz: -0.264 },
};

/**
 * Where a mill's sails are, so they can be cut out of the model and turned.
 *
 * The pack ships the windmill as one merged mesh, so the sails have to be
 * found rather than looked up. Measured on Isl_8_Windmill_1: the tower narrows
 * to 0.45 wide by 70% of its height and then flares to 1.80, and inside a thin
 * slice at that height the vertices form six arms exactly 60° apart. The axle
 * is the direction the sail cloud is thinnest — Z, i.e. the sails face front.
 *
 * Everything is a fraction of the model's own height, so it survives resizing.
 */
export interface Sails {
  /** Hub height above the base. */
  fy: number;
  /** Hub offset from the model's centre along the axle. */
  fz: number;
  /** Ignore anything closer to the hub than this — that is tower, not sail. */
  fInner: number;
  /** ...or further out than this. */
  fOuter: number;
  /** Half-thickness of the disc the sails live in. */
  fSlice: number;
  /** Turns per second. Slow: a mill that spins fast looks like a fan. */
  speed: number;
}

export const SAILS: Record<string, Sails> = {
  molen: {
    fy: 0.867,
    fz: 0.034,
    fInner: 0.036,
    fOuter: 0.166,
    fSlice: 0.022,
    speed: 0.055,
  },
};

/** Animal model per species id. */
export const ANIMAL_PROP: Record<string, string> = {
  kip: "Isl_1_Chicken_1",
  koe: "Isl_5_Cow_1",
  varken: "Isl_6_Pig_1",
};

/** Rendered height per species, so a chicken never towers over a cow. */
export const ANIMAL_HEIGHT: Record<string, number> = {
  kip: 0.45,
  varken: 0.55,
  koe: 0.7,
};

export const DEFAULT_ANIMAL_HEIGHT = 0.5;

