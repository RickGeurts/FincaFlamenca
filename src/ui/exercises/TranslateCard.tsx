import { useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { TranslateExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { gradeExercise } from "../../learning/lesson";
import { CheckButton } from "./CheckButton";

interface Props {
  exercise: TranslateExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

export function TranslateCard({ exercise, locked, onResult }: Props) {
  const [text, setText] = useState("");
  const submit = () => text.trim() && onResult(gradeExercise(exercise, text));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-bold text-farm-700/80">{STRINGS.translatePrompt}</h2>
      <p className="rounded-2xl bg-white px-5 py-4 text-xl font-extrabold shadow-sm">
        {exercise.prompt_es}
      </p>
      <textarea
        value={text}
        disabled={locked}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={STRINGS.typePlaceholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        rows={2}
        className="rounded-2xl border-2 border-farm-200 bg-white p-4 text-lg font-semibold focus:border-leaf-500 focus:outline-none"
      />
      <CheckButton disabled={locked || !text.trim()} onClick={submit} />
    </div>
  );
}
