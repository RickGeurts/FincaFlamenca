// Regression cover for save loading. A save can carry the current version
// number but an older shape (it was written while the schema was changing, so
// the migration that fills the new fields never ran for it). The store must
// still hand the UI a farm it can render.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialFarm, type FarmState } from "../game/farm";
import { getDecorDef, getSpeciesDef } from "../game/economy";
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
