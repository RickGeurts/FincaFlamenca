import { useEffect, useState, type ReactNode } from "react";
import { STRINGS } from "../../content/strings.es";
import { WORDS_BY_ID } from "../../content";
import { grade } from "../../learning/grader";
import { canSpeak, speak } from "../../utils/speak";
import { canListen, listenOnce } from "../../utils/listen";
import { useGameStore } from "../../state/store";
import { PropThumb } from "./PropThumb";
import type { ThumbKind } from "./three/thumbnail";

interface Props {
  wordId: string;
  /** Which model to draw at the top of the card. */
  thumb?: { kind: ThumbKind; id: string; emoji: string };
  /** A line of state about this object: time left, happiness, ... */
  context?: { label: string; value: string };
  onClose: () => void;
  children?: ReactNode; // action buttons (water, feed, ...)
}

/**
 * Tap-to-learn word card: the object, its Dutch word with the article, the
 * Spanish translation, audio, and a sentence it lives in. Free, always
 * available; every open logs an exposure.
 */
export function WordCardModal({ wordId, thumb, context, onClose, children }: Props) {
  const logExposure = useGameStore((s) => s.logExposure);
  const word = WORDS_BY_ID.get(wordId);

  useEffect(() => {
    logExposure(wordId);
    // once per open, not per re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId]);

  if (!word) return null;
  const nl = word.article ? `${word.article} ${word.nl}` : word.nl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/45 p-5 pt-[max(60px,12vh)]"
      onClick={onClose}
    >
      <div
        className="animate-fade-up flex w-full max-w-sm flex-col items-center gap-3.5 rounded-[30px] bg-farm-50 p-[22px] shadow-[0_24px_60px_rgba(0,0,0,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={STRINGS.close}
          className="self-end text-lg font-black text-ink-400"
        >
          ✕
        </button>

        {thumb && <PropThumb kind={thumb.kind} id={thumb.id} emoji={thumb.emoji} size={70} />}

        <div className="flex flex-col items-center gap-1">
          <span className="text-center text-[34px] font-black leading-tight text-ink-900">
            {nl}
          </span>
          <span className="text-lg font-extrabold text-ink-500">{word.es}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {canSpeak() && (
            <button
              onClick={() => speak(nl)}
              className="rounded-2xl bg-leaf-500 px-5 py-3 font-black text-[15px] text-white active:bg-leaf-600"
            >
              {STRINGS.listen}
            </button>
          )}
          <SayItButton target={word.nl} />
        </div>

        {word.example_nl && (
          <div className="flex w-full flex-col gap-2 rounded-[18px] bg-farm-100 p-4">
            <span className="text-[13px] font-extrabold text-ink-500">{STRINGS.inASentence}</span>
            <button
              onClick={() => speak(word.example_nl!)}
              className="text-left text-base font-black text-ink-900"
            >
              {word.example_nl}
            </button>
            {word.example_es && (
              <span className="text-[13px] font-bold text-ink-500">{word.example_es}</span>
            )}
          </div>
        )}

        {context && (
          <div className="flex w-full items-center justify-between rounded-[18px] border-2 border-farm-200 bg-white px-4 py-3">
            <span className="text-[13px] font-extrabold text-ink-700">{context.label}</span>
            <span className="text-base font-black text-farm-700">{context.value}</span>
          </div>
        )}

        {children && <div className="flex w-full flex-col gap-2.5">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Say the word out loud and hear whether it came through. Only appears where
 * the browser can actually listen, and never awards or withholds anything —
 * getting it "wrong" costs nothing at all.
 */
function SayItButton({ target }: { target: string }) {
  const [state, setState] = useState<"idle" | "listening" | "good" | "again">("idle");

  if (!canListen()) return null;

  const tryIt = async () => {
    setState("listening");
    const heard = await listenOnce();
    if (heard === null) {
      setState("idle");
      return;
    }
    // The same tolerant comparison the written exercises use, so a spoken
    // near-miss counts the way a typed one does.
    setState(grade(heard, [target]).correct ? "good" : "again");
  };

  return (
    <button
      onClick={() => void tryIt()}
      disabled={state === "listening"}
      className={`rounded-2xl px-5 py-3 font-black text-[15px] ${
        state === "good"
          ? "bg-ok-bg text-ok-text"
          : state === "again"
            ? "bg-warn-bg text-warn-text"
            : "bg-farm-100 text-farm-700"
      }`}
    >
      {state === "listening"
        ? STRINGS.sayItListening
        : state === "good"
          ? STRINGS.sayItGood
          : state === "again"
            ? STRINGS.sayItAgain
            : STRINGS.sayIt}
    </button>
  );
}
