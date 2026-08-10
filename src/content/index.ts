// Typed access to all authored content. New units/dialogues are added here.

import type { DialogueQuest, LessonUnit, Word } from "./types";
import vocabJson from "./vocab/words.json";
import unit01 from "./course/a1-unit-01.json";
import unit02 from "./course/a1-unit-02.json";
import unit03 from "./course/a1-unit-03.json";
import unit04 from "./course/a1-unit-04.json";
import unit05 from "./course/a1-unit-05.json";
import unit06 from "./course/a1-unit-06.json";
import unit07 from "./course/a1-unit-07.json";
import unit08 from "./course/a1-unit-08.json";
import unit09 from "./course/a1-unit-09.json";
import unit10 from "./course/a1-unit-10.json";
import questBuurvrouw from "./dialogues/quest-buurvrouw.json";
import questVeehandelaar from "./dialogues/quest-veehandelaar.json";
import questGemeente from "./dialogues/quest-gemeente.json";

export const VOCAB: Word[] = vocabJson.words as Word[];

export const UNITS: LessonUnit[] = [
  unit01, unit02, unit03, unit04, unit05,
  unit06, unit07, unit08, unit09, unit10,
].map(
  (u) => u as unknown as LessonUnit,
);

/** Story quests, in the order she will meet them. */
export const QUESTS: DialogueQuest[] = [
  questBuurvrouw, questVeehandelaar, questGemeente,
].map((q) => q as unknown as DialogueQuest);

export const WORDS_BY_ID: ReadonlyMap<string, Word> = new Map(
  VOCAB.map((w) => [w.id, w]),
);

export function getUnit(unit: number): LessonUnit | undefined {
  return UNITS.find((u) => u.unit === unit);
}

export function getQuest(id: string): DialogueQuest | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** Dev checklist: content files still awaiting human review of the Dutch. */
export function unreviewedContent(): string[] {
  const pending: string[] = [];
  if (!vocabJson.reviewed) pending.push("vocab/words.json");
  for (const u of UNITS) {
    if (!u.reviewed) pending.push(`course/a1-unit-${String(u.unit).padStart(2, "0")}.json`);
  }
  for (const q of QUESTS) {
    if (!q.reviewed) pending.push(`dialogues/${q.id}.json`);
  }
  return pending;
}
