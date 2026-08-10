import { STRINGS } from "../../content/strings.es";
import type { Place } from "../../state/store";

export interface PlaceDef {
  id: Place;
  icon: string;
  /** Why it cannot be visited yet, or undefined when it is open. */
  lockedReason?: string;
  /** Words waiting to be reviewed; drawn as a badge, hidden at 0. */
  badge?: number;
}

/**
 * The village: the finca, the school, the market, the breeder and the town
 * hall are places she travels to, not tabs she switches. It floats over the
 * farm scene at the bottom of the screen.
 */
export function PlaceRail({
  places,
  current,
  onTravel,
}: {
  places: PlaceDef[];
  current: Place;
  onTravel: (place: Place) => void;
}) {
  return (
    <nav
      // The scrim only exists so white labels stay readable over a bright
      // green field; it must not swallow taps meant for the farm above it.
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 bg-gradient-to-t from-ink-950/50 to-transparent px-3 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4"
    >
      <span className="self-center text-[11px] font-black uppercase tracking-[0.14em] text-farm-50 [text-shadow:0_2px_6px_rgba(0,0,0,.4)]">
        {STRINGS.villageLabel}
      </span>
      <div className="pointer-events-auto flex justify-center gap-2.5">
        {places.map((place) => {
          const active = place.id === current;
          const locked = place.lockedReason !== undefined;
          return (
            <button
              key={place.id}
              onClick={() => !locked && onTravel(place.id)}
              aria-current={active ? "page" : undefined}
              aria-disabled={locked}
              title={place.lockedReason}
              className={`flex flex-col items-center gap-1.5 transition-transform duration-75 active:scale-95 ${
                locked ? "opacity-60" : ""
              }`}
            >
              <span className="relative">
                <span
                  className={`flex h-[60px] w-[60px] items-center justify-center rounded-[20px] text-[26px] ${
                    active ? "border-4 border-leaf-500 bg-farm-50" : "bg-farm-50/92"
                  }`}
                >
                  {place.icon}
                </span>
                {place.badge !== undefined && place.badge > 0 && (
                  <span className="absolute -right-1 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-[3px] border-farm-50 bg-badge px-1 text-xs font-black text-white">
                    {place.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-black text-farm-50 [text-shadow:0_1px_4px_rgba(0,0,0,.45)]">
                {STRINGS.places[place.id]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
