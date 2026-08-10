// Playing a conversation from beginning to end without a screen.
//
// The rule that matters most here is the kind one: a written answer that comes
// out wrong still moves the conversation along. Being stopped at the town hall
// counter until you spell it right is exactly the punishment this game does
// not do — so it is pinned by a test rather than left to good intentions.

import { describe, expect, it } from "vitest";
import { answer, choose, currentNode, questSteps, startDialogue } from "./dialogue";
import { QUESTS, getQuest } from "../content";
import type { DialogueQuest } from "../content/types";
import type { DialogueState } from "./dialogue";

const gemeente = getQuest("gemeente-land-1")!;

/** The reply she just gave — earlier turns came from tapping options. */
function lastPlayerTurn(state: DialogueState) {
  return [...state.turns].reverse().find((t) => t.who === "player");
}

describe("holding a conversation", () => {
  it("opens on the first line, with the Spanish alongside", () => {
    const state = startDialogue(gemeente);
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0]).toMatchObject({ who: "npc", nl: gemeente.nodes[0].npc_nl });
    expect(state.turns[0]).toHaveProperty("es");
    expect(state.done).toBe(false);
  });

  it("records both sides as it goes", () => {
    let state = startDialogue(gemeente);
    const said = currentNode(gemeente, state)!.choices![0].nl;
    state = choose(gemeente, state, 0);
    expect(state.turns.map((t) => t.who)).toEqual(["npc", "player", "npc"]);
    expect(state.turns[1]).toMatchObject({ who: "player", nl: said });
  });

  it("takes a blunt reply just as far as a polite one", () => {
    // Both options exist so she can hear the difference in the answer, not so
    // one of them can dead-end her.
    const polite = choose(gemeente, startDialogue(gemeente), 0);
    const blunt = choose(gemeente, startDialogue(gemeente), 1);
    expect(blunt.nodeId).toBe(polite.nodeId);
    expect(blunt.done).toBe(false);
  });

  it("ignores a choice that does not exist", () => {
    const state = startDialogue(gemeente);
    expect(choose(gemeente, state, 99)).toBe(state);
  });

  it("reaches the end when she picks her way through", () => {
    let state = startDialogue(gemeente);
    for (let guard = 0; guard < 20 && !state.done; guard++) {
      const node = currentNode(gemeente, state)!;
      if (node.choices) state = choose(gemeente, state, 0);
      else state = answer(gemeente, state, node.answer_nl!).state;
    }
    expect(state.done, "the gemeente quest never finishes").toBe(true);
  });
});

describe("writing your own reply", () => {
  /** Walk to the node that asks her to type something. */
  function atWrittenNode(quest: DialogueQuest) {
    let state = startDialogue(quest);
    for (let guard = 0; guard < 20; guard++) {
      const node = currentNode(quest, state)!;
      if (!node.choices) return { state, node };
      state = choose(quest, state, 0);
    }
    throw new Error("no written node in this quest");
  }

  it("accepts the answer as written", () => {
    const { state, node } = atWrittenNode(gemeente);
    const outcome = answer(gemeente, state, node.answer_nl!);
    expect(outcome.result.correct).toBe(true);
  });

  it("forgives a typo, the way the exercises do", () => {
    const { state, node } = atWrittenNode(gemeente);
    const almost = node.answer_nl!.replace("alstublieft", "alstubieft");
    const outcome = answer(gemeente, state, almost);
    expect(outcome.result.correct).toBe(true);
    expect(outcome.result.typo).toBe(true);
  });

  it("moves on even when the answer is wrong", () => {
    const { state, node } = atWrittenNode(gemeente);
    const outcome = answer(gemeente, state, "banaan banaan banaan");
    expect(outcome.result.correct).toBe(false);
    // ...and yet:
    expect(outcome.state.nodeId, "a wrong answer left her stuck").not.toBe(state.nodeId);
    expect(outcome.state.step).toBe(state.step + 1);
    // The transcript keeps what she meant to say, so she can read it back.
    expect(lastPlayerTurn(outcome.state)).toMatchObject({ corrected: node.answer_nl });
  });

  it("says nothing about a correct answer needing correcting", () => {
    const { state, node } = atWrittenNode(gemeente);
    const after = answer(gemeente, state, node.answer_nl!).state;
    expect(lastPlayerTurn(after)).toMatchObject({ corrected: undefined });
  });
});

describe("every quest that ships", () => {
  it("can be finished by always taking the first option", () => {
    for (const quest of QUESTS) {
      let state = startDialogue(quest);
      for (let guard = 0; guard < 30 && !state.done; guard++) {
        const node = currentNode(quest, state);
        expect(node, `${quest.id}: goto points at a node that is not there`).toBeDefined();
        if (node!.choices) state = choose(quest, state, 0);
        else if (node!.answer_nl) state = answer(quest, state, node!.answer_nl).state;
        else break;
      }
      expect(state.done, `${quest.id} never reaches an ending`).toBe(true);
    }
  });

  it("can be finished by always taking the last option", () => {
    // The blunt path has to work too, or half the content is a trap.
    for (const quest of QUESTS) {
      let state = startDialogue(quest);
      for (let guard = 0; guard < 30 && !state.done; guard++) {
        const node = currentNode(quest, state)!;
        if (node.choices) state = choose(quest, state, node.choices.length - 1);
        else if (node.answer_nl) state = answer(quest, state, "iets heel anders").state;
        else break;
      }
      expect(state.done, `${quest.id} dead-ends on the blunt path`).toBe(true);
    }
  });

  it("counts the steps she will be asked to take", () => {
    for (const quest of QUESTS) {
      expect(questSteps(quest), `${quest.id} asks nothing of her`).toBeGreaterThan(0);
    }
  });

  it("gives every node a Spanish hint, since revealing it is always free", () => {
    for (const quest of QUESTS) {
      for (const node of quest.nodes) {
        expect(node.npc_es_hint, `${quest.id}/${node.id} has no Spanish`).toBeTruthy();
        expect(node.npc_nl, `${quest.id}/${node.id} has no Dutch`).toBeTruthy();
      }
    }
  });

  it("points every reply at a node that exists", () => {
    for (const quest of QUESTS) {
      const ids = new Set(quest.nodes.map((n) => n.id));
      expect(ids.size, `${quest.id} has two nodes with the same id`).toBe(quest.nodes.length);
      for (const node of quest.nodes) {
        for (const choice of node.choices ?? []) {
          expect(ids.has(choice.goto), `${quest.id}/${node.id} -> ${choice.goto}`).toBe(true);
        }
        if (node.answer_nl) {
          expect(ids.has(node.goto ?? ""), `${quest.id}/${node.id} -> ${node.goto}`).toBe(true);
        }
      }
    }
  });

  it("offers help on every question it asks her to write", () => {
    for (const quest of QUESTS) {
      for (const node of quest.nodes) {
        if (!node.answer_nl) continue;
        expect(node.ask_es, `${quest.id}/${node.id} asks nothing in Spanish`).toBeTruthy();
        expect(node.hint_nl?.length, `${quest.id}/${node.id} offers no hint`).toBeGreaterThan(0);
      }
    }
  });

  it("asks her to write something at least once", () => {
    // A quest that is only multiple choice is a menu, not a conversation.
    for (const quest of QUESTS) {
      const written = quest.nodes.filter((n) => n.answer_nl !== undefined);
      expect(written.length, `${quest.id} never asks her to write`).toBeGreaterThan(0);
    }
  });
});
