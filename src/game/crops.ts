// Crop lifecycle: planted -> growing -> ready -> wilted. Pure module — state
// is fully derived from timestamps, and `now` is always injected.
//
// Watering shifts `plantedAt` back in time by the boost, so all downstream
// math (readyAt, wiltAt, progress) needs no extra fields.

import { WATER_BOOST, WILT_AFTER_MS, type CropDef } from "./economy";

export type CropState = "growing" | "ready" | "wilted";

export interface PlantedCrop {
  cropId: string;
  plantedAt: number; // epoch ms (already shifted if watered)
  watered: boolean;
  /** Dev fast-mode override; normal saves omit it and use the crop's growMs. */
  growMsOverride?: number;
}

export function plant(cropId: string, now: number, growMsOverride?: number): PlantedCrop {
  return { cropId, plantedAt: now, watered: false, growMsOverride };
}

export function effectiveGrowMs(crop: PlantedCrop, def: CropDef): number {
  return crop.growMsOverride ?? def.growMs;
}

export function readyAt(crop: PlantedCrop, def: CropDef): number {
  return crop.plantedAt + effectiveGrowMs(crop, def);
}

export function wiltAt(crop: PlantedCrop, def: CropDef): number {
  return readyAt(crop, def) + WILT_AFTER_MS;
}

export function cropState(crop: PlantedCrop, def: CropDef, now: number): CropState {
  if (now < readyAt(crop, def)) return "growing";
  if (now < wiltAt(crop, def)) return "ready";
  return "wilted";
}

/** Water once: shaves WATER_BOOST of the grow time. No-op if already watered. */
export function water(crop: PlantedCrop, def: CropDef): PlantedCrop {
  if (crop.watered) return crop;
  return {
    ...crop,
    plantedAt: crop.plantedAt - effectiveGrowMs(crop, def) * WATER_BOOST,
    watered: true,
  };
}

/** Growth progress in [0, 1]; 1 means ready (or beyond). */
export function growthProgress(crop: PlantedCrop, def: CropDef, now: number): number {
  const progress = (now - crop.plantedAt) / effectiveGrowMs(crop, def);
  return Math.min(1, Math.max(0, progress));
}

/**
 * Revive a wilted crop: it becomes freshly ready right now, starting a new
 * full wilt window. Losing progress is never the answer.
 */
export function revive(crop: PlantedCrop, def: CropDef, now: number): PlantedCrop {
  return { ...crop, plantedAt: now - effectiveGrowMs(crop, def) };
}
