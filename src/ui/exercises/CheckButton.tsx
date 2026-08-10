import { createContext, useContext, useEffect } from "react";
import { STRINGS } from "../../content/strings.es";

/**
 * How an exercise card hands its «Comprobar» button to the lesson screen.
 *
 * The button belongs at the foot of the screen, under the card, not inside it
 * — but only the card knows whether an answer is ready and what checking it
 * means. So the card goes on rendering <CheckButton> exactly where it always
 * did, and that button draws nothing: it passes the job upwards and the lesson
 * screen puts a single primary button in the right place. No exercise had to
 * change for the layout to.
 */
export interface CheckAction {
  disabled: boolean;
  onClick: () => void;
}

interface Footer {
  publish: (action: CheckAction | null) => void;
}

const FooterContext = createContext<Footer | null>(null);

export const CheckFooterProvider = FooterContext.Provider;

export function CheckButton({ disabled, onClick }: CheckAction) {
  const footer = useContext(FooterContext);

  useEffect(() => {
    footer?.publish({ disabled, onClick });
    // The handler is a fresh closure every render, so this runs every render;
    // `publish` keeps it in a ref and only re-renders when `disabled` flips.
  });

  useEffect(() => {
    return () => footer?.publish(null);
  }, [footer]);

  // Outside a lesson (a chore question, say) the button still has to exist.
  if (footer) return null;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-auto h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
    >
      {STRINGS.check}
    </button>
  );
}
