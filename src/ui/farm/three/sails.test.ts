// The windmill's sails are found by measurement, not by a named mesh, so this
// checks the measurements still describe the art: the split must isolate six
// evenly spaced arms and leave the tower behind.

import { beforeAll, describe, expect, it } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { DECOR_PROP, MODEL_URL, SAILS } from "./props";

/** Vertices of the windmill, in the space the game renders it in. */
const points: [number, number, number][] = [];

beforeAll(async () => {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(`public${MODEL_URL}`);
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const node = scene.listChildren().find((n) => n.getName() === DECOR_PROP.molen[0].node);
  expect(node, "windmill missing from the pack").toBeDefined();

  const m = node!.getWorldMatrix();
  for (const prim of node!.getMesh()!.listPrimitives()) {
    const pos = prim.getAttribute("POSITION")!;
    for (let i = 0; i < pos.getCount(); i++) {
      const [x, y, z] = pos.getElement(i, []) as number[];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      points.push([
        (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
      ]);
    }
  }
});

function selection() {
  const s = SAILS.molen;
  const ys = points.map((p) => p[1]);
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[2]);
  const minY = Math.min(...ys);
  const height = Math.max(...ys) - minY;
  const hub = {
    x: (Math.max(...xs) + Math.min(...xs)) / 2,
    y: minY + height * s.fy,
    z: (Math.max(...zs) + Math.min(...zs)) / 2 + height * s.fz,
  };
  const sail = points.filter((p) => {
    const r = Math.hypot(p[0] - hub.x, p[1] - hub.y);
    return Math.abs(p[2] - hub.z) < height * s.fSlice && r > height * s.fInner && r < height * s.fOuter;
  });
  return { sail, hub, height };
}

describe("finding the windmill sails", () => {
  it("selects a decent chunk of the mesh", () => {
    const { sail } = selection();
    expect(sail.length).toBeGreaterThan(200);
    expect(sail.length, "grabbing most of the model means the tower came too")
      .toBeLessThan(points.length * 0.6);
  });

  it("finds six arms, evenly spaced", () => {
    const { sail, hub } = selection();
    const BINS = 36; // 10° per bin
    const hist = new Array(BINS).fill(0);
    for (const p of sail) {
      const angle = Math.atan2(p[1] - hub.y, p[0] - hub.x);
      hist[Math.floor(((angle + Math.PI) / (2 * Math.PI)) * BINS) % BINS]++;
    }
    const peak = Math.max(...hist);
    // An arm is a run of bins well above the gaps between arms.
    let arms = 0;
    for (let i = 0; i < BINS; i++) {
      const here = hist[i] > peak * 0.4;
      const before = hist[(i - 1 + BINS) % BINS] > peak * 0.4;
      if (here && !before) arms++;
    }
    expect(arms, "a windmill should have evenly spaced sails").toBe(6);
  });

  it("keeps the tower out of the selection", () => {
    const { sail, hub, height } = selection();
    // Nothing selected may sit on the tower axis.
    for (const p of sail) {
      const r = Math.hypot(p[0] - hub.x, p[1] - hub.y);
      expect(r).toBeGreaterThan(height * SAILS.molen.fInner);
    }
  });

  it("turns slowly enough to read as a mill, not a fan", () => {
    expect(SAILS.molen.speed).toBeGreaterThan(0.01);
    expect(SAILS.molen.speed).toBeLessThan(0.2);
  });
});
