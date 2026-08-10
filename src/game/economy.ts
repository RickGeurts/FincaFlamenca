// Single source of truth for prices, rewards, and balancing constants.
// Never hardcode these values anywhere else.

import { capacityFor } from "./pen";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

export const ECONOMY = {
  START_MUNTEN: 50,
  START_PLOTS: 6,

  // Earning
  LESSON_MUNTEN: 15,
  LESSON_PERFECT_BONUS: 5,
  REVIEW_MUNTEN: 10,
  CHORE_QUESTION_MUNTEN: 2,
  QUEST_REPLAY_MUNTEN: 20,

  // Streak multiplier
  STREAK_TIER1_DAYS: 3,
  STREAK_TIER1_MULTIPLIER: 1.25,
  STREAK_TIER2_DAYS: 7,
  STREAK_TIER2_MULTIPLIER: 1.5,

  // XP
  XP_PER_CORRECT: 2,
  XP_SESSION_COMPLETE: 10,
  XP_PER_UNIT_UNLOCK: 60,

  MAX_UNIT: 10,
} as const;

// ---------------------------------------------------------------------------
// Farm balancing

/** Watering once shaves this fraction off a crop's total grow time. */
export const WATER_BOOST = 0.25;

/** How long a ready crop stays fresh before wilting. Generous — kindness pillar. */
export const WILT_AFTER_MS = 12 * HOUR_MS;

/** Roughly 1 in 3 chores triggers a one-tap review question. */
export const CHORE_QUESTION_CHANCE = 1 / 3;

/** Reviving wilted crops takes a short review session of this size. */
export const REVIVE_SESSION_MIN = 4;
export const REVIVE_SESSION_MAX = 6;

/** Dev fast mode: crops grow in 10 seconds so the full loop can be tested. */
export const DEV_FAST_GROW_MS = 10_000;

export interface CropDef {
  id: string;
  word: string; // vocab id — every farm entity carries its Dutch word
  emoji: string;
  seedCost: number;
  growMs: number;
  sellPrice: number; // ~2x seed cost; prestige crops pay more
  prestige?: boolean;
}

// Crop roster mixes both worlds: Flemish staples + Colombian crops.
export const CROPS: readonly CropDef[] = [
  { id: "wortel", word: "wortel", emoji: "🥕", seedCost: 5, growMs: 30 * MINUTE_MS, sellPrice: 10 },
  { id: "tulp", word: "tulp", emoji: "🌷", seedCost: 8, growMs: 1 * HOUR_MS, sellPrice: 16 },
  { id: "aardappel", word: "aardappel", emoji: "🥔", seedCost: 10, growMs: 2 * HOUR_MS, sellPrice: 20 },
  { id: "tomaat", word: "tomaat", emoji: "🍅", seedCost: 15, growMs: 3 * HOUR_MS, sellPrice: 30 },
  { id: "mais", word: "mais", emoji: "🌽", seedCost: 18, growMs: 4 * HOUR_MS, sellPrice: 36 },
  { id: "banaan", word: "banaan", emoji: "🍌", seedCost: 24, growMs: 6 * HOUR_MS, sellPrice: 48 },
  { id: "koffie", word: "koffie", emoji: "☕", seedCost: 30, growMs: 8 * HOUR_MS, sellPrice: 90, prestige: true },
];

export const CROPS_BY_ID: ReadonlyMap<string, CropDef> = new Map(CROPS.map((c) => [c.id, c]));

export function getCropDef(id: string): CropDef {
  const def = CROPS_BY_ID.get(id);
  if (!def) throw new Error(`unknown crop: ${id}`);
  return def;
}

export interface AnimalSpeciesDef {
  id: string;
  word: string; // vocab id
  emoji: string;
  cost: number;
  produceWord: string; // vocab id of the produce
  produceEmoji: string;
  produceMs: number; // time after feeding until produce is ready
  produceSellPrice: number;
  hungerAfterMs: number; // time after feeding until hungry again
  /**
   * Body radius in world units. One number, used both to keep animals from
   * walking through each other and to work out how many fit in a pen — so the
   * two can never disagree.
   */
  radius: number;
}

export const ANIMAL_SPECIES: readonly AnimalSpeciesDef[] = [
  {
    id: "kip",
    word: "kip",
    emoji: "🐔",
    cost: 100,
    produceWord: "ei",
    produceEmoji: "🥚",
    produceMs: 2 * HOUR_MS,
    produceSellPrice: 8,
    hungerAfterMs: 6 * HOUR_MS,
    radius: 0.22,
  },
  {
    id: "varken",
    word: "varken",
    emoji: "🐖",
    cost: 300,
    // Truffle-hunting, not meat: she names these animals and keeps them.
    produceWord: "truffel",
    produceEmoji: "🍄",
    produceMs: 3 * HOUR_MS,
    produceSellPrice: 18,
    hungerAfterMs: 7 * HOUR_MS,
    radius: 0.3,
  },
  {
    id: "koe",
    word: "koe",
    emoji: "🐄",
    cost: 600, // also the reward of the veehandelaar quest (M3)
    produceWord: "melk",
    produceEmoji: "🥛",
    produceMs: 4 * HOUR_MS,
    produceSellPrice: 30,
    hungerAfterMs: 8 * HOUR_MS,
    radius: 0.38,
  },
];

export const SPECIES_BY_ID: ReadonlyMap<string, AnimalSpeciesDef> = new Map(
  ANIMAL_SPECIES.map((s) => [s.id, s]),
);

export function getSpeciesDef(id: string): AnimalSpeciesDef {
  const def = SPECIES_BY_ID.get(id);
  if (!def) throw new Error(`unknown species: ${id}`);
  return def;
}

// ---------------------------------------------------------------------------
// Decoration

/** Shop sections. Labels are Spanish and live in content/strings.es. */
export type DecorCategory = "nature" | "water" | "farm" | "home" | "pasture";

export const DECOR_CATEGORIES: readonly DecorCategory[] = [
  "nature",
  "water",
  "farm",
  "home",
  "pasture",
];

export interface DecorDef {
  id: string;
  word: string; // vocab id — decor teaches its Dutch word like everything else
  emoji: string;
  price: number;
  category: DecorCategory;
  /** Footprint in cells, square. One cell when left out. */
  size?: number;
  /** A pen: animals live loose inside it instead of standing on the grid. */
  pen?: boolean;
  /**
   * Earned in a conversation, never sold. Keeping it off the shelves is what
   * makes it worth the conversation — a building you could simply buy is not
   * a reward for talking to anyone.
   */
  questOnly?: boolean;
}

/** Footprint of a decoration, in cells. */
export const decorSize = (def: DecorDef): number => def.size ?? 1;

/**
 * How many of one species fit in a pen of this size. Derived from the animal's
 * body, not from a table of guesses — see game/pen.
 */
export function penCapacity(size: number, speciesId: string): number {
  return capacityFor(size, getSpeciesDef(speciesId).radius);
}

/**
 * A pure cosmetic sink, priced 20-200. Every munt spent here was earned by
 * practising Dutch, so decorating the farm is a reward for studying.
 */
export const DECOR: readonly DecorDef[] = [
  // Naturaleza
  { id: "steen", word: "steen", emoji: "🪨", price: 20, category: "nature" },
  { id: "plant", word: "plant", emoji: "🪴", price: 20, category: "nature" },
  { id: "struik", word: "struik", emoji: "🌿", price: 25, category: "nature" },
  { id: "bloemen", word: "bloemen", emoji: "🌼", price: 30, category: "nature" },
  { id: "pompoen", word: "pompoen", emoji: "🎃", price: 35, category: "nature" },
  { id: "boom", word: "boom", emoji: "🌳", price: 40, category: "nature" },
  { id: "boomgaard", word: "boomgaard", emoji: "🌲", price: 110, category: "nature" },

  // Agua y caminos
  { id: "pad", word: "pad", emoji: "🛤️", price: 20, category: "water" },
  { id: "brug", word: "brug", emoji: "🌉", price: 80, category: "water" },
  { id: "put", word: "put", emoji: "🪣", price: 90, category: "water" },
  { id: "vijver", word: "vijver", emoji: "💧", price: 100, category: "water" },

  // Granja
  { id: "hek", word: "hek", emoji: "🚧", price: 30, category: "farm" },
  { id: "vat", word: "vat", emoji: "🛢️", price: 35, category: "farm" },
  { id: "gieter", word: "gieter", emoji: "🚿", price: 40, category: "farm" },
  { id: "plantenbak", word: "plantenbak", emoji: "🪟", price: 45, category: "farm" },
  { id: "hooiberg", word: "hooiberg", emoji: "🌾", price: 60, category: "farm" },
  { id: "kar", word: "kar", emoji: "🛒", price: 70, category: "farm" },
  { id: "bijenkorf", word: "bijenkorf", emoji: "🐝", price: 130, category: "farm" },
  { id: "tractor", word: "tractor", emoji: "🚜", price: 190, category: "farm" },

  // Prados — fenced pens. Animals roam loose inside, off the grid.
  { id: "wei2", word: "wei", emoji: "🐑", price: 140, category: "pasture", size: 2, pen: true },
  { id: "wei4", word: "wei", emoji: "🐑", price: 420, category: "pasture", size: 4, pen: true },
  { id: "wei6", word: "wei", emoji: "🐑", price: 860, category: "pasture", size: 6, pen: true },

  // Casa y muebles
  { id: "bank", word: "bank", emoji: "🪑", price: 45, category: "home" },
  { id: "tafel", word: "tafel", emoji: "🍽️", price: 50, category: "home" },
  { id: "lamp", word: "lamp", emoji: "💡", price: 55, category: "home" },
  { id: "kraam", word: "kraam", emoji: "🏪", price: 120, category: "home" },
  { id: "molen", word: "molen", emoji: "🌬️", price: 160, category: "home" },
  { id: "schuur", word: "schuur", emoji: "🏚️", price: 170, category: "home" },
  // A proper farmhouse: two cells across, so it reads as a building.
  { id: "huis", word: "huis", emoji: "🏠", price: 200, category: "home", size: 2 },
  // A piece of home, earned by explaining arepas to a Flemish market master.
  // Not for sale: the price is the conversation.
  {
    id: "arepakraam",
    word: "arepakraam",
    emoji: "🫓",
    price: 200,
    category: "home",
    questOnly: true,
  },
];

/** What the shop actually has on its shelves. */
export function decorByCategory(category: DecorCategory): DecorDef[] {
  return DECOR.filter((d) => d.category === category && !d.questOnly);
}

export const DECOR_BY_ID: ReadonlyMap<string, DecorDef> = new Map(DECOR.map((d) => [d.id, d]));

export function getDecorDef(id: string): DecorDef {
  const def = DECOR_BY_ID.get(id);
  if (!def) throw new Error(`unknown decor: ${id}`);
  return def;
}

// ---------------------------------------------------------------------------
// Session rewards

export type SessionKind = "lesson" | "review" | "revive";

export interface SessionReward {
  munten: number;
  xp: number;
  perfect: boolean;
  multiplier: number;
}

export function streakMultiplier(streakDays: number): number {
  if (streakDays >= ECONOMY.STREAK_TIER2_DAYS) return ECONOMY.STREAK_TIER2_MULTIPLIER;
  if (streakDays >= ECONOMY.STREAK_TIER1_DAYS) return ECONOMY.STREAK_TIER1_MULTIPLIER;
  return 1;
}

export function sessionReward(opts: {
  kind: SessionKind;
  correct: number;
  total: number;
  streakDays: number;
}): SessionReward {
  const perfect = opts.total > 0 && opts.correct === opts.total;
  let base: number;
  switch (opts.kind) {
    case "lesson":
      base = ECONOMY.LESSON_MUNTEN + (perfect ? ECONOMY.LESSON_PERFECT_BONUS : 0);
      break;
    case "review":
      base = ECONOMY.REVIEW_MUNTEN;
      break;
    case "revive":
      base = 0; // reviving the crops IS the reward — reviewing, not paying
      break;
  }
  const multiplier = streakMultiplier(opts.streakDays);
  const munten = Math.round(base * multiplier);
  const xp = ECONOMY.XP_SESSION_COMPLETE + opts.correct * ECONOMY.XP_PER_CORRECT;
  return { munten, xp, perfect, multiplier };
}

/** XP required before a course unit becomes available. Unit 1 is always open. */
export function xpRequiredForUnit(unit: number): number {
  return (unit - 1) * ECONOMY.XP_PER_UNIT_UNLOCK;
}

export function unlockedUnitsForXp(xp: number): number[] {
  const units: number[] = [];
  for (let u = 1; u <= ECONOMY.MAX_UNIT; u++) {
    if (xp >= xpRequiredForUnit(u)) units.push(u);
  }
  return units;
}
