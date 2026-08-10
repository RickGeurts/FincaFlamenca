import { useEffect, type ReactNode } from "react";
import { STRINGS } from "../../content/strings.es";
import { WORDS_BY_ID } from "../../content";
import { canSpeak, speak } from "../../utils/speak";
import { useGameStore } from "../../state/store";
import { Modal } from "../Modal";

interface Props {
  wordId: string;
  emoji?: string;
  onClose: () => void;
  children?: ReactNode; // action buttons (water, feed, ...)
}

/**
 * Tap-to-learn word card: Dutch word with article, Spanish translation and
 * audio. Free, always available; every open logs an exposure.
 */
export function WordCardModal({ wordId, emoji, onClose, children }: Props) {
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
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-2 text-center">
        {emoji && <div className="text-5xl">{emoji}</div>}
        <button
          onClick={() => speak(nl)}
          className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-2xl font-extrabold shadow-sm active:bg-farm-100"
        >
          {canSpeak() && <span>🔊</span>}
          <span>{nl}</span>
        </button>
        <p className="text-lg font-bold text-farm-700/80">{word.es}</p>
        {canSpeak() && <p className="text-xs text-farm-700/50">{STRINGS.exposureHint}</p>}
        {children && <div className="mt-2 flex w-full flex-col gap-2">{children}</div>}
      </div>
    </Modal>
  );
}
