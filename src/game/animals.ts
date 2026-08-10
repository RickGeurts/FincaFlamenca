// Animal care: hunger/feed cycles and produce (eggs, milk). Pure module —
// `now` is always injected. Cycle: feed -> produce ready after produceMs ->
// collect -> hungry again after hungerAfterMs -> feed ...

import type { AnimalSpeciesDef } from "./economy";

export interface Animal {
  id: string;
  speciesId: string;
  name?: string; // player-given name, used everywhere ("Manchas heeft honger!")
  /** Decor id of the pen it lives in. Penned animals roam free, off the grid. */
  penId?: string;
  lastFedAt: number; // 0 = never fed
  lastCollectedAt: number;
  happiness: number; // 0..100, cosmetic — never punishing
}

const HAPPINESS_FEED_BONUS = 10;
const HAPPINESS_COLLECT_BONUS = 5;

function clampHappiness(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function createAnimal(id: string, speciesId: string, name?: string): Animal {
  return { id, speciesId, name, lastFedAt: 0, lastCollectedAt: 0, happiness: 80 };
}

export function displayName(animal: Animal, def: AnimalSpeciesDef): string {
  return animal.name?.trim() || def.word;
}

export function isHungry(animal: Animal, def: AnimalSpeciesDef, now: number): boolean {
  return animal.lastFedAt === 0 || now >= animal.lastFedAt + def.hungerAfterMs;
}

export function hasProduce(animal: Animal, def: AnimalSpeciesDef, now: number): boolean {
  return (
    animal.lastFedAt > 0 &&
    animal.lastFedAt > animal.lastCollectedAt &&
    now >= animal.lastFedAt + def.produceMs
  );
}

/** Feed a hungry animal. No-op when it isn't hungry. */
export function feed(animal: Animal, def: AnimalSpeciesDef, now: number): Animal {
  if (!isHungry(animal, def, now)) return animal;
  return {
    ...animal,
    lastFedAt: now,
    happiness: clampHappiness(animal.happiness + HAPPINESS_FEED_BONUS),
  };
}

/** Collect ready produce. No-op when nothing is ready. */
export function collect(animal: Animal, def: AnimalSpeciesDef, now: number): Animal {
  if (!hasProduce(animal, def, now)) return animal;
  return {
    ...animal,
    lastCollectedAt: now,
    happiness: clampHappiness(animal.happiness + HAPPINESS_COLLECT_BONUS),
  };
}
