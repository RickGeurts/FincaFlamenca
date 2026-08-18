import { STRINGS } from "../../content/strings.es";
import { WORDS_BY_ID } from "../../content";
import {
  COLORS,
  availableColors,
  type ColorId,
  type WearableDef,
} from "../../game/avatar";
import { canSpeak, speak } from "../../utils/speak";
import { useGameStore } from "../../state/store";
import { play } from "../../utils/sfx";

/**
 * La prenda: one garment, close up. The word with its article and audio, a
 * sentence it lives in, the colours it comes in — and only then a price.
 *
 * Trying it on is free and happens the moment she opens this. Buying is the
 * only thing that costs, and it is the only button that mentions munten.
 */
export function ItemSheet({
  item,
  colorId,
  onColor,
  onClose,
}: {
  item: WearableDef;
  colorId: ColorId;
  onColor: (colorId: ColorId) => void;
  onClose: () => void;
}) {
  const munten = useGameStore((s) => s.player.munten);
  const owned = useGameStore((s) => s.player.ownedItems.includes(item.id));
  const unlockedUnits = useGameStore((s) => s.player.unlockedUnits);
  const buyWearable = useGameStore((s) => s.buyWearable);

  const word = WORDS_BY_ID.get(item.word);
  const nl = word ? (word.article ? `${word.article} ${word.nl}` : word.nl) : item.id;
  const affordable = munten >= item.price;
  const colours = availableColors(unlockedUnits);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/45"
      onClick={onClose}
    >
      <div
        className="animate-fade-up flex max-h-full w-full flex-col gap-3.5 overflow-y-auto rounded-t-[30px] bg-farm-50 p-[22px] pb-8 shadow-[0_-12px_40px_rgba(0,0,0,.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[30px] font-black leading-tight text-ink-900">{nl}</span>
            <span className="text-base font-extrabold text-ink-500">{word?.es}</span>
          </span>
          <button
            onClick={onClose}
            aria-label={STRINGS.close}
            className="text-lg font-black text-ink-400"
          >
            ✕
          </button>
        </div>

        {canSpeak() && (
          <button
            onClick={() => speak(nl)}
            className="self-start rounded-2xl bg-leaf-500 px-5 py-3 font-black text-[15px] text-white active:bg-leaf-600"
          >
            {STRINGS.listen}
          </button>
        )}

        {word?.example_nl && (
          <div className="flex flex-col gap-2 rounded-[18px] bg-farm-100 p-4">
            <span className="text-[13px] font-extrabold text-ink-500">{STRINGS.inASentence}</span>
            <button
              onClick={() => speak(word.example_nl!)}
              className="text-left text-base font-black text-ink-900"
            >
              {word.example_nl}
            </button>
            <span className="text-[13px] font-bold text-ink-500">{word.example_es}</span>
          </div>
        )}

        {item.colourable ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">
              {STRINGS.itemColor}
            </span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((colour) => {
                const open = colours.some((c) => c.id === colour.id);
                return (
                  <button
                    key={colour.id}
                    disabled={!open}
                    onClick={() => onColor(colour.id)}
                    title={open ? colour.id : STRINGS.lockedUnit(colour.unit)}
                    className={`h-11 w-11 rounded-full border-4 disabled:opacity-30 ${
                      colorId === colour.id ? "border-leaf-500" : "border-farm-200"
                    }`}
                    style={{ background: colour.hex }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-[13px] font-bold text-ink-500">{STRINGS.noColourHere}</p>
        )}

        {owned ? (
          <p className="rounded-[18px] bg-ok-bg px-4 py-3 text-center text-sm font-black text-ok-text">
            {STRINGS.ownedLabel} ✓
          </p>
        ) : (
          <>
            <p className="text-[13px] font-bold text-ink-500 [text-wrap:pretty]">
              {STRINGS.buyAddsToReview}
            </p>
            <button
              disabled={!affordable}
              onClick={() => {
                play("buy");
                buyWearable(item.id);
                onClose();
              }}
              className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
            >
              {STRINGS.buyIt} · {item.price} 🪙
            </button>
          </>
        )}
      </div>
    </div>
  );
}
