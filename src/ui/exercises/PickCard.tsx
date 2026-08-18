import { useEffect, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { PickExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { gradeExercise } from "../../learning/lesson";
import { canSpeak, speak } from "../../utils/speak";
import { CheckButton } from "./CheckButton";

interface Props {
  exercise: PickExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

/** Slow enough to pick the word apart, without turning into a robot. */
const SLOW_RATE = 0.55;

/**
 * The daily review's question card: one word, a few options, asked from
 * whichever side the review chose today.
 *
 * The options arrive in the order they are meant to be shown — the session
 * builder shuffles, because that belongs with the tested logic and not in a
 * component that re-renders. `de`/`het` are the exception it protects: they
 * stay in that order every single time, so her eye stops having to hunt for
 * which side is which and the only question left is the one being asked.
 */
export function PickCard({ exercise, locked, onResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const listening = exercise.ask === "listen";
  const audioAvailable = canSpeak();
  const speakable = exercise.prompt_lang === "nl" && audioAvailable;

  useEffect(() => {
    if (listening) speak(exercise.prompt);
  }, [exercise, listening]);

  // Two options are the article question: side by side, they read as one
  // choice between two, rather than a list that happens to be short.
  const paired = exercise.options.length === 2;

  /**
   * The Dutch, written out once she has answered — but only for the questions
   * that kept it off the screen. A listening question she gets right would
   * otherwise go by without her ever seeing how the word is spelled, and a
   * backwards question showed her nothing but Spanish. Where the Dutch was the
   * prompt all along there is nothing left to reveal.
   */
  const spellOut = !locked
    ? null
    : listening
      ? exercise.prompt
      : exercise.prompt_lang === "es"
        ? exercise.answer
        : null;

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      {listening && audioAvailable ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => speak(exercise.prompt)}
            aria-label={STRINGS.listenReplay}
            className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-leaf-500 text-5xl shadow-[0_10px_24px_rgba(70,100,20,.32)] active:bg-leaf-600"
          >
            🔊
          </button>
          <div className="flex items-center gap-3 text-sm font-extrabold text-ink-500">
            <button onClick={() => speak(exercise.prompt)}>{STRINGS.listenReplay}</button>
            <span aria-hidden>·</span>
            <button onClick={() => speak(exercise.prompt, { rate: SLOW_RATE })}>
              {STRINGS.listenSlow}
            </button>
          </div>
        </div>
      ) : speakable ? (
        <button
          onClick={() => speak(exercise.prompt)}
          className="self-center text-center text-[21px] font-black text-ink-900"
        >
          <span className="mr-2">🔊</span>
          {exercise.prompt}
        </button>
      ) : (
        // Spanish, or a device with no Dutch voice: plain text, not a button
        // that promises a sound it cannot make.
        <p className="self-center text-center text-[21px] font-black text-ink-900">
          {exercise.prompt}
        </p>
      )}

      <div className={paired ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5"}>
        {exercise.options.map((option) => (
          <button
            key={option}
            disabled={locked}
            onClick={() => setSelected(option)}
            className={`rounded-2xl border-2 border-b-[5px] bg-white px-4 py-3.5 font-black text-[17px] text-ink-900 ${
              paired ? "text-center" : "text-left"
            } ${selected === option ? "border-leaf-500" : "border-farm-200"}`}
          >
            {option}
          </button>
        ))}
      </div>

      {spellOut && (
        <button
          onClick={() => audioAvailable && speak(spellOut)}
          className="self-center rounded-2xl bg-farm-100 px-4 py-2.5 text-center text-lg font-black text-farm-700"
        >
          {audioAvailable && <span className="mr-2">🔊</span>}
          {spellOut}
        </button>
      )}

      <CheckButton
        disabled={locked || selected === null}
        onClick={() => selected !== null && onResult(gradeExercise(exercise, selected))}
      />
    </div>
  );
}
