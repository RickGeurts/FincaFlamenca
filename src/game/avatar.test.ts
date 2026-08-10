// The wardrobe as a rule set: what can be worn together, what is on offer
// when, and what each piece teaches. The drawing is checked by eye; these are
// the rules underneath it, which are not visible until they go wrong.

import { describe, expect, it } from "vitest";
import {
  COLORS,
  OUTFITS,
  STARTER_COLORS,
  STARTER_ITEMS,
  WEARABLES,
  availableColors,
  defaultAvatar,
  getWearable,
  hidesFringe,
  hidesLegs,
  isUnlocked,
  isWearingOutfit,
  visibleSlots,
  wearOutfit,
  wearablesForSlot,
} from "./avatar";
import { WORDS_BY_ID } from "../content";

describe("the catalog", () => {
  it("teaches a real Dutch word with every piece", () => {
    for (const item of WEARABLES) {
      const word = WORDS_BY_ID.get(item.word);
      expect(word, `${item.id} points at unknown word "${item.word}"`).toBeDefined();
      // Clothes are nouns, and de/het is the whole difficulty at A1.
      expect(word?.article, `${item.word} has no article`).toBeTruthy();
    }
  });

  it("gives every piece a sentence for its try-on card", () => {
    for (const item of WEARABLES) {
      const word = WORDS_BY_ID.get(item.word)!;
      expect(word.example_nl, `${item.word} has no example`).toBeTruthy();
      expect(word.example_es, `${item.word} has no Spanish example`).toBeTruthy();
    }
  });

  it("names every colour as a word too", () => {
    for (const colour of COLORS) {
      expect(WORDS_BY_ID.get(colour.word), `colour ${colour.id}`).toBeDefined();
    }
  });

  it("prices the wardrobe as a sink, not a grind", () => {
    for (const item of WEARABLES) {
      expect(item.price, `${item.id}`).toBeGreaterThanOrEqual(0);
      expect(item.price, `${item.id} costs more than a cow`).toBeLessThanOrEqual(200);
    }
  });

  it("gives her something in every slot from the start", () => {
    // She has to be somebody before she has earned anything.
    for (const id of STARTER_ITEMS) expect(() => getWearable(id)).not.toThrow();
    for (const id of STARTER_ITEMS) expect(getWearable(id).price).toBe(0);
    const slots = new Set(STARTER_ITEMS.map((id) => getWearable(id).slot));
    for (const slot of ["hair", "top", "bottom", "shoes"]) {
      expect(slots.has(slot as never), `nothing to wear on ${slot}`).toBe(true);
    }
  });

  it("uses ids nobody has used twice", () => {
    expect(new Set(WEARABLES.map((w) => w.id)).size).toBe(WEARABLES.length);
  });

  it("sorts a slot cheapest first, so free things come first", () => {
    const tops = wearablesForSlot("top");
    expect(tops.length).toBeGreaterThan(0);
    expect(tops[0].price).toBe(0);
  });
});

describe("what she may wear yet", () => {
  it("keeps unit-gated pieces off the rail until the unit opens", () => {
    const trui = getWearable("top_trui");
    expect(isUnlocked(trui, [1, 2, 3, 4, 5])).toBe(false);
    expect(isUnlocked(trui, [1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it("has colours to dress in before unit 6 teaches any", () => {
    const early = availableColors([1]);
    expect(early.length).toBe(STARTER_COLORS.length);
    for (const id of STARTER_COLORS) {
      expect(early.map((c) => c.id)).toContain(id);
    }
  });

  it("opens the rest of the palette as the units land", () => {
    expect(availableColors([1, 2, 3, 4, 5, 6]).length).toBeGreaterThan(
      availableColors([1]).length,
    );
    expect(availableColors([1, 2, 3, 4, 5, 6, 7, 8]).length).toBe(COLORS.length);
  });
});

describe("the layers", () => {
  it("draws the whole figure by default", () => {
    const slots = visibleSlots(defaultAvatar());
    for (const must of ["skin", "hair", "face", "top", "bottom", "shoes"]) {
      expect(slots).toContain(must);
    }
  });

  it("drops the trousers under a dress", () => {
    const dressed = { ...defaultAvatar(), top: { itemId: "top_jurk", colorId: "roze" as const } };
    expect(hidesLegs(dressed)).toBe(true);
    expect(visibleSlots(dressed)).not.toContain("bottom");
  });

  it("does the same for the pollera", () => {
    const feria = { ...defaultAvatar(), top: { itemId: "top_pollera", colorId: "rood" as const } };
    expect(hidesLegs(feria)).toBe(true);
  });

  it("tucks the fringe under a knitted hat", () => {
    const winter = { ...defaultAvatar(), hat: { itemId: "hat_muts", colorId: "rood" as const } };
    expect(hidesFringe(winter)).toBe(true);
    expect(hidesFringe(defaultAvatar())).toBe(false);
  });

  it("lets an accessory and something to carry be worn together", () => {
    const both = {
      ...defaultAvatar(),
      accessory: { itemId: "acc_sjaal", colorId: "rood" as const },
      carry: { itemId: "carry_mand", colorId: "bruin" as const },
    };
    expect(visibleSlots(both)).toContain("accessory");
    expect(visibleSlots(both)).toContain("carry");
  });
});

describe("outfits", () => {
  it("never asks two pieces to share one slot", () => {
    // A set with two hats can never read "En uso", so it would sit there
    // looking broken forever.
    for (const outfit of OUTFITS) {
      const slots = outfit.items.map((id) => getWearable(id).slot);
      expect(new Set(slots).size, `${outfit.id} wants two things in one slot`).toBe(slots.length);
    }
  });

  it("teaches a phrase, not just a pile of clothes", () => {
    for (const outfit of OUTFITS) {
      expect(WORDS_BY_ID.get(outfit.word), `${outfit.id} -> ${outfit.word}`).toBeDefined();
      expect(outfit.es, `${outfit.id}`).toBeTruthy();
    }
  });

  it("dresses her in everything she owns of a set", () => {
    const owned = OUTFITS[1].items;
    const worn = wearOutfit(defaultAvatar(), OUTFITS[1], [...owned]);
    expect(isWearingOutfit(worn, OUTFITS[1])).toBe(true);
  });

  it("skips what she does not own instead of refusing", () => {
    // Half a set is still a look, and the missing piece is in the shop with
    // its price on it.
    const feest = OUTFITS[1];
    const worn = wearOutfit(defaultAvatar(), feest, ["hat_bloem"]);
    expect(worn.hat?.itemId).toBe("hat_bloem");
    expect(isWearingOutfit(worn, feest)).toBe(false);
  });

  it("takes the trousers off when the set is a dress", () => {
    const zondag = OUTFITS.find((o) => o.id === "set_zondag")!;
    const worn = wearOutfit(defaultAvatar(), zondag, [...zondag.items]);
    expect(worn.bottom).toBeUndefined();
    expect(isWearingOutfit(worn, zondag)).toBe(true);
  });

  it("counts the starter set as worn on day one", () => {
    const boerin = OUTFITS.find((o) => o.id === "set_boerin")!;
    expect(isWearingOutfit(defaultAvatar(), boerin)).toBe(true);
    // ...and every piece of it is hers already.
    for (const id of boerin.items) expect(STARTER_ITEMS).toContain(id);
  });

  it("keeps the colour a slot was already wearing", () => {
    const start = defaultAvatar();
    const winter = OUTFITS.find((o) => o.id === "set_winter")!;
    const worn = wearOutfit(start, winter, [...winter.items]);
    expect(worn.top?.colorId).toBe(start.top?.colorId);
  });
});
