// Game state: Zustand store persisted to IndexedDB via idb-keyval.
// Writes are debounced; state hydrates asynchronously on startup.
// All game rules live in pure modules (src/game, src/learning) — actions here
// only wire them to state.

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { del, get, set } from "idb-keyval";
import type { AvatarConfig, Player } from "../game/types";
import { DEFAULT_AVATAR, DEFAULT_OWNED_ITEMS } from "../game/types";
import { COLOR_BY_ID, COLOR_REWARD_MUNTEN, getWearable, type ColorId } from "../game/avatar";
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
  expandFarm,
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
import { initProgress, MAX_BOX, review, type WordProgress } from "../learning/srs";
import { SESSION_MAX } from "../learning/lesson";
import { getQuest, VOCAB } from "../content";
import { parseUnlock, payoutFor } from "../quests/quests";
import { dateString } from "../utils/time";
import { PLAYER_NAME } from "../content/player";
import { setPreferredVoice } from "../utils/speak";
import { setMuted } from "../utils/sfx";

export interface AnswerRecord {
  wordIds: string[];
  correct: boolean;
}

/** A word that changed Leitner box during a session, for the end screen. */
export interface BoxChange {
  wordId: string;
  from: number;
  to: number;
}

export interface SessionSummary extends SessionReward {
  correct: number;
  total: number;
  kind: SessionKind;
  /**
   * Which words moved up or down a box. Collected where the boxes are actually
   * written; diffing state afterwards would miss a word that ended where it
   * started after moving both ways.
   */
  boxChanges: BoxChange[];
  /** A classroom that opened with this session's XP, if one did. */
  unlockedUnit?: number;
}

/** What a finished quest handed over, so the screen can celebrate it. */
export interface QuestOutcome {
  munten: number;
  /** Set when the meadow just grew. */
  landLevel?: number;
  /** Decor kind she was given, if any and if there was room for it. */
  gift?: string;
}

/** Where in the village she is. Travelling replaces the old two tabs. */
export type Place = "finca" | "escuela" | "mercado" | "criadero" | "alcaldia";

/** Which farm tool the dock has selected. Dragging works regardless. */
export type FarmTool = "none" | "till" | "seed" | "arrange";

interface GameState {
  /** Persisted, so reopening the game lands her where she left off. */
  place: Place;
  /** Not persisted: a tool is a moment's intent, not a setting. */
  farmTool: FarmTool;
  /** Which shelf of the market is open. Not persisted either. */
  marketCategory: string;
  setPlace(place: Place): void;
  setFarmTool(tool: FarmTool): void;
  setMarketCategory(category: string): void;

  player: Player;
  words: Record<string, WordProgress>;
  exposures: Record<string, number>; // tap-to-learn exposure counts
  farm: FarmState;
  purchasedCrops: string[]; // crop ids whose first-purchase micro-lesson is done
  purchasedDecor: string[]; // decor kinds whose first-purchase micro-lesson is done
  purchasedAnimals: string[]; // species whose first-purchase micro-lesson is done
  /** She has seen the welcome. Persisted: it is shown exactly once. */
  onboarded: boolean;
  finishOnboarding(): void;
  /** She has been wished a happy birthday. Persisted: it happens once, ever. */
  birthdayGreeted: boolean;
  finishBirthday(): void;
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

  // Wardrobe. Wearing is free and instant; only buying costs.
  wearAvatar(avatar: AvatarConfig): void;
  /** Buy a garment. Returns false only when she cannot afford it. */
  buyWearable(itemId: string): boolean;
  /** Dress in a colour. Pays the small first-time reward, or 0 after that. */
  useColor(colorId: ColorId): number;

  /**
   * Finish a conversation and collect what it is worth. Safe to call again on
   * a replay: it pays the small thank-you and unlocks nothing twice.
   */
  completeQuest(questId: string): QuestOutcome;

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
  /** Show the welcome again on the next render, keeping everything else. */
  devReplayOnboarding(): void;
  /** Put a full review queue on the doormat, at mixed levels. */
  devFillReview(now?: number): void;
  /** Wipe the save and every preference, so the next load is a first load. */
  devReset(): Promise<void>;
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

export const SAVE_VERSION = 7;

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
    player: normalizePlayer(saved.player),
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
  name: PLAYER_NAME,
  munten: ECONOMY.START_MUNTEN,
  xp: 0,
  streak: EMPTY_STREAK,
  avatar: DEFAULT_AVATAR,
  ownedItems: [...DEFAULT_OWNED_ITEMS],
  usedColors: [],
  unlockedUnits: [1],
  completedQuests: [],
  landLevel: 1,
});

/**
 * A player saved before the wardrobe existed has no avatar worth the name and
 * owns nothing. Filling that in on load means an old save opens dressed
 * instead of as a naked default object.
 */
export function normalizePlayer(saved: Player | undefined): Player {
  const base = initialPlayer();
  if (!saved) return base;
  const wardrobeReady =
    saved.avatar !== undefined && typeof (saved.avatar as { skin?: number }).skin === "number";
  return {
    ...base,
    ...saved,
    avatar: wardrobeReady ? saved.avatar : base.avatar,
    // An empty or missing name falls back to hers rather than greeting nobody.
    name: saved.name || base.name,
    ownedItems: saved.ownedItems ?? base.ownedItems,
    usedColors: saved.usedColors ?? [],
  };
}

/**
 * A save can carry the current version number but an older shape — e.g. one
 * written while the schema was mid-change, which skips the migration that
 * would have filled the new fields in. Normalising the farm on every load is
 * cheap and idempotent, and it keeps a missing field from blanking the app.
 */
function normalizeFarm(saved: unknown): FarmState {
  const farm = saved as FarmState | undefined;
  if (!farm || !Array.isArray(farm.tiles) || !Array.isArray(farm.animals)) return initialFarm();
  // A farm saved when the meadow was a 5 x 6 patch in the middle is grown out
  // to the whole island here, which is what makes every cell ploughable on an
  // old save too. expandFarm matches tiles up by their cell, so nothing she
  // planted moves.
  return withPlacements(expandFarm(migrateDecorKinds(migrateDecorToItems(farm)), 1));
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
      onboarded: false,
      birthdayGreeted: false,
      hydrated: false,
      devFast: import.meta.env.DEV,

      place: "finca",
      farmTool: "none",
      marketCategory: "seeds",

      finishBirthday() {
        setState({ birthdayGreeted: true });
      },

      finishOnboarding() {
        setState({ onboarded: true });
      },

      setPlace(place) {
        setState({ place, farmTool: "none" });
      },

      setFarmTool(tool) {
        setState({ farmTool: tool });
      },

      setMarketCategory(category) {
        setState({ marketCategory: category });
      },

      finishSession({ kind, unitWords = [], answers, now = Date.now() }) {
        const state = getState();

        const words = { ...state.words };
        for (const id of unitWords) {
          if (!words[id]) words[id] = initProgress(id, now);
        }
        // Where each word stood before the session, so the end screen can say
        // what moved. Only words she actually answered on are recorded.
        const before = new Map<string, number>();
        for (const answer of answers) {
          for (const id of answer.wordIds) {
            const progress = words[id] ?? initProgress(id, now);
            if (!before.has(id)) before.set(id, progress.box);
            words[id] = review(progress, answer.correct, now);
          }
        }
        const boxChanges: BoxChange[] = [];
        for (const [wordId, from] of before) {
          const to = words[wordId].box;
          if (to !== from) boxChanges.push({ wordId, from, to });
        }

        const streak = touchStreak(state.player.streak, dateString(now));
        const correct = answers.filter((a) => a.correct).length;
        const total = answers.length;
        const reward = sessionReward({ kind, correct, total, streakDays: streak.days });

        const xp = state.player.xp + reward.xp;
        const unlockedUnits = unlockedUnitsForXp(xp);
        // Crossing a gate is worth a moment on the end screen; work it out
        // here, where both the before and the after are in hand.
        const opened = unlockedUnits.find((u) => !state.player.unlockedUnits.includes(u));
        const player: Player = {
          ...state.player,
          munten: state.player.munten + reward.munten,
          xp,
          streak,
          unlockedUnits,
        };

        setState({ player, words });
        return { ...reward, correct, total, kind, boxChanges, unlockedUnit: opened };
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

      wearAvatar(avatar) {
        const state = getState();
        setState({ player: { ...state.player, avatar } });
      },

      buyWearable(itemId) {
        const state = getState();
        const def = getWearable(itemId);
        if (state.player.ownedItems.includes(itemId)) return true;
        if (state.player.munten < def.price) return false;
        setState({
          player: {
            ...state.player,
            munten: state.player.munten - def.price,
            ownedItems: [...state.player.ownedItems, itemId],
          },
        });
        // Owning it is meeting the word: it joins the review queue with its
        // article, the same way tapping something on the farm does.
        getState().logExposure(def.word);
        return true;
      },

      useColor(colorId) {
        const state = getState();
        if (state.player.usedColors.includes(colorId)) return 0;
        const colour = COLOR_BY_ID.get(colorId);
        if (!colour) return 0;
        setState({
          player: {
            ...state.player,
            munten: state.player.munten + COLOR_REWARD_MUNTEN,
            usedColors: [...state.player.usedColors, colorId],
          },
        });
        getState().logExposure(colour.word);
        return COLOR_REWARD_MUNTEN;
      },

      completeQuest(questId) {
        const state = getState();
        const quest = getQuest(questId);
        if (!quest) return { munten: 0 };

        const already = state.player.completedQuests.includes(questId);
        const payout = payoutFor(quest, already);
        const unlock = parseUnlock(payout.unlock);

        let farm = state.farm;
        let landLevel = state.player.landLevel;
        let gift: string | undefined;

        if (unlock?.kind === "landLevel") {
          landLevel = Math.max(landLevel, unlock.level);
          farm = expandFarm(farm, landLevel);
        } else if (unlock?.kind === "decor") {
          const wider = addDecor(farm, unlock.decorKind);
          // A full island means the present cannot be handed over. She keeps
          // the coins and the quest still counts — losing both to a lack of
          // space would be the game punishing her for decorating.
          if (wider !== farm) {
            farm = wider;
            gift = unlock.decorKind;
          }
        }

        setState({
          player: {
            ...state.player,
            munten: state.player.munten + payout.munten,
            landLevel,
            completedQuests: already
              ? state.player.completedQuests
              : [...state.player.completedQuests, questId],
          },
          farm,
        });

        return { munten: payout.munten, landLevel: unlock?.kind === "landLevel" ? landLevel : undefined, gift };
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

      devReplayOnboarding() {
        setState({ onboarded: false });
      },

      /**
       * Fill the review queue: a session's worth of words, all due now, spread
       * across the Leitner boxes.
       *
       * Dev only, and the levels are the point. How well she knows a word
       * decides which way round the review asks it — meaning, article,
       * backwards, by ear — so there is otherwise no way to see three of those
       * four questions without a fortnight of honest practice.
       */
      devFillReview(now = Date.now()) {
        const state = getState();
        const words = { ...state.words };
        for (const word of VOCAB) {
          if (Object.keys(words).length >= SESSION_MAX) break;
          words[word.id] ??= initProgress(word.id, now);
        }
        let box = 0;
        for (const id of Object.keys(words)) {
          words[id] = { ...words[id], box: box as WordProgress["box"], dueAt: now };
          box = (box + 1) % (MAX_BOX + 1);
        }
        setState({ words });
      },

      async devReset() {
        // Saving is debounced, so a write queued a moment ago would land on
        // top of a cleared store and quietly resurrect the farm. Clear, wait
        // out the debounce, clear again — then reload into a virgin game.
        await useGameStore.persist.clearStorage();
        await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 100));
        await useGameStore.persist.clearStorage();
        // The tiny preferences live outside the save; a first-time experience
        // means the voice and the sound switch start over too.
        setPreferredVoice(null);
        setMuted(false);
        // The pairing code lives outside the save as well, and leaving it
        // behind is worse than untidy: the blank farm is newer than the one on
        // the server, so the next change would push the emptiness over her
        // backup. A first run is an unpaired run. Imported here rather than at
        // the top because sync.ts already imports this module.
        const { stopSync, setSyncEmail } = await import("./sync");
        stopSync();
        setSyncEmail("");
        // Reloading is what turns a cleared store into a first run. Guarded so
        // the wipe itself can be tested without a browser around it.
        if (typeof location !== "undefined") location.reload();
      },
    }),
    {
      name: "finca-flamenca-save",
      version: 7,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        place: s.place,
        onboarded: s.onboarded,
        birthdayGreeted: s.birthdayGreeted,
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
        if (version < 6) {
          // The farm used to arrive furnished — a house, a mill, a stand, two
          // trees, a well and a cart, all standing there before she had done
          // anything. It is hers to build now, so a save from before that has
          // the furniture taken back out. withPlacements drops the cells they
          // were holding on the next load.
          //
          // Everything goes, not just what the game issued: a save cannot tell
          // a bought tree from a given one, and a farm that is nearly empty is
          // not what was asked for. It all costs coins she has already earned,
          // and it is all still in the shop.
          const farm = state.farm as FarmState | undefined;
          if (farm) state = { ...state, farm: { ...farm, decor: [] } };
        }
        if (version < 7) {
          // ...and the hen the farm used to come with goes the same way. An
          // empty island means empty: whatever is standing here, she put it
          // there. Animals she bought go too, for the same reason the decor
          // did — a save cannot tell them apart, and the coins came from
          // lessons she can do again.
          const farm = state.farm as FarmState | undefined;
          if (farm) state = { ...state, farm: { ...farm, animals: [] } };
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
          player: normalizePlayer(saved.player),
          // Saves from before the village existed have no place; the farm is
          // the right thing to open on anyway.
          place: saved.place ?? "finca",
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
