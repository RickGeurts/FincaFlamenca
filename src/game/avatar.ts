// Dressing the character.
//
// The wardrobe is not a cosmetic side-pocket: it is how unit 6 «Ropa y
// colores» is practised. Every garment carries its article and its Dutch word,
// every colour is a word too, and an outfit is a little phrase. Trying things
// on is always free — only buying costs munten, and nothing is ever taken off
// her again.

/** The layers the figure is drawn from, back to front. */
export type Slot =
  | "skin"
  | "hair"
  | "bottom"
  | "shoes"
  | "top"
  | "face"
  | "hat"
  | "accessory"
  | "carry";

export type ColorId =
  | "rood"
  | "blauw"
  | "geel"
  | "groen"
  | "oranje"
  | "bruin"
  | "zwart"
  | "wit"
  | "roze"
  | "grijs";

export interface ColorDef {
  id: ColorId;
  /** Vocabulary id — a colour is a word she learns, not a swatch. */
  word: string;
  hex: string;
  /** Finish this unit's lessons and the colour appears. */
  unit: number;
}

/**
 * Ten colours. The first four come with unit 6; the rest arrive as she works
 * through it, so the palette itself is a progress bar.
 */
export const COLORS: readonly ColorDef[] = [
  { id: "rood", word: "rood", hex: "#b91c1c", unit: 6 },
  { id: "blauw", word: "blauw", hex: "#3d6ea8", unit: 6 },
  { id: "geel", word: "geel", hex: "#d4a017", unit: 6 },
  { id: "groen", word: "groen", hex: "#65a30d", unit: 6 },
  { id: "wit", word: "wit", hex: "#fefaf3", unit: 6 },
  { id: "zwart", word: "zwart", hex: "#2a1c10", unit: 6 },
  { id: "oranje", word: "oranje", hex: "#d97706", unit: 7 },
  { id: "bruin", word: "bruin", hex: "#6b4423", unit: 7 },
  { id: "roze", word: "roze", hex: "#c04a6e", unit: 7 },
  { id: "grijs", word: "grijs", hex: "#8a8378", unit: 8 },
];

export const COLOR_BY_ID: ReadonlyMap<ColorId, ColorDef> = new Map(
  COLORS.map((c) => [c.id, c]),
);

/** What she is paid the first time she uses a colour. Once per colour, ever. */
export const COLOR_REWARD_MUNTEN = 2;

/** Skin tones carry no vocabulary on purpose: this is identity, not a lesson. */
export const SKINS = ["#f0c9a4", "#dda877", "#b57c4f", "#8a5a34", "#6b4423"] as const;
export type SkinId = 0 | 1 | 2 | 3 | 4;

/** Hair colours are their own small palette, not the garment one. */
export const HAIR_COLORS = ["#2a1c10", "#6b4423", "#b45309", "#d4a017", "#8a6c4a"] as const;
export type HairColorId = 0 | 1 | 2 | 3 | 4;

export type FaceId = 0 | 1 | 2;

export interface WearableDef {
  id: string;
  slot: Exclude<Slot, "skin" | "face">;
  /** Vocabulary id: every garment teaches its Dutch word with its article. */
  word: string;
  emoji: string;
  price: number;
  /** The unit that must be open before it appears in the shop. */
  unit?: number;
  /** Colombian pieces and the showstoppers: kept special, priced accordingly. */
  prestige?: boolean;
  /** Tinted at runtime, so one drawing serves every colour. */
  colourable?: boolean;
}

/**
 * Everything she can wear. Prices are a cosmetic sink in the same 20-200 band
 * as the decorations, so an outfit is always a few lessons away rather than a
 * grind.
 */
export const WEARABLES: readonly WearableDef[] = [
  // Cabello — free with unit 6, two of them from the start
  { id: "hair_short", slot: "hair", word: "kort-haar", emoji: "💇", price: 0 },
  { id: "hair_tail", slot: "hair", word: "staart", emoji: "💇‍♀️", price: 0 },
  { id: "hair_curls", slot: "hair", word: "krullen", emoji: "👩‍🦱", price: 20, unit: 6 },
  { id: "hair_braid", slot: "hair", word: "vlecht", emoji: "🧑‍🦰", price: 20, unit: 6 },
  { id: "hair_bun", slot: "hair", word: "knot", emoji: "👱‍♀️", price: 30, unit: 6 },

  // Ropa
  { id: "top_hemd", slot: "top", word: "hemd", emoji: "👕", price: 0, colourable: true },
  { id: "top_trui", slot: "top", word: "trui", emoji: "🧥", price: 45, unit: 6, colourable: true },
  { id: "top_jas", slot: "top", word: "jas", emoji: "🧥", price: 80, unit: 6, colourable: true },
  { id: "top_jurk", slot: "top", word: "jurk", emoji: "👗", price: 70, unit: 6, colourable: true },
  {
    id: "top_regenjas",
    slot: "top",
    word: "regenjas",
    emoji: "🧥",
    price: 90,
    unit: 7,
    colourable: true,
  },
  {
    id: "top_pollera",
    slot: "top",
    word: "rok",
    emoji: "🥻",
    price: 120,
    unit: 6,
    prestige: true,
    colourable: true,
  },
  { id: "bottom_broek", slot: "bottom", word: "broek", emoji: "👖", price: 0, colourable: true },
  { id: "bottom_rok", slot: "bottom", word: "rok", emoji: "👗", price: 40, unit: 6, colourable: true },
  {
    id: "bottom_short",
    slot: "bottom",
    word: "korte-broek",
    emoji: "🩳",
    price: 30,
    unit: 6,
    colourable: true,
  },
  {
    id: "bottom_overall",
    slot: "bottom",
    word: "overall",
    emoji: "🧵",
    price: 65,
    unit: 6,
    colourable: true,
  },

  // Sombreros
  {
    id: "hat_vueltiao",
    slot: "hat",
    word: "hoed",
    emoji: "👒",
    price: 0,
    prestige: true,
  },
  { id: "hat_pet", slot: "hat", word: "pet", emoji: "🧢", price: 40, unit: 6, colourable: true },
  { id: "hat_strohoed", slot: "hat", word: "strohoed", emoji: "👒", price: 55, unit: 6 },
  { id: "hat_muts", slot: "hat", word: "muts", emoji: "🧶", price: 45, unit: 7, colourable: true },
  { id: "hat_bloem", slot: "hat", word: "bloem", emoji: "🌸", price: 35, unit: 6, colourable: true },
  { id: "hat_kroon", slot: "hat", word: "kroon", emoji: "👑", price: 150, unit: 8, prestige: true },

  // Calzado
  { id: "shoes_laars", slot: "shoes", word: "laars", emoji: "🥾", price: 0, colourable: true },
  { id: "shoes_schoen", slot: "shoes", word: "schoen", emoji: "👞", price: 35, unit: 6, colourable: true },
  { id: "shoes_sandaal", slot: "shoes", word: "sandaal", emoji: "🩴", price: 30, unit: 6, colourable: true },
  { id: "shoes_klomp", slot: "shoes", word: "klomp", emoji: "🥿", price: 90, unit: 6, prestige: true },

  // Extras
  { id: "acc_sjaal", slot: "accessory", word: "sjaal", emoji: "🧣", price: 50, unit: 6, colourable: true },
  { id: "acc_bril", slot: "accessory", word: "bril", emoji: "👓", price: 45, unit: 6 },
  { id: "acc_zonnebril", slot: "accessory", word: "zonnebril", emoji: "🕶️", price: 60, unit: 6 },
  { id: "acc_ketting", slot: "accessory", word: "ketting", emoji: "📿", price: 55, unit: 6 },
  {
    id: "acc_handschoen",
    slot: "accessory",
    word: "handschoen",
    emoji: "🧤",
    price: 40,
    unit: 7,
    colourable: true,
  },
  { id: "carry_rugzak", slot: "carry", word: "rugzak", emoji: "🎒", price: 80, unit: 6, colourable: true },
  {
    id: "carry_mochila",
    slot: "carry",
    word: "tas",
    emoji: "👝",
    price: 130,
    unit: 6,
    prestige: true,
  },
  { id: "carry_paraplu", slot: "carry", word: "paraplu", emoji: "☂️", price: 70, unit: 7, colourable: true },
  { id: "carry_mand", slot: "carry", word: "mand", emoji: "🧺", price: 45, unit: 6 },
];

export const WEARABLE_BY_ID: ReadonlyMap<string, WearableDef> = new Map(
  WEARABLES.map((w) => [w.id, w]),
);

export function getWearable(id: string): WearableDef {
  const def = WEARABLE_BY_ID.get(id);
  if (!def) throw new Error(`unknown wearable "${id}"`);
  return def;
}

/** What one slot is wearing: a garment and the colour it is worn in. */
export interface Worn {
  itemId: string;
  colorId: ColorId;
}

export interface AvatarConfig {
  skin: SkinId;
  face: FaceId;
  hair: { itemId: string; colorId: HairColorId };
  top?: Worn;
  bottom?: Worn;
  shoes?: Worn;
  hat?: Worn;
  accessory?: Worn;
  carry?: Worn;
}

/** The look she starts in: the farmer, with the sombrero vueltiao from day one. */
export function defaultAvatar(): AvatarConfig {
  return {
    skin: 2,
    face: 0,
    hair: { itemId: "hair_tail", colorId: 0 },
    top: { itemId: "top_hemd", colorId: "wit" },
    bottom: { itemId: "bottom_broek", colorId: "blauw" },
    shoes: { itemId: "shoes_laars", colorId: "bruin" },
    hat: { itemId: "hat_vueltiao", colorId: "wit" },
  };
}

/** Free from the start: enough to be somebody before she has earned anything. */
export const STARTER_ITEMS: readonly string[] = [
  "hair_short",
  "hair_tail",
  "top_hemd",
  "bottom_broek",
  "shoes_laars",
  "hat_vueltiao",
];

/** Colours she can use before unit 6 has taught her any. */
export const STARTER_COLORS: readonly ColorId[] = ["wit", "blauw", "bruin"];

/**
 * A dress covers the legs, so the trousers underneath would only poke out.
 * The rule lives here rather than in the drawing code, because "what is she
 * wearing" is a question the wardrobe screen asks too.
 */
export function hidesLegs(config: AvatarConfig): boolean {
  const top = config.top?.itemId;
  return top === "top_jurk" || top === "top_pollera";
}

/** A knitted hat sits low, so the fringe is tucked away under it. */
export function hidesFringe(config: AvatarConfig): boolean {
  return config.hat?.itemId === "hat_muts";
}

/** What is actually drawn, after the rules above have had their say. */
export function visibleSlots(config: AvatarConfig): Slot[] {
  const slots: Slot[] = ["skin", "hair"];
  if (!hidesLegs(config) && config.bottom) slots.push("bottom");
  if (config.shoes) slots.push("shoes");
  if (config.top) slots.push("top");
  slots.push("face");
  if (config.hat) slots.push("hat");
  if (config.accessory) slots.push("accessory");
  if (config.carry) slots.push("carry");
  return slots;
}

export interface OutfitDef {
  id: string;
  /** The phrase it teaches — an outfit is a sentence, not a list. */
  word: string;
  es: string;
  items: string[];
  unit?: number;
}

/** Themed sets. Wearing one is free; owning the pieces is what costs. */
export const OUTFITS: readonly OutfitDef[] = [
  {
    id: "set_boerin",
    word: "boerin",
    es: "la granjera",
    items: ["top_hemd", "bottom_broek", "shoes_laars", "hat_vueltiao"],
  },
  {
    id: "set_feest",
    word: "feest",
    es: "la feria",
    items: ["top_pollera", "hat_bloem", "shoes_sandaal"],
    unit: 6,
  },
  {
    id: "set_zondag",
    word: "zondag",
    es: "el domingo",
    items: ["top_jurk", "shoes_schoen", "acc_ketting"],
    unit: 6,
  },
  {
    id: "set_regen",
    word: "regen",
    es: "la lluvia",
    items: ["top_regenjas", "shoes_laars", "carry_paraplu"],
    unit: 7,
  },
  {
    id: "set_winter",
    word: "winter",
    es: "el invierno",
    // Gloves and a scarf compete for the same slot, so the set takes the
    // scarf: a set she can never fully wear would never say "En uso".
    items: ["top_jas", "hat_muts", "acc_sjaal"],
    unit: 7,
  },
];

/** Whether the shop will show it yet. */
export function isUnlocked(def: { unit?: number }, unlockedUnits: number[]): boolean {
  return def.unit === undefined || unlockedUnits.includes(def.unit);
}

/** Colours she may dress in: the starters, plus whatever her units have taught. */
export function availableColors(unlockedUnits: number[]): ColorDef[] {
  return COLORS.filter(
    (c) => STARTER_COLORS.includes(c.id) || unlockedUnits.includes(c.unit),
  );
}

/** Everything in one slot that is worth showing her, cheapest first. */
export function wearablesForSlot(slot: Slot): WearableDef[] {
  return WEARABLES.filter((w) => w.slot === slot).sort((a, b) => a.price - b.price);
}

/**
 * Putting an outfit on. Pieces she does not own are skipped rather than
 * refused: half a set is still a look, and the missing piece is right there in
 * the shop with its price on it.
 */
export function wearOutfit(
  config: AvatarConfig,
  outfit: OutfitDef,
  owned: string[],
): AvatarConfig {
  let next = { ...config };
  for (const itemId of outfit.items) {
    if (!owned.includes(itemId)) continue;
    const def = getWearable(itemId);
    if (def.slot === "hair") {
      next = { ...next, hair: { ...next.hair, itemId } };
      continue;
    }
    // Keep the colour the slot was already wearing where that makes sense, so
    // a set does not silently repaint her whole wardrobe.
    const current = next[def.slot];
    next = { ...next, [def.slot]: { itemId, colorId: current?.colorId ?? "wit" } };
  }
  // A dress makes the trousers pointless; drop them so the set reads cleanly.
  if (hidesLegs(next)) next = { ...next, bottom: undefined };
  return next;
}

/** How much of a set she is actually wearing, for the "En uso" mark. */
export function isWearingOutfit(config: AvatarConfig, outfit: OutfitDef): boolean {
  return outfit.items.every((itemId) => {
    const def = getWearable(itemId);
    if (def.slot === "hair") return config.hair.itemId === itemId;
    if (def.slot === "bottom" && hidesLegs(config)) return true;
    return config[def.slot]?.itemId === itemId;
  });
}
