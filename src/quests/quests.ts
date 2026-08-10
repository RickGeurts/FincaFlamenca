// Which quests are open to her, and what finishing one is worth.
//
// Kept apart from the conversation itself: the dialogue is content, this is
// economy. Both are pure, so the rules can be tested without a farm.

import type { DialogueQuest } from "../content/types";
import { ECONOMY } from "../game/economy";

/** A quest she can walk into right now. */
export function isAvailable(
  quest: DialogueQuest,
  unlockedUnits: number[],
): boolean {
  return unlockedUnits.includes(quest.requires.unit);
}

/**
 * The quests worth showing on the school's list: open, and not yet done.
 * Finished quests can still be replayed from their location, but they should
 * not sit on a to-do list pretending to be new.
 */
export function openQuests(
  quests: DialogueQuest[],
  unlockedUnits: number[],
  completed: string[],
): DialogueQuest[] {
  return quests.filter((q) => isAvailable(q, unlockedUnits) && !completed.includes(q.id));
}

/** Every quest that happens in this place and is open to her. */
export function questsAt(
  quests: DialogueQuest[],
  location: string,
  unlockedUnits: number[],
): DialogueQuest[] {
  return quests.filter((q) => q.location === location && isAvailable(q, unlockedUnits));
}

export interface QuestPayout {
  munten: number;
  /** Only ever handed out once, however often the quest is replayed. */
  unlock?: string;
}

/**
 * What finishing pays. The first time is the real reward; afterwards it is a
 * small thank-you, so replaying for the language is worth a little and
 * farming the same conversation for coins is not.
 */
export function payoutFor(quest: DialogueQuest, alreadyCompleted: boolean): QuestPayout {
  if (alreadyCompleted) return { munten: ECONOMY.QUEST_REPLAY_MUNTEN };
  return { munten: quest.reward.munten, unlock: quest.reward.unlock };
}

export type Unlock =
  | { kind: "landLevel"; level: number }
  | { kind: "decor"; decorKind: string }
  | { kind: "unknown"; raw: string };

/** Read an unlock string from the content into something the store can apply. */
export function parseUnlock(raw: string | undefined): Unlock | null {
  if (!raw) return null;
  const [kind, value] = raw.split(":");
  if (kind === "landLevel") {
    const level = Number(value);
    return Number.isFinite(level) && level > 0
      ? { kind: "landLevel", level }
      : { kind: "unknown", raw };
  }
  if (kind === "decor" && value) return { kind: "decor", decorKind: value };
  return { kind: "unknown", raw };
}
