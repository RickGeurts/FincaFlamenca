// Seedable RNG (mulberry32) so game/learning logic stays deterministic in
// tests. UI code can use `randomRng()` for a time-seeded instance.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A time-seeded generator for UI code.
 *
 * The counter matters: `Date.now()` only moves once a millisecond, so two
 * generators made in the same render would otherwise be seeded identically and
 * deal the very same sequence. That is how both columns of a match exercise
 * ended up in the same order, with every word beside its own translation.
 */
let sequence = 0;

export function randomRng(): Rng {
  sequence = (sequence + 1) | 0;
  return mulberry32((Date.now() ^ Math.imul(sequence, 0x9e3779b1)) >>> 0);
}
