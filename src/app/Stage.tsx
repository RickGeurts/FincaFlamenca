import type { ReactNode } from "react";

/**
 * The frame the whole game sits in.
 *
 * Every screen is drawn for a phone, and that stays true on a desktop: rather
 * than stretching a one-column layout across a wide monitor, the game becomes
 * a card on a warm backdrop. She gets the same farm on both, and neither one
 * is the compromise.
 *
 * The card is also the positioning context for the screens inside it — they
 * lay themselves out with `absolute inset-0` and do their own scrolling, so
 * the page itself never scrolls and nothing can drift off the card.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="stage-backdrop">
      <div className="stage-card">{children}</div>
    </div>
  );
}
