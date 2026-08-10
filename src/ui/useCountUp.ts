import { useEffect, useState } from "react";

/**
 * Count a reward up instead of stamping it on screen.
 *
 * A number that climbs is the difference between being told what you earned
 * and watching yourself earn it. Respects a reduced-motion preference by
 * arriving at the answer immediately.
 */
export function useCountUp(target: number, ms = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    const still =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      setValue(target);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      // Ease out, so it slows into the final number rather than stopping dead.
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}
