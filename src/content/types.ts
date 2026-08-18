// Schemas for author-editable JSON content. Content is drafted by tooling and
// must be human-reviewed (articles, word order, u/je register) before shipping:
// every content file carries a `reviewed` flag surfaced in the dev checklist.

export interface Word {
  id: string; // "koe"
  nl: string; // "koe"
  article?: "de" | "het";
  es: string; // "vaca"
  category: string; // "animals", "food", "greetings", ...
  unit: number; // course unit that introduces it
  /**
   * One short sentence using the word, shown on its card. Optional: a word
   * without one simply shows no sentence panel, so content can be filled in
   * word by word instead of all at once.
   */
  example_nl?: string;
  example_es?: string;
}

export interface ChoiceExercise {
  type: "choice";
  prompt_nl: string;
  answer_es: string;
  distractors_es: string[];
  word?: string; // wordId for SRS credit
}

export interface TranslateExercise {
  type: "translate";
  prompt_es: string;
  answer_nl: string;
  accept?: string[];
  word?: string;
}

export interface ListenExercise {
  type: "listen";
  audio_nl: string;
  answer_nl: string;
  accept?: string[];
  word?: string;
}

export interface AssembleExercise {
  type: "assemble";
  prompt_es: string;
  tiles_nl: string[];
  answer_nl: string;
  word?: string;
}

export interface MatchExercise {
  type: "match";
  pairs: { nl: string; es: string; word?: string }[];
}

/**
 * Which question a `pick` is asking. The player reads it in Spanish; the key
 * is what travels, so the wording stays in `strings.es`.
 */
export type PickAsk = "meaning" | "recall" | "article" | "listen";

/**
 * A multiple-choice question built in code instead of authored in a unit.
 *
 * `choice` always asks the same way round — a Dutch word, four Spanish
 * meanings — because that is how the units are written, and for a first
 * meeting that is the right way round. The daily review asks the same handful
 * of words every day for months, so it has to be able to turn a word over:
 * give her the Spanish and ask for the Dutch, say the word without showing it,
 * or ask for nothing but the article.
 */
export interface PickExercise {
  type: "pick";
  ask: PickAsk;
  /** What she reads — or, when the ask is `listen`, only hears. */
  prompt: string;
  prompt_lang: "nl" | "es";
  /** Shown in this order: shuffling is the session builder's business. */
  options: string[];
  options_lang: "nl" | "es";
  answer: string;
  /**
   * What to show as the right answer when the bare option does not say enough
   * on its own — "de koe" rather than "de". Defaults to the answer.
   */
  reveal?: string;
  word?: string; // wordId for SRS credit
}

export type Exercise =
  | ChoiceExercise
  | TranslateExercise
  | ListenExercise
  | AssembleExercise
  | MatchExercise
  | PickExercise;

// ---------------------------------------------------------------------------
// Story quests
//
// A quest is a conversation with somebody in the village. NPC lines are always
// Dutch first with the Spanish a tap away — revealing costs nothing, ever.
// Register matters and is part of the content: formal *u* with officials and
// shopkeepers, informal *je* with the neighbour.

/** Where in the village the conversation happens. */
export type QuestLocation = "finca" | "mercado" | "criadero" | "alcaldia";

export interface DialogueChoice {
  nl: string;
  /** Node this reply leads to. */
  goto: string;
  /**
   * How well the reply fits. Only ever changes what the NPC says back — a
   * blunt answer is a different conversation, never a worse outcome.
   */
  quality?: "best" | "ok";
}

export interface DialogueNode {
  id: string;
  npc_nl: string;
  npc_es_hint: string;
  /** Pick a Dutch reply... */
  choices?: DialogueChoice[];
  /** ...or write one. Graded like a `translate` exercise: tolerant, 1 typo. */
  ask_es?: string;
  answer_nl?: string;
  accept?: string[];
  /** Words offered under the box when she asks for a hint. */
  hint_nl?: string[];
  /** Where a written answer leads. */
  goto?: string;
  /** Nothing left to say: the quest pays out here. */
  end?: boolean;
}

export interface DialogueQuest {
  id: string;
  title_es: string;
  title_nl: string;
  /** One line about what she will get out of it, for the quest list. */
  summary_es: string;
  location: QuestLocation;
  npc_emoji: string;
  requires: { unit: number };
  reward: {
    munten: number;
    /** `landLevel:2`, `decor:wei2`, ... See quests/rewards. */
    unlock?: string;
  };
  nodes: DialogueNode[];
  reviewed: boolean;
}

export interface LessonUnit {
  unit: number;
  title_es: string;
  title_nl: string;
  words: string[]; // Word ids introduced by this unit
  exercises: Exercise[];
  reviewed: boolean; // Dutch content human-verified?
}
