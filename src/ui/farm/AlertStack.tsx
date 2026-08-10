import { STRINGS } from "../../content/strings.es";

export interface FarmAlert {
  id: string;
  emoji: string;
  /** Who or what needs attention. */
  title: string;
  /** What is the matter, in Dutch for chores and Spanish for the rest. */
  detail: string;
  tone: "warn" | "neutral";
  onTap: () => void;
}

/** Never more than this on screen; the rest are counted. */
const VISIBLE = 2;

/**
 * What the farm wants from her, top right. Two cards at most: a wall of
 * notifications is a chore list, and this game does not have chore lists.
 */
export function AlertStack({ alerts }: { alerts: FarmAlert[] }) {
  if (alerts.length === 0) return null;
  const shown = alerts.slice(0, VISIBLE);
  const hidden = alerts.length - shown.length;

  return (
    <div className="absolute right-3.5 top-24 z-20 flex w-[150px] flex-col gap-2.5">
      {shown.map((alert) => (
        <button
          key={alert.id}
          onClick={alert.onTap}
          className={`animate-fade-up flex items-center gap-2 rounded-[18px] p-2.5 text-left transition-transform duration-75 active:scale-95 ${
            alert.tone === "warn"
              ? "border-2 border-warn-border bg-warn-bg"
              : "bg-farm-50/94 shadow-[0_5px_16px_rgba(90,50,10,.16)]"
          }`}
        >
          <span className="text-[22px]">{alert.emoji}</span>
          <span className="flex min-w-0 flex-col leading-[1.2]">
            <span
              className={`truncate text-xs font-black ${
                alert.tone === "warn" ? "text-warn-text" : "text-ink-900"
              }`}
            >
              {alert.title}
            </span>
            <span
              className={`truncate text-[11px] font-bold ${
                alert.tone === "warn" ? "text-warn-text-2" : "text-ink-500"
              }`}
            >
              {alert.detail}
            </span>
          </span>
        </button>
      ))}
      {hidden > 0 && (
        <span className="self-end rounded-full bg-farm-50/94 px-2.5 py-1 text-[11px] font-black text-ink-500">
          {STRINGS.alertsMore(hidden)}
        </span>
      )}
    </div>
  );
}
