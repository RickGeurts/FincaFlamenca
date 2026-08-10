// A shop preview goes wrong silently: a badly framed camera does not throw, it
// just hands back a picture with the roof cut off, or an empty square. The
// drawing itself needs a real browser, but the framing is plain arithmetic and
// can be checked here.

import { describe, expect, it } from "vitest";
import { FOV, framing } from "./thumbnail";
import { DECOR } from "../../../game/economy";

/** The angular half-width of the picture. */
const HALF_FOV = (FOV / 2) * (Math.PI / 180);

/** Every size a shop preview has to cope with: a pebble up to a 6x6 pen. */
const RADII = [0.05, 0.2, 0.5, 1, 2.2, 4.3];

describe("framing a shop preview", () => {
  it("fits the whole object in the picture", () => {
    for (const radius of RADII) {
      const { distance } = framing(radius);
      // How wide the object looks from there. Inside the lens, or it is cropped.
      const subtended = Math.asin(Math.min(1, radius / distance));
      expect(subtended, `radius ${radius} does not fit`).toBeLessThan(HALF_FOV);
    }
  });

  it("does not frame anything so tightly that it touches the edge", () => {
    for (const radius of RADII) {
      const { distance } = framing(radius);
      const subtended = Math.asin(Math.min(1, radius / distance));
      // ...but it should still fill the frame: a model floating in a sea of
      // white tells her no more than the emoji it replaced.
      expect(subtended, `radius ${radius} is lost in the frame`).toBeGreaterThan(HALF_FOV * 0.7);
    }
  });

  it("stands outside the object rather than inside it", () => {
    for (const radius of RADII) {
      expect(framing(radius).distance).toBeGreaterThan(radius);
    }
  });

  it("clips nothing away at either end", () => {
    for (const radius of RADII) {
      const { distance, near, far } = framing(radius);
      expect(near, `near plane cuts into radius ${radius}`).toBeLessThan(distance - radius);
      expect(near, "near plane must stay positive").toBeGreaterThan(0);
      expect(far, `far plane cuts off radius ${radius}`).toBeGreaterThan(distance + radius);
    }
  });

  it("copes with a flat object, which has no thickness to frame", () => {
    // Paths and ponds are all but two-dimensional; a zero radius would put the
    // camera inside them and render nothing at all.
    const flat = framing(0);
    expect(flat.distance).toBeGreaterThan(0.05);
    expect(Number.isFinite(flat.distance)).toBe(true);
  });

  it("covers the biggest thing the shop sells", () => {
    // The largest pen, corner to corner and then some. If a bigger one is ever
    // added, this is the reminder that the previews were only checked to here.
    const biggest = Math.max(...DECOR.map((d) => d.size ?? 1));
    const corner = (biggest * Math.SQRT2) / 2;
    expect(Math.max(...RADII), `pens grew to ${biggest}; widen RADII`).toBeGreaterThanOrEqual(
      corner,
    );
  });
});
