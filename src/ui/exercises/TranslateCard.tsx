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
    <div className="flex flex-1 flex-col justify-center gap-5">
      <p className="text-center text-xl font-black text-ink-900 [text-wrap:pretty]">
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
        className="w-full resize-none border-b-[3px] border-farm-200 bg-transparent px-1 py-3 text-xl font-black text-ink-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none"
      />
      <CheckButton disabled={locked || !text.trim()} onClick={submit} />
    </div>
  );
}
