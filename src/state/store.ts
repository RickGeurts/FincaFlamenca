// Game state: Zustand store persisted to IndexedDB via idb-keyval.
// Writes are debounced; state hydrates asynchronously on startup.
// All game rules live in pure modules (src/game, src/learning) — actions here
// only wire them to state.

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { del, get, set } from "idb-keyval";
import type { Player } from "../game/types";
import { DEFAULT_AVATAR } from "../game/types";
import {
  DEV_FAST_GROW_MS,
  ECONOMY,
  getCropDef,
  getDecorDef,
  getSpeciesDef,
  sessionReward,
  unlockedUnitsForXp,
  type SessionKind,
  type SessionReward,
} from "../game/economy";
import { EMPTY_STREAK, touchStreak } from "../game/streak";
import * as crops from "../game/crops";
import * as animals from "../game/animals";
import {
  addAnimal,
  addDecor,
  initialFarm,
  migrateDecorToItems,
  migratePlotsToTiles,
  migrateDecorKinds,
  moveObject,
  removeObject,
  rotateObject,
  setObjectRotation,
  tillTile,
  untillTile,
  withPlacements,
  type FarmState,
  type Tile,
} from "../game/farm";
import type { Quarter } from "../game/placement";
import { initProgress, review, type WordProgress } from "../learning/srs";
import { dateString } from "../utils/time";

export interface AnswerRecord {
  wordIds: string[];
  correct: boolean;
}

export interface SessionSummary extends SessionReward {
  correct: number;
  total: number;
  kind: SessionKind;
}

interface GameState {
  player: Player;
  words: Record<string, WordProgress>;
  exposures: Record<string, number>; // tap-to-learn exposure counts
  farm: FarmState;
  purchasedCrops: string[]; // crop ids whose first-purchase micro-lesson is done
  purchasedDecor: string[]; // decor kinds whose first-purchase micro-lesson is done
  purchasedAnimals: string[]; // species whose first-purchase micro-lesson is done
  hydrated: boolean;
  /** Dev only, not persisted: crops grow in 10 seconds. */
  devFast: boolean;

  finishSession(opts: {
    kind: SessionKind;
    unitWords?: string[];
    answers: AnswerRecord[];
    now?: number;
  }): SessionSummary;

  // Farm actions. Money-earning actions return munten earned (0 = no-op).
  tillTile(tileId: string): void;
  untillTile(tileId: string): void;
  plantCrop(tileId: string, cropId: string, now?: number): boolean;
  waterCrop(tileId: string): void;
  harvestCrop(tileId: string, now?: number): number;
  reviveWiltedCrops(now?: number): void;
  feedAnimal(animalId: string, now?: number): void;
  collectProduce(animalId: string, now?: number): number;
  renameAnimal(animalId: string, name: string): void;

  // Farm layout (see game/placement)
  moveObject(objectId: string, col: number, row: number): void;
  rotateObject(objectId: string): void;
  setObjectRotation(objectId: string, rot: Quarter): void;
  /** Buy a decoration. Returns the new object's id, or null if it fell through. */
  buyDecor(kind: string): string | null;
  /** Buy an animal from the fokker. Returns its id, or null if it fell through. */
  buyAnimal(speciesId: string, name?: string): string | null;
  markAnimalPurchased(speciesId: string): void;
  /** Remove an object, refunding half its price. Returns munten given back. */
  removeObject(objectId: string): number;

  // Embedded learning
  logExposure(wordId: string, now?: number): void;
  answerChoreQuestion(wordId: string, correct: boolean, now?: number): number;
  markCropPurchased(cropId: string): void;
  markDecorPurchased(kind: string): void;

  // Backup
  restoreSave(state: SaveFile["state"]): void;

  // Dev helpers
  setDevFast(on: boolean): void;
  devAddMunten(amount: number): void;
}

/** What a backup file holds. Versioned so a future format can be detected. */
export interface SaveFile {
  app: "finca-flamenca";
  version: number;
  savedAt: string;
  state: {
    player: Player;
    words: Record<string, WordProgress>;
    exposures: Record<string, number>;
    farm: FarmState;
    purchasedCrops: string[];
    purchasedDecor: string[];
    purchasedAnimals: string[];
  };
}

export const SAVE_VERSION = 5;

/**
 * Everything worth keeping, as a plain object. IndexedDB is wiped whenever the
 * browser decides to reclaim storage, so a farm with no export is a farm that
 * can vanish.
 */
export function exportSave(state: GameState, now = Date.now()): SaveFile {
  return {
    app: "finca-flamenca",
    version: SAVE_VERSION,
    savedAt: new Date(now).toISOString(),
    state: {
      player: state.player,
      words: state.words,
      exposures: state.exposures,
      farm: state.farm,
      purchasedCrops: state.purchasedCrops,
      purchasedDecor: state.purchasedDecor,
      purchasedAnimals: state.purchasedAnimals,
    },
  };
}

/**
 * Read a backup back in. Returns null rather than throwing, so a wrong file
 * picked by mistake is a polite message and not a broken game.
 */
export function parseSave(text: string): SaveFile["state"] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const file = parsed as Partial<SaveFile> | null;
  if (!file || file.app !== "finca-flamenca" || !file.state) return null;
  const saved = file.state;
  if (!saved.player || !saved.farm || !Array.isArray(saved.farm.tiles)) return null;
  return {
    player: saved.player,
    words: saved.words ?? {},
    exposures: saved.exposures ?? {},
    farm: normalizeFarm(saved.farm),
    purchasedCrops: saved.purchasedCrops ?? [],
    purchasedDecor: saved.purchasedDecor ?? [],
    purchasedAnimals: saved.purchasedAnimals ?? [],
  };
}

const DEBOUNCE_MS = 300;
let pending: ReturnType<typeof setTimeout> | undefined;

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      void set(name, value);
    }, DEBOUNCE_MS);
  },
  removeItem: (name) => del(name),
};

export const initialPlayer = (): Player => ({
  munten: ECONOMY.START_MUNTEN,
  xp: 0,
  streak: EMPTY_STREAK,
  avatar: DEFAULT_AVATAR,
  unlockedUnits: [1],
  completedQuests: [],
  landLevel: 1,
});

/**
 * A save can carry the current version number but an older shape — e.g. one
 * written while the schema was mid-change, which skips the migration that
 * would have filled the new fields in. Normalising the farm on every load is
 * cheap and idempotent, and it keeps a missing field from blanking the app.
 */
function normalizeFarm(saved: unknown): FarmState {
  const farm = saved as FarmState | undefined;
  if (!farm || !Array.isArray(farm.tiles) || !Array.isArray(farm.animals)) return initialFarm();
  return withPlacements(migrateDecorKinds(migrateDecorToItems(farm)));
}

function updateTile(farm: FarmState, tileId: string, fn: (tile: Tile) => Tile): FarmState {
  return { ...farm, tiles: farm.tiles.map((t) => (t.id === tileId ? fn(t) : t)) };
}

export const useGameStore = create<GameState>()(
  persist(
    (setState, getState) => ({
      player: initialPlayer(),
      words: {},
      exposures: {},
      farm: initialFarm(),
      purchasedCrops: [],
      purchasedDecor: [],
      purchasedAnimals: [],
      hydrated: false,
      devFast: import.meta.env.DEV,

      finishSession({ kind, unitWords = [], answers, now = Date.now() }) {
        const state = getState();

        const words = { ...state.words };
        for (const id of unitWords) {
          if (!words[id]) words[id] = initProgress(id, now);
        }
        for (const answer of answers) {
          for (const id of answer.wordIds) {
            const progress = words[id] ?? initProgress(id, now);
            words[id] = review(progress, answer.correct, now);
          }
        }

        const streak = touchStreak(state.player.streak, dateString(now));
        const correct = answers.filter((a) => a.correct).length;
        const total = answers.length;
        const reward = sessionReward({ kind, correct, total, streakDays: streak.days });

        const xp = state.player.xp + reward.xp;
        const player: Player = {
          ...state.player,
          munten: state.player.munten + reward.munten,
          xp,
          streak,
          unlockedUnits: unlockedUnitsForXp(xp),
        };

        setState({ player, words });
        return { ...reward, correct, total, kind };
      },

      tillTile(tileId) {
        const state = getState();
        setState({ farm: tillTile(state.farm, tileId) });
      },

      untillTile(tileId) {
        const state = getState();
        setState({ farm: untillTile(state.farm, tileId) });
      },

      plantCrop(tileId, cropId, now = Date.now()) {
        const state = getState();
        const def = getCropDef(cropId);
        const tile = state.farm.tiles.find((t) => t.id === tileId);
        if (!tile || tile.kind !== "field" || tile.crop || state.player.munten < def.seedCost) {
          return false;
        }
        const growMsOverride = state.devFast ? DEV_FAST_GROW_MS : undefined;
        setState({
          player: { ...state.player, munten: state.player.munten - def.seedCost },
          farm: updateTile(state.farm, tileId, (t) => ({
            ...t,
            crop: crops.plant(cropId, now, growMsOverride),
          })),
        });
        return true;
      },

      waterCrop(tileId) {
        const state = getState();
        setState({
          farm: updateTile(state.farm, tileId, (t) =>
            t.crop ? { ...t, crop: crops.water(t.crop, getCropDef(t.crop.cropId)) } : t,
          ),
        });
      },

      harvestCrop(tileId, now = Date.now()) {
        const state = getState();
        const tile = state.farm.tiles.find((t) => t.id === tileId);
        if (!tile?.crop) return 0;
        const def = getCropDef(tile.crop.cropId);
        if (crops.cropState(tile.crop, def, now) !== "ready") return 0;
        setState({
          player: { ...state.player, munten: state.player.munten + def.sellPrice },
          // The field stays tilled — ready to replant.
          farm: updateTile(state.farm, tileId, (t) => ({ id: t.id, kind: t.kind })),
        });
        return def.sellPrice;
      },

      reviveWiltedCrops(now = Date.now()) {
        const state = getState();
        setState({
          farm: {
            ...state.farm,
            tiles: state.farm.tiles.map((t) => {
              if (!t.crop) return t;
              const def = getCropDef(t.crop.cropId);
              if (crops.cropState(t.crop, def, now) !== "wilted") return t;
              return { ...t, crop: crops.revive(t.crop, def, now) };
            }),
          },
        });
      },

      feedAnimal(animalId, now = Date.now()) {
        const state = getState();
        setState({
          farm: {
            ...state.farm,
            animals: state.farm.animals.map((a) =>
              a.id === animalId ? animals.feed(a, getSpeciesDef(a.speciesId), now) : a,
            ),
          },
        });
      },

      collectProduce(animalId, now = Date.now()) {
        const state = getState();
        const animal = state.farm.animals.find((a) => a.id === animalId);
        if (!animal) return 0;
        const def = getSpeciesDef(animal.speciesId);
        if (!animals.hasProduce(animal, def, now)) return 0;
        setState({
          player: { ...state.player, munten: state.player.munten + def.produceSellPrice },
          farm: {
            ...state.farm,
            animals: state.farm.animals.map((a) =>
              a.id === animalId ? animals.collect(a, def, now) : a,
            ),
          },
        });
        return def.produceSellPrice;
      },

      renameAnimal(animalId, name) {
        const state = getState();
        setState({
          farm: {
            ...state.farm,
            animals: state.farm.animals.map((a) =>
              a.id === animalId ? { ...a, name: name.trim() || undefined } : a,
            ),
          },
        });
      },

      moveObject(objectId, col, row) {
        const state = getState();
        setState({ farm: moveObject(state.farm, objectId, col, row) });
      },

      rotateObject(objectId) {
        const state = getState();
        setState({ farm: rotateObject(state.farm, objectId) });
      },

      setObjectRotation(objectId, rot) {
        const state = getState();
        setState({ farm: setObjectRotation(state.farm, objectId, rot) });
      },

      buyDecor(kind) {
        const state = getState();
        const def = getDecorDef(kind);
        if (state.player.munten < def.price) return null;
        const farm = addDecor(state.farm, kind);
        if (farm === state.farm) return null; // island full — nothing charged
        setState({
          player: { ...state.player, munten: state.player.munten - def.price },
          farm,
        });
        return farm.decor[farm.decor.length - 1].id;
      },

      buyAnimal(speciesId, name) {
        const state = getState();
        const def = getSpeciesDef(speciesId);
        if (state.player.munten < def.cost) return null;
        const farm = addAnimal(state.farm, speciesId, name);
        if (farm === state.farm) return null; // island full — nothing charged
        setState({
          player: { ...state.player, munten: state.player.munten - def.cost },
          farm,
        });
        return farm.animals[farm.animals.length - 1].id;
      },

      removeObject(objectId) {
        const state = getState();
        const farm = removeObject(state.farm, objectId);
        if (farm === state.farm) return 0;
        // Half back, so tidying up costs something but never feels punishing.
        const price = objectId.startsWith("animal:")
          ? (state.farm.animals.find((a) => `animal:${a.id}` === objectId)?.speciesId ?? "")
          : (state.farm.decor.find((d) => `decor:${d.id}` === objectId)?.kind ?? "");
        let refund = 0;
        if (objectId.startsWith("animal:") && price) {
          refund = Math.floor(getSpeciesDef(price).cost / 2);
        } else if (price) {
          refund = Math.floor(getDecorDef(price).price / 2);
        }
        setState({
          farm,
          player: { ...state.player, munten: state.player.munten + refund },
        });
        return refund;
      },

      markAnimalPurchased(speciesId) {
        const state = getState();
        if (state.purchasedAnimals.includes(speciesId)) return;
        setState({ purchasedAnimals: [...state.purchasedAnimals, speciesId] });
      },

      logExposure(wordId, now = Date.now()) {
        const state = getState();
        const words = state.words[wordId]
          ? state.words
          : { ...state.words, [wordId]: initProgress(wordId, now) };
        setState({
          words,
          exposures: {
            ...state.exposures,
            [wordId]: (state.exposures[wordId] ?? 0) + 1,
          },
        });
      },

      answerChoreQuestion(wordId, correct, now = Date.now()) {
        const state = getState();
        const progress = state.words[wordId] ?? initProgress(wordId, now);
        const earned = correct ? ECONOMY.CHORE_QUESTION_MUNTEN : 0;
        setState({
          words: { ...state.words, [wordId]: review(progress, correct, now) },
          player: { ...state.player, munten: state.player.munten + earned },
        });
        return earned;
      },

      markCropPurchased(cropId) {
        const state = getState();
        if (state.purchasedCrops.includes(cropId)) return;
        setState({ purchasedCrops: [...state.purchasedCrops, cropId] });
      },

      markDecorPurchased(kind) {
        const state = getState();
        if (state.purchasedDecor.includes(kind)) return;
        setState({ purchasedDecor: [...state.purchasedDecor, kind] });
      },

      restoreSave(saved) {
        setState({ ...saved, hydrated: true });
      },

      setDevFast(on) {
        setState({ devFast: on });
      },

      devAddMunten(amount) {
        const state = getState();
        setState({ player: { ...state.player, munten: state.player.munten + amount } });
      },
    }),
    {
      name: "finca-flamenca-save",
      version: 5,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        player: s.player,
        words: s.words,
        exposures: s.exposures,
        farm: s.farm,
        purchasedCrops: s.purchasedCrops,
        purchasedDecor: s.purchasedDecor,
        purchasedAnimals: s.purchasedAnimals,
      }),
      migrate: (persisted, version) => {
        let state = persisted as Record<string, unknown>;
        if (version < 2) {
          state = { ...state, exposures: {}, farm: initialFarm(), purchasedCrops: [] };
        }
        if (version < 3) {
          // v2 farm had fixed `plots`; move them onto the tile grid.
          const oldFarm = state.farm as
            | { plots?: { id: string; crop?: crops.PlantedCrop }[]; animals?: animals.Animal[] }
            | undefined;
          state = {
            ...state,
            farm: migratePlotsToTiles(oldFarm?.plots ?? [], oldFarm?.animals ?? []),
          };
        }
        if (version < 4) {
          // v3 had no placements: seed the default layout, keeping tiles/animals.
          const farm = state.farm as FarmState | undefined;
          state = { ...state, farm: withPlacements(farm ?? initialFarm()) };
        }
        return state;
      },
      // Runs after migrate on every load, so a save that dodged a migration
      // still arrives with a farm the app can render.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...saved,
          farm: normalizeFarm(saved.farm),
          purchasedCrops: saved.purchasedCrops ?? [],
          purchasedDecor: saved.purchasedDecor ?? [],
          purchasedAnimals: saved.purchasedAnimals ?? [],
        };
      },
      // Always mark hydrated — a failed load should start a fresh game,
      // never leave her stuck on the loading screen.
      onRehydrateStorage: () => () => {
        useGameStore.setState({ hydrated: true });
      },
    },
  ),
);
