// The conversation itself: a small state machine over a quest's nodes.
//
// Pure TypeScript with no React and no store, so a whole conversation can be
// played out in a test. It holds the transcript rather than the UI, because
// what was said is part of the game state — she can scroll back through it.

import type { DialogueNode, DialogueQuest } from "../content/types";
import { grade, type GradeResult } from "../learning/grader";

export type Turn =
  | { who: "npc"; nl: string; es: string }
  | { who: "player"; nl: string; /** Set when she wrote it herself and slipped. */ corrected?: string };

export interface DialogueState {
  questId: string;
  nodeId: string;
  turns: Turn[];
  /** How many replies she has given, for the progress bar. */
  step: number;
  /** The conversation has run out of nodes; the reward is due. */
  done: boolean;
}

export function nodeById(quest: DialogueQuest, id: string): DialogueNode | undefined {
  return quest.nodes.find((n) => n.id === id);
}

/** How many times she will be asked to say something. */
export function questSteps(quest: DialogueQuest): number {
  return quest.nodes.filter((n) => n.choices !== undefined || n.answer_nl !== undefined).length;
}

/** Open the conversation on its first node. */
export function startDialogue(quest: DialogueQuest): DialogueState {
  const first = quest.nodes[0];
  return {
    questId: quest.id,
    nodeId: first.id,
    turns: [{ who: "npc", nl: first.npc_nl, es: first.npc_es_hint }],
    step: 0,
    done: first.end === true,
  };
}

/** The node she is standing on, or undefined if the content is broken. */
export function currentNode(
  quest: DialogueQuest,
  state: DialogueState,
): DialogueNode | undefined {
  return nodeById(quest, state.nodeId);
}

function advance(quest: DialogueQuest, state: DialogueState, toId: string, said: Turn): DialogueState {
  const next = nodeById(quest, toId);
  const turns = [...state.turns, said];
  if (!next) {
    // A `goto` that points nowhere ends the conversation rather than freezing
    // it. Content bugs should cost a short quest, never a stuck screen.
    return { ...state, turns, step: state.step + 1, done: true };
  }
  turns.push({ who: "npc", nl: next.npc_nl, es: next.npc_es_hint });
  return {
    ...state,
    nodeId: next.id,
    turns,
    step: state.step + 1,
    done: next.end === true,
  };
}

/** Say one of the offered lines. */
export function choose(
  quest: DialogueQuest,
  state: DialogueState,
  index: number,
): DialogueState {
  const node = currentNode(quest, state);
  const choice = node?.choices?.[index];
  if (!choice || state.done) return state;
  return advance(quest, state, choice.goto, { who: "player", nl: choice.nl });
}

export interface AnswerOutcome {
  state: DialogueState;
  result: GradeResult;
}

/**
 * Write the reply yourself.
 *
 * Graded with the same tolerant rules as a written exercise, and then the
 * conversation moves on either way: the neighbour understood you. A slip is
 * recorded on the turn so the transcript can show what she meant to say, which
 * is the whole lesson — being stopped at the door is not.
 */
export function answer(
  quest: DialogueQuest,
  state: DialogueState,
  text: string,
): AnswerOutcome {
  const node = currentNode(quest, state);
  if (!node?.answer_nl || state.done) {
    return { state, result: { correct: false, typo: false, expected: "" } };
  }
  const accepted = [node.answer_nl, ...(node.accept ?? [])];
  const result = grade(text, accepted);
  const said: Turn = {
    who: "player",
    nl: text.trim(),
    corrected: result.correct ? undefined : node.answer_nl,
  };
  return { state: advance(quest, state, node.goto ?? "", said), result };
}
