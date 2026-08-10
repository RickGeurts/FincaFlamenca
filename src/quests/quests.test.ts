// Who may walk into which quest, and what it pays.

import { describe, expect, it } from "vitest";
import { openQuests, parseUnlock, payoutFor, questsAt, isAvailable } from "./quests";
import { QUESTS, getQuest } from "../content";
import { ECONOMY } from "../game/economy";

const gemeente = getQuest("gemeente-land-1")!;
const buurvrouw = getQuest("buurvrouw-welkom")!;

describe("which quests are open", () => {
  it("waits for the unit that teaches the words", () => {
    expect(isAvailable(gemeente, [1, 2, 3, 4])).toBe(false);
    expect(isAvailable(gemeente, [1, 2, 3, 4, 5])).toBe(true);
  });

  it("greets her with the neighbour from the very first unit", () => {
    // Unit 1 is always open, so there is a quest waiting on day one.
    expect(isAvailable(buurvrouw, [1])).toBe(true);
  });

  it("drops a quest off the list once it is done", () => {
    const open = openQuests(QUESTS, [1, 2, 3, 4, 5], [buurvrouw.id]);
    expect(open.map((q) => q.id)).not.toContain(buurvrouw.id);
    expect(open.map((q) => q.id)).toContain(gemeente.id);
  });

  it("still offers a finished quest at its own location", () => {
    // Off the to-do list, but the door is not locked: replaying is how she
    // practises the conversation again.
    const there = questsAt(QUESTS, "alcaldia", [1, 2, 3, 4, 5]);
    expect(there.map((q) => q.id)).toContain(gemeente.id);
  });

  it("puts every quest somewhere she can actually go", () => {
    const places = new Set(["finca", "mercado", "criadero", "alcaldia"]);
    for (const quest of QUESTS) {
      expect(places.has(quest.location), `${quest.id} is at "${quest.location}"`).toBe(true);
    }
  });
});

describe("what a quest pays", () => {
  it("pays the real reward the first time", () => {
    expect(payoutFor(gemeente, false)).toEqual({
      munten: gemeente.reward.munten,
      unlock: gemeente.reward.unlock,
    });
  });

  it("pays a small thank-you on a replay, and unlocks nothing twice", () => {
    const again = payoutFor(gemeente, true);
    expect(again.munten).toBe(ECONOMY.QUEST_REPLAY_MUNTEN);
    expect(again.unlock).toBeUndefined();
    expect(again.munten).toBeLessThan(gemeente.reward.munten);
  });

  it("keeps first rewards inside the band the economy sets", () => {
    for (const quest of QUESTS) {
      expect(quest.reward.munten, `${quest.id}`).toBeGreaterThanOrEqual(100);
      expect(quest.reward.munten, `${quest.id}`).toBeLessThanOrEqual(250);
    }
  });
});

describe("reading an unlock", () => {
  it("understands land", () => {
    expect(parseUnlock("landLevel:2")).toEqual({ kind: "landLevel", level: 2 });
  });

  it("understands a gift of a decoration", () => {
    expect(parseUnlock("decor:wei2")).toEqual({ kind: "decor", decorKind: "wei2" });
  });

  it("says nothing when there is nothing to unlock", () => {
    expect(parseUnlock(undefined)).toBeNull();
  });

  it("reports an unlock it does not know rather than silently dropping it", () => {
    // A typo in the content should be visible, not a reward that vanishes.
    expect(parseUnlock("landlevel:2")).toEqual({ kind: "unknown", raw: "landlevel:2" });
    expect(parseUnlock("landLevel:zero")).toEqual({ kind: "unknown", raw: "landLevel:zero" });
  });

  it("every unlock in the shipped quests is one the game understands", () => {
    for (const quest of QUESTS) {
      const unlock = parseUnlock(quest.reward.unlock);
      if (unlock === null) continue;
      expect(unlock.kind, `${quest.id} unlocks "${quest.reward.unlock}"`).not.toBe("unknown");
    }
  });
});
