import type { Streak } from "./streak";

export interface AvatarConfig {
  outfit: string;
  hat?: string;
  accessory?: string;
}

export interface Player {
  munten: number;
  xp: number;
  streak: Streak;
  avatar: AvatarConfig;
  unlockedUnits: number[];
  completedQuests: string[];
  landLevel: number;
}

export const DEFAULT_AVATAR: AvatarConfig = { outfit: "overol" };
