// Regression cover for save loading. A save can carry the current version
// number but an older shape (it was written while the schema was changing, so
// the migration that fills the new fields never ran for it). The store must
// still hand the UI a farm it can render.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialFarm, type FarmState } from "../game/farm";
import { ECONOMY, getDecorDef, getSpeciesDef } from "../game/economy";
import { getQuest } from "../content";
import { COLOR_REWARD_MUNTEN, getWearable } from "../game/avatar";
import { SAVE_VERSION, exportSave, parseSave } from "./store";
import { animalKey, decorKey } from "../game/placement";

const { mem } = vi.hoisted(() => ({ mem: new Map<string, string>() }));

vi.mock("idb-keyval", () => ({
  get: async (key: string) => mem.get(key),
  set: async (key: string, value: string) => {
    mem.set(key, value);
  },
  del: async (key: string) => {
    mem.delete(key);
  },
}));

const SAVE_KEY = "finca-flamenca-save";

function writeSave(farm: unknown, version: number) {
  mem.set(
    SAVE_KEY,
    JSON.stringify({
      state: { player: undefined, words: {}, exposures: {}, farm, purchasedCrops: [] },
      version,
    }),
  );
}

/** A minimal state object, enough for the export shape. */
function initialGameShape() {
  return {
    player: { munten: 0 },
    words: {},
    exposures: {},
    farm: initialFarm(),
    purchasedCrops: [],
    purchasedDecor: [],
    purchasedAnimals: [],
  } as never;
}

async function loadStore() {
  vi.resetModules();
  const { useGameStore } = await import("./store");
  await useGameStore.persist.rehydrate();
  return useGameStore;
}

describe("loading a save", () => {
  beforeEach(() => mem.clear());

  it("fills in placements for a save stamped current but written without them", async () => {
    const farm = { ...initialFarm() } as Partial<FarmState>;
    delete farm.placements;
    writeSave(farm, 5);

    const store = await loadStore();
    const loaded = store.getState().farm;

    expect(loaded.placements).toBeDefined();
    for (const item of loaded.decor) {
      expect(loaded.placements[decorKey(item.id)]).toBeDefined();
    }
    expect(loaded.placements[animalKey(loaded.animals[0].id)]).toBeDefined();
  });

  it("keeps the tiles and animals of that save", async () => {
    const base = initialFarm();
    const farm = {
      ...base,
      tiles: base.tiles.map((t, i) => (i === 0 ? { ...t, kind: "field" as const } : t)),
      animals: [{ ...base.animals[0], name: "Manchas" }],
    } as Partial<FarmState>;
    delete farm.placements;
    writeSave(farm, 4);

    const loaded = (await loadStore()).getState().farm;

    expect(loaded.tiles[0].kind).toBe("field");
    expect(loaded.animals[0].name).toBe("Manchas");
  });

  it("migrates a v3 save and places its decor", async () => {
    const farm = { ...initialFarm() } as Partial<FarmState>;
    delete farm.placements;
    writeSave(farm, 3);

    const loaded = (await loadStore()).getState().farm;
    expect(loaded.decor.length).toBeGreaterThan(0);
    expect(loaded.placements[decorKey(loaded.decor[0].id)]).toBeDefined();
  });

  it("carries a pre-shop save's arranged decor onto owned instances", async () => {
    const base = initialFarm();
    const legacy = { ...base } as Partial<FarmState>;
    delete legacy.decor;
    legacy.placements = {
      "decor:house": { col: 2, row: 3, rot: 2 },
      "decor:well": { col: 0, row: 7, rot: 0 },
    };
    writeSave(legacy, 4);

    const loaded = (await loadStore()).getState().farm;
    const house = loaded.decor.find((d) => d.kind === "huis");
    expect(house).toBeDefined();
    expect(loaded.placements[decorKey(house!.id)]).toMatchObject({ col: 2, row: 3, rot: 2 });
  });

  it("starts a fresh farm when the save is unusable", async () => {
    writeSave({ nonsense: true }, 5);

    const loaded = (await loadStore()).getState().farm;
    expect(loaded.tiles).toHaveLength(initialFarm().tiles.length);
    expect(loaded.decor.length).toBeGreaterThan(0);
  });

  it("defaults the first-purchase lists when the save predates them", async () => {
    const saved = { ...initialFarm() };
    writeSave(saved, 5);
    const store = await loadStore();
    expect(store.getState().purchasedDecor).toEqual([]);
    expect(store.getState().purchasedCrops).toEqual([]);
  });

  it("marks the store hydrated so the app leaves the loading screen", async () => {
    writeSave({ ...initialFarm() }, 5);
    expect((await loadStore()).getState().hydrated).toBe(true);
  });
});

describe("buying decorations", () => {
  beforeEach(() => mem.clear());

  it("charges the price and adds the object", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 500 } });
    const before = store.getState().farm.decor.length;

    const id = store.getState().buyDecor("boom");

    expect(id).not.toBeNull();
    expect(store.getState().player.munten).toBe(500 - getDecorDef("boom").price);
    expect(store.getState().farm.decor).toHaveLength(before + 1);
  });

  it("refuses when she cannot afford it, and charges nothing", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 5 } });
    const before = store.getState().farm.decor.length;

    expect(store.getState().buyDecor("molen")).toBeNull();
    expect(store.getState().player.munten).toBe(5);
    expect(store.getState().farm.decor).toHaveLength(before);
  });

  it("rejects an unknown decoration rather than charging for nothing", async () => {
    const store = await loadStore();
    expect(() => store.getState().buyDecor("nonsense")).toThrow();
  });
});

describe("backing up and restoring", () => {
  beforeEach(() => mem.clear());

  it("round-trips a farm through a file and back", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 777, xp: 120 } });
    // t1 is under the farmhouse; t3 is open ground.
    store.getState().tillTile("t3");
    store.getState().renameAnimal(store.getState().farm.animals[0].id, "Manchas");

    const file = JSON.stringify(exportSave(store.getState()));

    // Wipe it the way a browser clearing storage would.
    const fresh = await loadStore();
    expect(fresh.getState().player.munten).not.toBe(777);

    const restored = parseSave(file);
    expect(restored).not.toBeNull();
    fresh.getState().restoreSave(restored!);

    expect(fresh.getState().player.munten).toBe(777);
    expect(fresh.getState().player.xp).toBe(120);
    expect(fresh.getState().farm.tiles.find((t) => t.id === "t3")?.kind).toBe("field");
    expect(fresh.getState().farm.animals[0].name).toBe("Manchas");
  });

  it("keeps the word progress, which is the part she cannot re-earn", async () => {
    const store = await loadStore();
    store.getState().answerChoreQuestion("koe", true, 1000);
    const before = store.getState().words.koe;

    const restored = parseSave(JSON.stringify(exportSave(store.getState())));
    expect(restored!.words.koe).toEqual(before);
  });

  it("stamps the file so a backup can be identified", () => {
    const file = exportSave(initialGameShape(), 1_700_000_000_000);
    expect(file.app).toBe("finca-flamenca");
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.savedAt.startsWith("2023-11-14")).toBe(true);
  });

  it("refuses a file that isn't one of ours", () => {
    expect(parseSave("not json at all")).toBeNull();
    expect(parseSave(JSON.stringify({ hello: "world" }))).toBeNull();
    expect(parseSave(JSON.stringify({ app: "some-other-game", state: {} }))).toBeNull();
  });

  it("refuses one of ours that has no farm in it", () => {
    expect(
      parseSave(JSON.stringify({ app: "finca-flamenca", version: 5, state: { player: {} } })),
    ).toBeNull();
  });

  it("normalises an old farm on the way in", async () => {
    const store = await loadStore();
    const file = exportSave(store.getState());
    // A backup taken before pens came in sizes.
    const legacy = JSON.parse(JSON.stringify(file));
    legacy.state.farm.decor.push({ id: "d99", kind: "wei" });
    delete legacy.state.purchasedAnimals;

    const restored = parseSave(JSON.stringify(legacy));
    expect(restored!.farm.decor.find((d) => d.id === "d99")?.kind).toBe("wei2");
    expect(restored!.purchasedAnimals).toEqual([]);
  });
});

describe("buying animals from the fokker", () => {
  beforeEach(() => mem.clear());

  it("charges the price and adds the animal with her name on it", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 1000 } });
    const before = store.getState().farm.animals.length;

    const id = store.getState().buyAnimal("koe", "Manchas");

    expect(id).not.toBeNull();
    expect(store.getState().player.munten).toBe(1000 - getSpeciesDef("koe").cost);
    const animals = store.getState().farm.animals;
    expect(animals).toHaveLength(before + 1);
    expect(animals[animals.length - 1].name).toBe("Manchas");
  });

  it("places the new animal on the grid so it is visible", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 1000 } });
    const id = store.getState().buyAnimal("varken");
    expect(store.getState().farm.placements[animalKey(id!)]).toBeDefined();
  });

  it("refuses when she cannot afford it, and charges nothing", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 50 } });
    const before = store.getState().farm.animals.length;

    expect(store.getState().buyAnimal("koe")).toBeNull();
    expect(store.getState().player.munten).toBe(50);
    expect(store.getState().farm.animals).toHaveLength(before);
  });

  it("remembers which species already had their first-purchase lesson", async () => {
    const store = await loadStore();
    expect(store.getState().purchasedAnimals).toEqual([]);
    store.getState().markAnimalPurchased("varken");
    store.getState().markAnimalPurchased("varken");
    expect(store.getState().purchasedAnimals).toEqual(["varken"]);
  });

  it("rejects an unknown species rather than charging for nothing", async () => {
    const store = await loadStore();
    expect(() => store.getState().buyAnimal("eenhoorn")).toThrow();
  });
});

describe("finishing a quest", () => {
  beforeEach(() => mem.clear());

  it("pays the reward and records it as done", async () => {
    const store = await loadStore();
    const before = store.getState().player.munten;

    const outcome = store.getState().completeQuest("buurvrouw-welkom");

    expect(outcome.munten).toBe(getQuest("buurvrouw-welkom")!.reward.munten);
    expect(store.getState().player.munten).toBe(before + outcome.munten);
    expect(store.getState().player.completedQuests).toContain("buurvrouw-welkom");
  });

  it("grows the meadow when the town hall sells her land", async () => {
    const store = await loadStore();
    const before = store.getState().farm.tiles.length;

    const outcome = store.getState().completeQuest("gemeente-land-1");

    expect(outcome.landLevel).toBe(2);
    expect(store.getState().player.landLevel).toBe(2);
    expect(store.getState().farm.tiles.length).toBeGreaterThan(before);
  });

  it("hands over the promised pasture", async () => {
    const store = await loadStore();
    const before = store.getState().farm.decor.filter((d) => d.kind === "wei2").length;

    const outcome = store.getState().completeQuest("veehandelaar-koe");

    expect(outcome.gift).toBe("wei2");
    expect(store.getState().farm.decor.filter((d) => d.kind === "wei2")).toHaveLength(before + 1);
  });

  it("pays a small thank-you on a replay, and unlocks nothing twice", async () => {
    const store = await loadStore();
    store.getState().completeQuest("veehandelaar-koe");
    const pens = store.getState().farm.decor.filter((d) => d.kind === "wei2").length;
    const munten = store.getState().player.munten;

    const again = store.getState().completeQuest("veehandelaar-koe");

    expect(again.munten).toBe(ECONOMY.QUEST_REPLAY_MUNTEN);
    expect(again.gift).toBeUndefined();
    expect(store.getState().farm.decor.filter((d) => d.kind === "wei2")).toHaveLength(pens);
    expect(store.getState().player.munten).toBe(munten + ECONOMY.QUEST_REPLAY_MUNTEN);
    // Recorded once, however often she goes back for the conversation.
    const done = store.getState().player.completedQuests;
    expect(done.filter((id) => id === "veehandelaar-koe")).toHaveLength(1);
  });

  it("keeps her crops where they were when the land grows", async () => {
    const store = await loadStore();
    const plantable = store.getState().farm.tiles.find((t) => t.kind === "grass")!;
    store.getState().tillTile(plantable.id);
    const tilled = store.getState().farm.tiles.filter((t) => t.kind === "field").length;

    store.getState().completeQuest("gemeente-land-1");

    expect(store.getState().farm.tiles.filter((t) => t.kind === "field")).toHaveLength(tilled);
  });

  it("ignores a quest that does not exist rather than paying for it", async () => {
    const store = await loadStore();
    const before = store.getState().player.munten;
    expect(store.getState().completeQuest("no-such-quest").munten).toBe(0);
    expect(store.getState().player.munten).toBe(before);
  });
});

describe("the wardrobe", () => {
  beforeEach(() => mem.clear());

  it("dresses her in the starter outfit from the first minute", async () => {
    const store = await loadStore();
    const player = store.getState().player;
    expect(player.ownedItems).toContain("hat_vueltiao");
    expect(player.avatar.top?.itemId).toBeTruthy();
  });

  it("charges for a garment and puts the word into her review queue", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 200 } });

    expect(store.getState().buyWearable("top_trui")).toBe(true);

    expect(store.getState().player.munten).toBe(200 - getWearable("top_trui").price);
    expect(store.getState().player.ownedItems).toContain("top_trui");
    // Owning it counts as meeting it: it is now a word she will be asked.
    expect(store.getState().words[getWearable("top_trui").word]).toBeDefined();
  });

  it("refuses what she cannot afford, and charges nothing", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 5 } });

    expect(store.getState().buyWearable("hat_kroon")).toBe(false);
    expect(store.getState().player.munten).toBe(5);
    expect(store.getState().player.ownedItems).not.toContain("hat_kroon");
  });

  it("never charges twice for the same garment", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 300 } });
    store.getState().buyWearable("top_jas");
    const after = store.getState().player.munten;

    expect(store.getState().buyWearable("top_jas")).toBe(true);
    expect(store.getState().player.munten).toBe(after);
  });

  it("pays the little reward the first time a colour is used, and only then", async () => {
    const store = await loadStore();
    const before = store.getState().player.munten;

    expect(store.getState().useColor("rood")).toBe(COLOR_REWARD_MUNTEN);
    expect(store.getState().player.munten).toBe(before + COLOR_REWARD_MUNTEN);
    expect(store.getState().useColor("rood")).toBe(0);
    expect(store.getState().player.munten).toBe(before + COLOR_REWARD_MUNTEN);
  });

  it("teaches the colour word along with the coin", async () => {
    const store = await loadStore();
    store.getState().useColor("groen");
    expect(store.getState().words.groen).toBeDefined();
  });

  it("costs nothing to change what she is wearing", async () => {
    const store = await loadStore();
    const before = store.getState().player.munten;
    const avatar = store.getState().player.avatar;

    store.getState().wearAvatar({ ...avatar, hat: undefined });

    expect(store.getState().player.munten).toBe(before);
    expect(store.getState().player.avatar.hat).toBeUndefined();
  });

  it("dresses a save that predates the wardrobe", async () => {
    // A player saved before any of this existed has an avatar of the old
    // shape and owns nothing. She must still open the game wearing clothes.
    const old = {
      state: {
        player: {
          munten: 10,
          xp: 0,
          streak: { days: 0, lastActive: "" },
          avatar: { outfit: "overol" },
          unlockedUnits: [1],
          completedQuests: [],
          landLevel: 1,
        },
        farm: initialFarm(),
      },
      version: SAVE_VERSION,
    };
    // Saving is debounced, so a write from an earlier test can still be in
    // flight and land on top of this one. Let it land, then lay the old save.
    await new Promise((resolve) => setTimeout(resolve, 400));
    mem.clear();
    mem.set(SAVE_KEY, JSON.stringify(old));

    const store = await loadStore();
    const player = store.getState().player;
    expect(typeof player.avatar.skin).toBe("number");
    expect(player.ownedItems.length).toBeGreaterThan(0);
    expect(player.usedColors).toEqual([]);
    // ...without losing what she had.
    expect(player.munten).toBe(10);
  });
});

describe("the welcome", () => {
  beforeEach(() => mem.clear());

  it("is waiting for somebody who has never played", async () => {
    const store = await loadStore();
    expect(store.getState().onboarded).toBe(false);
  });

  it("is over for good once she has been through it", async () => {
    const store = await loadStore();
    store.getState().finishOnboarding();
    expect(store.getState().onboarded).toBe(true);
  });
});

describe("starting over (dev tools)", () => {
  beforeEach(() => mem.clear());

  it("shows the welcome again without touching the farm", async () => {
    const store = await loadStore();
    store.getState().finishOnboarding();
    store.getState().tillTile("t3");

    store.getState().devReplayOnboarding();

    expect(store.getState().onboarded).toBe(false);
    // ...and everything she built is still there.
    expect(store.getState().farm.tiles.find((t) => t.id === "t3")?.kind).toBe("field");
  });

  it("wipes the save so the next load is a first load", async () => {
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 999 } });
    store.getState().finishOnboarding();
    // Let the debounced autosave write it, so there is really something there.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mem.get(SAVE_KEY)).toBeDefined();

    await store.getState().devReset();

    expect(mem.get(SAVE_KEY), "the save survived the reset").toBeUndefined();
    const fresh = await loadStore();
    expect(fresh.getState().onboarded).toBe(false);
    expect(fresh.getState().player.munten).not.toBe(999);
  });

  it("does not let a pending save resurrect the farm", async () => {
    // The autosave is debounced. A wipe that fires just after a change has to
    // outlive that timer, or the farm quietly comes back.
    const store = await loadStore();
    store.setState({ player: { ...store.getState().player, munten: 4242 } });

    await store.getState().devReset();

    expect(mem.get(SAVE_KEY)).toBeUndefined();
  });
});
