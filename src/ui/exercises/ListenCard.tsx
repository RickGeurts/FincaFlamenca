import { useEffect, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { ListenExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { gradeExercise } from "../../learning/lesson";
import { canSpeak, speak } from "../../utils/speak";
import { CheckButton } from "./CheckButton";

interface Props {
  exercise: ListenExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

export function ListenCard({ exercise, locked, onResult }: Props) {
  const [text, setText] = useState("");
  const audioAvailable = canSpeak();

  useEffect(() => {
    speak(exercise.audio_nl);
  }, [exercise]);

  const submit = () => text.trim() && onResult(gradeExercise(exercise, text));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-bold text-farm-700/80">{STRINGS.listenPrompt}</h2>
      {audioAvailable ? (
        <button
          onClick={() => speak(exercise.audio_nl, { rate: 0.7 })}
          className="self-center rounded-2xl bg-white px-8 py-6 text-4xl shadow-sm active:bg-farm-100"
          aria-label={STRINGS.listenReplay}
        >
          🔊
        </button>
      ) : (
        // Playable without sound: show the sentence instead of blocking her.
        <p className="rounded-2xl bg-white px-5 py-4 text-center shadow-sm">
          <span className="mb-1 block text-xs font-bold text-farm-700/60">
            {STRINGS.noAudioWarning}
          </span>
          <span className="text-xl font-extrabold">{exercise.audio_nl}</span>
        </p>
      )}
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
