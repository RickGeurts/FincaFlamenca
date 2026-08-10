import type { Exercise } from "../content/types";

/** One icon per kind of exercise, so a glance at the path tells her what is coming. */
export const TYPE_ICON: Record<Exercise["type"], string> = {
  choice: "❓",
  translate: "✍️",
  listen: "🎧",
  assemble: "🧩",
  match: "🔗",
};

/**
 * El sendero: the session as a path with visible stops. A card that simply
 * replaces itself gives no sense of getting anywhere; a path shows how far she
 * has come and how much is left, and ends at a present.
 */
export function LessonPath({
  exercises,
  index,
}: {
  exercises: Exercise[];
  index: number;
}) {
  return (
    <div className="relative flex w-[58px] shrink-0 flex-col items-center justify-between py-2">
      <span className="absolute inset-y-0 w-1 rounded-full bg-farm-100" />
      {exercises.map((exercise, i) => {
        if (i < index) {
          return (
            <span
              key={i}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-leaf-500 text-[17px] font-black text-white"
            >
              ✓
            </span>
          );
        }
        if (i === index) {
          return (
            <span
              key={i}
              className="animate-pop-in relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-4 border-warn-bg bg-farm-600 text-[22px]"
              aria-current="step"
            >
              {TYPE_ICON[exercise.type]}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-farm-100 text-[17px] opacity-70 grayscale"
          >
            {TYPE_ICON[exercise.type]}
          </span>
        );
      })}
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-dashed border-warn-border bg-warn-bg text-[19px]">
        🎁
      </span>
    </div>
  );
}
