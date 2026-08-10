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

export type Exercise =
  | ChoiceExercise
  | TranslateExercise
  | ListenExercise
  | AssembleExercise
  | MatchExercise;

export interface LessonUnit {
  unit: number;
  title_es: string;
  title_nl: string;
  words: string[]; // Word ids introduced by this unit
  exercises: Exercise[];
  reviewed: boolean; // Dutch content human-verified?
}
