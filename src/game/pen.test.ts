// Does a pen filled to its stated capacity actually have room?
//
// This is the guard for adding a new animal. Capacity is derived from the
// species' body radius, and these tests then *simulate* a full pen with the
// same push-apart rule the farm uses on screen. If a new species is given a
// radius that does not fit its stated capacity, the pen will fail to settle
// and this suite says so — no eyeballing required.

import { describe, expect, it } from "vitest";
import {
  PEN_COMFORT,
  PEN_TOUCHING,
  TURN_RATE,
  animalSpace,
  capacityFor,
  penSpace,
  roamBound,
  separateOnce,
  settle,
  stepWalkers,
  type Body,
  type Walker,
} from "./pen";
import { ANIMAL_SPECIES, DECOR, penCapacity } from "./economy";

const PEN_SIZES = DECOR.filter((d) => d.pen).map((d) => d.size!);

/** Deterministic starting positions, so a failure is always reproducible. */
function crowdIn(count: number, size: number, radius: number): Body[] {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const bound = roamBound(size, radius);
  return Array.from({ length: count }, () => ({
    x: (random() * 2 - 1) * bound,
    z: (random() * 2 - 1) * bound,
    radius,
  }));
}

describe("how much room a pen has", () => {
  it("grows with the pen, not in jumps", () => {
    for (const species of ANIMAL_SPECIES) {
      const counts = PEN_SIZES.map((size) => capacityFor(size, species.radius));
      const rising = counts.every((n, i) => i === 0 || n > counts[i - 1]);
      expect(rising, `${species.id}: ${counts.join(" -> ")}`).toBe(true);
    }
  });

  it("fits three chickens in the smallest pen", () => {
    const smallest = Math.min(...PEN_SIZES);
    expect(capacityFor(smallest, 0.22)).toBeGreaterThanOrEqual(3);
  });

  it("fits fewer of a bigger animal", () => {
    const sorted = [...ANIMAL_SPECIES].sort((a, b) => a.radius - b.radius);
    for (const size of PEN_SIZES) {
      const counts = sorted.map((s) => capacityFor(size, s.radius));
      const falling = counts.every((n, i) => i === 0 || n <= counts[i - 1]);
      expect(falling, `pen ${size}: ${counts.join(" -> ")}`).toBe(true);
    }
  });

  it("agrees with the shop's own figures", () => {
    for (const size of PEN_SIZES) {
      for (const species of ANIMAL_SPECIES) {
        expect(penCapacity(size, species.id)).toBe(capacityFor(size, species.radius));
      }
    }
  });
});

describe("a pen filled to capacity", () => {
  it("settles with nobody overlapping, for every species and size", () => {
    for (const size of PEN_SIZES) {
      for (const species of ANIMAL_SPECIES) {
        const count = capacityFor(size, species.radius);
        const bodies = crowdIn(count, size, species.radius);

        const settled = settle(bodies, size);
        expect(settled, `${count}x ${species.id} in a ${size}x${size} pen never settles`).toBe(true);

        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const gap = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].z - bodies[j].z);
            // The same tolerance the solver settles to, so the test and the
            // farm agree on what "not overlapping" means.
            expect(gap, `${species.id} overlap in ${size}x${size}`).toBeGreaterThanOrEqual(
              bodies[i].radius + bodies[j].radius - PEN_TOUCHING,
            );
          }
        }
      }
    }
  });

  it("keeps everyone inside the fence once settled", () => {
    for (const size of PEN_SIZES) {
      for (const species of ANIMAL_SPECIES) {
        const bodies = crowdIn(capacityFor(size, species.radius), size, species.radius);
        settle(bodies, size);
        const bound = roamBound(size, species.radius);
        for (const body of bodies) {
          expect(Math.abs(body.x)).toBeLessThanOrEqual(bound + 1e-6);
          expect(Math.abs(body.z)).toBeLessThanOrEqual(bound + 1e-6);
        }
      }
    }
  });

  it("cannot settle when pushed well past capacity", () => {
    // The guard has to fail for the right reason, or it proves nothing.
    const size = Math.min(...PEN_SIZES);
    const radius = 0.22;
    const tooMany = capacityFor(size, radius) * 6;
    expect(settle(crowdIn(tooMany, size, radius), size)).toBe(false);
  });
});

describe("animals walking around a busy pen", () => {
  const FRAME = 1 / 60;

  /** A pen of walkers, all heading somewhere, from a fixed seed. */
  function busyPen(count: number, size: number, radius: number) {
    let seed = 987654321;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const bound = roamBound(size, radius);
    const spot = () => ({ x: (random() * 2 - 1) * bound, z: (random() * 2 - 1) * bound });
    const walkers: Walker[] = Array.from({ length: count }, () => {
      const at = spot();
      const to = spot();
      return {
        ...at,
        tx: to.x,
        tz: to.z,
        angle: random() * Math.PI * 2,
        radius,
        speed: 0.28,
        pause: 0,
        blocked: 0,
      };
    });
    settle(walkers, size); // start them apart, as the farm does
    return { walkers, spot };
  }

  /** Run the pen for a while and report what happened. */
  function run(count: number, size: number, radius: number, seconds: number) {
    const { walkers, spot } = busyPen(count, size, radius);
    const start = walkers.map((w) => ({ x: w.x, z: w.z }));
    const travelled = walkers.map(() => 0);
    let worstOverlap = 0;
    let contactFrames = 0;

    for (let frame = 0; frame < seconds / FRAME; frame++) {
      const before = walkers.map((w) => ({ x: w.x, z: w.z }));
      stepWalkers(walkers, size, FRAME, () => spot());
      walkers.forEach((w, i) => {
        travelled[i] += Math.hypot(w.x - before[i].x, w.z - before[i].z);
      });

      let touching = false;
      for (let i = 0; i < walkers.length; i++) {
        for (let j = i + 1; j < walkers.length; j++) {
          const gap = Math.hypot(walkers[i].x - walkers[j].x, walkers[i].z - walkers[j].z);
          const overlap = walkers[i].radius + walkers[j].radius - gap;
          if (overlap > PEN_TOUCHING) touching = true;
          worstOverlap = Math.max(worstOverlap, overlap);
        }
      }
      if (touching) contactFrames++;
    }

    const frames = Math.floor(seconds / FRAME);
    return {
      walkers,
      travelled,
      worstOverlap,
      contactShare: contactFrames / frames,
      displaced: walkers.map((w, i) => Math.hypot(w.x - start[i].x, w.z - start[i].z)),
    };
  }

  it("never lets two animals end up inside each other", () => {
    const result = run(3, 2, 0.22, 20);
    // A frame of movement can dent them together before the push undoes it;
    // anything under a twentieth of a body is invisible.
    expect(result.worstOverlap).toBeLessThan(0.22 * 0.05);
  });

  it("keeps everyone actually walking, rather than jammed in a corner", () => {
    const result = run(3, 2, 0.22, 20);
    for (const [i, distance] of result.travelled.entries()) {
      // Twenty seconds of walking, minus pauses, is still a long way for a hen.
      expect(distance, `animal ${i} barely moved`).toBeGreaterThan(1);
    }
  });

  it("keeps a pen filled to the brim moving, even if it is busy", () => {
    const size = 4;
    const radius = 0.22;
    const result = run(capacityFor(size, radius), size, radius, 20);
    expect(result.worstOverlap).toBeLessThan(radius * 0.05);
    // Nobody is allowed to be pinned in place, which is what "stuck" means.
    for (const [i, distance] of result.travelled.entries()) {
      expect(distance, `animal ${i} is pinned`).toBeGreaterThan(0.5);
    }
  });

  it("leaves animals untouched at the loads she will actually see", () => {
    // Grinding against each other is exactly what steering had to stop. Half a
    // pen is the normal case; a pen packed to capacity is her own doing.
    for (const [count, size] of [[3, 2], [8, 4]] as const) {
      const result = run(count, size, 0.22, 20);
      expect(result.contactShare, `${count} in a ${size}x${size}`).toBeLessThan(0.15);
    }
  });

  it("gives up on a target it cannot reach instead of pushing forever", () => {
    // Walk an animal into the fence and keep aiming it through the fence. It
    // makes no headway, so after a moment it must pick a new errand instead of
    // pressing on — that pressing on is what read as being stuck.
    const radius = 0.22;
    const size = 2;
    const bound = roamBound(size, radius);
    const pinned: Walker = {
      x: bound, z: 0, tx: bound + 5, tz: 0,
      angle: Math.PI / 2, radius, speed: 0.28, pause: 0, blocked: 0,
    };

    const elsewhere = { x: -bound, z: -bound };
    for (let frame = 0; frame < 4 / FRAME; frame++) {
      stepWalkers([pinned], size, FRAME, () => elsewhere);
    }

    expect(pinned.tx, "never let go of an unreachable target").toBe(elsewhere.x);
  });

  it("turns rather than snapping round", () => {
    const size = 4;
    const radius = 0.22;
    const { walkers, spot } = busyPen(capacityFor(size, radius), size, radius);
    let worstTurn = 0;
    for (let frame = 0; frame < 10 / FRAME; frame++) {
      const before = walkers.map((w) => w.angle);
      stepWalkers(walkers, size, FRAME, () => spot());
      walkers.forEach((w, i) => {
        let turn = Math.abs(w.angle - before[i]);
        while (turn > Math.PI) turn = Math.abs(turn - Math.PI * 2);
        worstTurn = Math.max(worstTurn, turn);
      });
    }
    // A frame turns a share of the way round, so the most it can ever swing
    // is half a circle times that share.
    expect(worstTurn).toBeLessThan(Math.PI * TURN_RATE * FRAME * 1.05);
  });
});

describe("the push-apart rule the farm draws with", () => {
  it("separates two animals standing on each other", () => {
    const bodies: Body[] = [
      { x: 0, z: 0, radius: 0.3 },
      { x: 0, z: 0, radius: 0.3 },
    ];
    settle(bodies, 4);
    expect(Math.hypot(bodies[0].x - bodies[1].x, bodies[0].z - bodies[1].z)).toBeGreaterThan(0.59);
  });

  it("reports when it found nothing to do", () => {
    const bodies: Body[] = [
      { x: -1, z: 0, radius: 0.2 },
      { x: 1, z: 0, radius: 0.2 },
    ];
    expect(separateOnce(bodies, 4)).toBe(false);
  });
});

describe("the comfort setting", () => {
  it("leaves room to walk rather than wedging animals together", () => {
    // At 1 they would be touching; the pen should feel lived-in, not packed.
    expect(PEN_COMFORT).toBeGreaterThan(2);
  });

  it("means a pen is never filled more than a fraction of its floor", () => {
    for (const size of PEN_SIZES) {
      for (const species of ANIMAL_SPECIES) {
        const used = capacityFor(size, species.radius) * animalSpace(species.radius);
        expect(used).toBeLessThanOrEqual(penSpace(size) + 1e-9);
      }
    }
  });
});
