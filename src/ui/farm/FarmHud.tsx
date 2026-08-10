import { STRINGS } from "../../content/strings.es";
import type { Player } from "../../game/types";

/**
 * What she has, always in view: coins, experience and streak, on a capsule
 * that stays readable over any tile colour. The cog opens everything that is
 * a setting rather than a game action.
 */
export function FarmHud({ player, onSettings }: { player: Player; onSettings: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2.5 bg-gradient-to-b from-ink-950/40 to-transparent px-4 pb-3 pt-3.5">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-farm-50/95 px-4 py-2 text-sm font-black tabular-nums text-ink-900 shadow-[0_5px_16px_rgba(90,50,10,.16)]">
        <span>🪙 {player.munten}</span>
        <span className="text-farm-200">|</span>
        <span>⭐ {player.xp}</span>
        <span className="text-farm-200">|</span>
        <span className="text-farm-700">🔥 {player.streak.days}</span>
      </div>
      <button
        onClick={onSettings}
        aria-label={STRINGS.settings}
        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-farm-50/95 text-[19px] shadow-[0_5px_16px_rgba(90,50,10,.16)] transition-transform duration-75 active:scale-95"
      >
        ⚙️
      </button>
    </div>
  );
}
