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

/** Slow enough to pick the words apart, without turning into a robot. */
const SLOW_RATE = 0.55;

export function ListenCard({ exercise, locked, onResult }: Props) {
  const [text, setText] = useState("");
  const audioAvailable = canSpeak();

  useEffect(() => {
    speak(exercise.audio_nl);
  }, [exercise]);

  const submit = () => text.trim() && onResult(gradeExercise(exercise, text));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      {audioAvailable ? (
        <>
          <button
            onClick={() => speak(exercise.audio_nl)}
            aria-label={STRINGS.listenReplay}
            className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-leaf-500 text-5xl shadow-[0_10px_24px_rgba(70,100,20,.32)] active:bg-leaf-600"
          >
            🔊
          </button>
          <div className="flex items-center gap-3 text-sm font-extrabold text-ink-500">
            <button onClick={() => speak(exercise.audio_nl)}>{STRINGS.listenReplay}</button>
            <span aria-hidden>·</span>
            <button onClick={() => speak(exercise.audio_nl, { rate: SLOW_RATE })}>
              {STRINGS.listenSlow}
            </button>
          </div>
        </>
      ) : (
        // Playable without sound: show the sentence instead of blocking her.
        <p className="text-center">
          <span className="mb-1 block text-xs font-black text-ink-400">
            {STRINGS.noAudioWarning}
          </span>
          <span className="text-xl font-black text-ink-900">{exercise.audio_nl}</span>
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
        className="w-full resize-none border-b-[3px] border-farm-200 bg-transparent px-1 py-3 text-xl font-black text-ink-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none"
      />
      <CheckButton disabled={locked || !text.trim()} onClick={submit} />
    </div>
  );
}
