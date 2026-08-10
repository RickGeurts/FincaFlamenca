import type { Streak } from "./streak";
import type { AvatarConfig } from "./avatar";
import { STARTER_ITEMS, defaultAvatar } from "./avatar";

export type { AvatarConfig };

export interface Player {
  munten: number;
  xp: number;
  streak: Streak;
  /** What she is wearing right now. Changing it is always free. */
  avatar: AvatarConfig;
  /** Wearables she owns. Trying on is free; this is what she has bought. */
  ownedItems: string[];
  /** Colours she has already been paid for using, so the +2 lands once. */
  usedColors: string[];
  unlockedUnits: number[];
  completedQuests: string[];
  landLevel: number;
}

export const DEFAULT_AVATAR: AvatarConfig = defaultAvatar();
export const DEFAULT_OWNED_ITEMS: string[] = [...STARTER_ITEMS];
