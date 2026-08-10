import { useState } from "react";
import { STRINGS } from "../content/strings.es";
import { play } from "../utils/sfx";
import { AvatarFigure } from "./avatar/AvatarFigure";
import { defaultAvatar } from "../game/avatar";

/**
 * The first minute. Four cards, in Spanish, that say what this is and — more
 * importantly — that nothing here can be lost or failed.
 *
 * It is skippable from the first card. Somebody who wants to see her farm
 * should be allowed to go and see her farm.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = STRINGS.welcomeSteps;
  const last = step === steps.length - 1;
  const card = steps[step];

  const next = () => {
    play("tap");
    if (last) onDone();
    else setStep(step + 1);
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-gradient-to-b from-farm-50 to-farm-200">
      <div className="flex justify-end p-4">
        {!last && (
          <button onClick={onDone} className="text-sm font-extrabold text-ink-500">
            {STRINGS.welcomeSkip}
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        {step === 0 ? (
          <AvatarFigure config={defaultAvatar()} size={140} />
        ) : (
          <span key={step} className="animate-pop-in text-[86px] leading-none">
            {card.emoji}
          </span>
        )}
        <h1 className="text-2xl font-black text-ink-900 [text-wrap:pretty]">{card.title}</h1>
        <p className="text-base font-bold leading-relaxed text-ink-700 [text-wrap:pretty]">
          {card.body}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full transition-all ${
                i === step ? "w-6 bg-leaf-500" : "w-2.5 bg-farm-200"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
        >
          {last ? STRINGS.welcomeStart : STRINGS.welcomeNext}
        </button>
      </div>
    </div>
  );
}
