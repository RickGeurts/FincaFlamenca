// How much room a pen offers and how much an animal takes up.
//
// Capacity used to be a number I picked; now it falls out of the animals' own
// body size — the same radius the farm uses to keep them from walking through
// each other. That means a new species cannot be given a capacity that
// disagrees with how it actually behaves in the pen, and `separate()` below is
// shared by the renderer and by the test that proves a full pen still fits.

/** Gap kept between the fence and the edge of an animal. */
export const PEN_EDGE = 0.12;

/**
 * How much elbow room each animal gets, as a multiple of the square its body
 * occupies. At 1 they would be wedged together.
 *
 * 5.3 is the highest setting that still fits three chickens in the smallest
 * pen, which is the size that has to feel right — and simulating a full pen
 * shows the difference plainly: at 4 the animals are in contact 91% of the
 * time and barely move, at 5.3 it is 49% and they get about their business.
 * Any lower and a big pen becomes a scrum; any higher and the small pen holds
 * two hens, which is not a pen worth buying. The test suite pins both ends.
 */
export const PEN_COMFORT = 5.3;

/** Closer than this and two animals are just touching, not overlapping. */
export const PEN_TOUCHING = 1e-4;

export interface Body {
  x: number;
  z: number;
  radius: number;
}

/** Side of the square an animal can actually stand in. */
export const penInnerSide = (size: number): number => Math.max(0, size - 2 * PEN_EDGE);

/** Floor space a pen offers, in world units squared. */
export const penSpace = (size: number): number => penInnerSide(size) ** 2;

/** Floor space one animal needs, including its elbow room. */
export const animalSpace = (radius: number): number => (2 * radius) ** 2 * PEN_COMFORT;

/** How many of one species fit in a pen of this size. */
export function capacityFor(size: number, radius: number): number {
  return Math.floor(penSpace(size) / animalSpace(radius));
}

/** How far from the middle of the pen an animal of this size may wander. */
export function roamBound(size: number, radius: number): number {
  return Math.max(0.05, size / 2 - radius - PEN_EDGE);
}

/**
 * Push overlapping animals apart and keep them inside the fence. One pass, so
 * the renderer can call it per frame; the test calls it repeatedly to settle a
 * full pen.
 *
 * Mutates the bodies in place, and reports whether anything still overlapped
 * when it started — which is how the test knows a pen is over capacity.
 */
export function separateOnce(bodies: Body[], size: number): boolean {
  let overlapped = false;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      const minimum = a.radius + b.radius;
      if (distance >= minimum) continue;
      // Clamping against the fence nudges neighbours back into contact by a
      // hair every pass, so only a real overlap counts as unsettled —
      // otherwise a perfectly comfortable pen never stops reporting one.
      if (minimum - distance > PEN_TOUCHING) overlapped = true;
      // Two animals exactly on top of each other have no direction to
      // separate along, so nudge them apart on a fixed axis instead.
      const nx = distance > 0.0001 ? dx / distance : 1;
      const nz = distance > 0.0001 ? dz / distance : 0;
      const push = (minimum - distance) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
    }
  }
  for (const body of bodies) {
    const bound = roamBound(size, body.radius);
    body.x = Math.min(bound, Math.max(-bound, body.x));
    body.z = Math.min(bound, Math.max(-bound, body.z));
  }
  return overlapped;
}

// ---------------------------------------------------------------------------
// Walking about
//
// Pushing bodies apart stops them overlapping, but on its own it makes them
// grind: two animals walking into each other keep driving forward while the
// push undoes it, so they judder in place. So they steer as well — they look
// ahead, lean away from whoever is in the way, and pass on a consistent side.
// The push stays underneath as a safety net that should rarely fire.

export interface Walker extends Body {
  /** Where it is heading. */
  tx: number;
  tz: number;
  /** Which way it faces, in radians. */
  angle: number;
  speed: number;
  /** Seconds left standing still. */
  pause: number;
  /** Seconds spent getting nowhere, used to give up on a blocked target. */
  blocked: number;
}

/** How far ahead an animal notices another, as a multiple of its own size. */
const LOOK_AHEAD = 3.2;
/** How hard it leans away from what it sees. */
const AVOID_STRENGTH = 1.9;
/** How briskly it swings towards a new heading. Low enough to curve, not snap. */
export const TURN_RATE = 3.4;
/** Close enough to the target to call it arrived. */
const ARRIVED = 0.07;
/** Give up on a target after this long without progress. */
const GIVE_UP_AFTER = 1.6;

/**
 * Advance every animal by one frame: steer, avoid, move, then separate.
 *
 * `nextTarget` is asked for somewhere new to go whenever one arrives or gives
 * up, which keeps the wandering itself out of here — the caller owns the
 * randomness, so this stays deterministic and testable.
 */
export function stepWalkers(
  walkers: Walker[],
  size: number,
  dt: number,
  nextTarget: (walker: Walker, index: number) => { x: number; z: number },
): void {
  const was = walkers.map((w) => ({ x: w.x, z: w.z }));
  const intended = new Array<number>(walkers.length).fill(0);

  for (let i = 0; i < walkers.length; i++) {
    const w = walkers[i];

    if (w.pause > 0) {
      w.pause -= dt;
      continue;
    }

    const toX = w.tx - w.x;
    const toZ = w.tz - w.z;
    const distance = Math.hypot(toX, toZ);

    if (distance < ARRIVED || w.blocked > GIVE_UP_AFTER) {
      const spot = nextTarget(w, i);
      w.tx = spot.x;
      w.tz = spot.z;
      w.blocked = 0;
      continue;
    }

    // Where it wants to go...
    let dirX = toX / distance;
    let dirZ = toZ / distance;

    // ...and who is in the way. Only what is ahead counts: you do not dodge
    // someone behind you.
    let avoidX = 0;
    let avoidZ = 0;
    let nearest = Infinity;
    for (let j = 0; j < walkers.length; j++) {
      if (j === i) continue;
      const o = walkers[j];
      const dx = o.x - w.x;
      const dz = o.z - w.z;
      const gap = Math.hypot(dx, dz);
      const reach = (w.radius + o.radius) * LOOK_AHEAD;
      if (gap > reach || gap < 1e-6) continue;
      if (dx * dirX + dz * dirZ <= 0) continue;

      nearest = Math.min(nearest, gap - (w.radius + o.radius));
      const urgency = 1 - gap / reach;
      // Lean away, and add a sideways push so they slide past each other
      // rather than meeting head-on and stalling. Always the same hand, so
      // two animals meeting pick opposite sides and clear each other.
      const awayX = -dx / gap;
      const awayZ = -dz / gap;
      avoidX += (awayX + awayZ) * urgency;
      avoidZ += (awayZ - awayX) * urgency;
    }

    if (avoidX !== 0 || avoidZ !== 0) {
      dirX += avoidX * AVOID_STRENGTH;
      dirZ += avoidZ * AVOID_STRENGTH;
      const length = Math.hypot(dirX, dirZ) || 1;
      dirX /= length;
      dirZ /= length;
    }

    // Turn towards where it now wants to go, at a walking pace.
    const wanted = Math.atan2(dirX, dirZ);
    let turn = wanted - w.angle;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    w.angle += turn * Math.min(1, TURN_RATE * dt);

    // Ease off only when a bump is imminent. Slowing down for anyone merely
    // nearby leaves a busy pen crawling, which reads as being stuck.
    const brakeFrom = w.radius * 0.4;
    const crowding =
      nearest < brakeFrom ? Math.max(0.45, nearest / brakeFrom) : 1;
    const step = w.speed * crowding * dt;
    w.x += Math.sin(w.angle) * step;
    w.z += Math.cos(w.angle) * step;
    intended[i] = step;
  }

  // Last line of defence. Twice, so the residue left by a frame of movement
  // is squeezed out rather than showing as a visible dent.
  separateOnce(walkers, size);
  separateOnce(walkers, size);

  // Whether an animal got anywhere can only be judged now: being shoved back
  // by a neighbour, or clamped against the fence, both happen after it moves.
  // Measuring the step it *intended* would make this counter never fire.
  for (let i = 0; i < walkers.length; i++) {
    const step = intended[i];
    if (step <= 0) continue;
    const w = walkers[i];
    const moved = Math.hypot(w.x - was[i].x, w.z - was[i].z);
    w.blocked = moved < step * 0.35 ? w.blocked + dt : 0;
  }
}

/**
 * Settle a pen: shuffle everyone apart until nothing overlaps, or give up.
 * Returns true when they found room — the definition of "not too crowded".
 */
export function settle(bodies: Body[], size: number, passes = 400): boolean {
  for (let i = 0; i < passes; i++) {
    if (!separateOnce(bodies, size)) return true;
  }
  // One last look: the final pass may itself have resolved the overlap.
  return !separateOnce(bodies, size);
}
