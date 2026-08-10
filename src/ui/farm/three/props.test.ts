// The shop can only sell what the asset pack actually contains. These checks
// catch a decoration wired to a mesh name that isn't in farm-props.glb, which
// would otherwise show up as an invisible purchase.

import { beforeAll, describe, expect, it } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import {
  ANIMAL_HEIGHT,
  ANIMAL_PROP,
  CHIMNEYS,
  CROP_PROP,
  DECOR_PROP,
  MODEL_URL,
  PROP,
  getDecorProp,
} from "./props";
import { ANIMAL_SPECIES, CROPS, DECOR } from "../../../game/economy";


/** Read straight from the shipped file, so this can't drift from the art. */
const PACK_NODES = new Set<string>();
/** Raw bounding-box size per node, mirroring scripts/measure-props.mjs. */
const SIZES = new Map<string, { w: number; h: number; d: number }>();

beforeAll(async () => {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(`public${MODEL_URL}`);
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

  for (const node of doc.getRoot().listNodes()) {
    const name = node.getName();
    if (name) PACK_NODES.add(name);
  }

  for (const node of scene.listChildren()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    // The extract script bakes each prop's world transform into its node, and
    // that includes the pack's Z-up to Y-up rotation. Measuring the raw mesh
    // would report height and depth swapped, so transform the corners first —
    // this is what Box3.setFromObject does at runtime.
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const a = pos.getMin([]) as number[];
      const b = pos.getMax([]) as number[];
      for (const [x, y, z] of [
        [a[0], a[1], a[2]], [b[0], a[1], a[2]], [a[0], b[1], a[2]], [a[0], a[1], b[2]],
        [b[0], b[1], a[2]], [b[0], a[1], b[2]], [a[0], b[1], b[2]], [b[0], b[1], b[2]],
      ]) {
        const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
        const p = [
          (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
          (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
          (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
        ];
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], p[i]);
          max[i] = Math.max(max[i], p[i]);
        }
      }
    }
    SIZES.set(node.getName(), {
      w: max[0] - min[0],
      h: max[1] - min[1],
      d: max[2] - min[2],
    });
  }

  expect(PACK_NODES.size, "no nodes read from the model").toBeGreaterThan(0);
});

/** The same fit useProp() applies: smallest of the height and footprint scales. */
function fittedSize(part: { node: string; height?: number; footprint: number }) {
  const size = SIZES.get(part.node);
  if (!size) return null;
  const candidates = [part.footprint / Math.max(size.w, size.d)];
  if (part.height) candidates.push(part.height / size.h);
  const scale = Math.min(...candidates);
  return { w: size.w * scale, h: size.h * scale, d: size.d * scale };
}

describe("prop mapping", () => {
  it("every named prop exists in the pack", () => {
    for (const [key, value] of Object.entries(PROP)) {
      // Most entries are one mesh; smoke is a set of cloud meshes.
      for (const node of Array.isArray(value) ? value : [value]) {
        expect(PACK_NODES.has(node), `PROP.${key} -> ${node}`).toBe(true);
      }
    }
  });

  it("knows where the chimney is on every model that smokes", () => {
    for (const [kind, chimney] of Object.entries(CHIMNEYS)) {
      expect(DECOR_PROP[kind], `${kind} has no model`).toBeDefined();
      // Offsets are fractions of the model, so they belong inside ±0.5.
      expect(Math.abs(chimney.fx), `${kind} chimney is off the model`).toBeLessThan(0.5);
      expect(Math.abs(chimney.fz), `${kind} chimney is off the model`).toBeLessThan(0.5);
    }
  });

  it("every crop and animal model exists in the pack", () => {
    for (const node of Object.values(CROP_PROP)) expect(PACK_NODES.has(node), node).toBe(true);
    for (const node of Object.values(ANIMAL_PROP)) expect(PACK_NODES.has(node), node).toBe(true);
  });

  it("every shop decoration has parts, all of them real meshes", () => {
    for (const item of DECOR) {
      const parts = DECOR_PROP[item.id];
      expect(parts, `decor "${item.id}" has no model`).toBeDefined();
      expect(parts.length).toBeGreaterThan(0);
      for (const part of parts) {
        expect(PACK_NODES.has(part.node), `${item.id} -> ${part.node}`).toBe(true);
      }
    }
  });

  it("keeps every decoration inside the cells it occupies", () => {
    for (const item of DECOR) {
      const cells = item.size ?? 1;
      // Big buildings have always overhung a little; that tolerance is the 0.35.
      const limit = cells / 2 + 0.35;
      for (const part of DECOR_PROP[item.id]) {
        const fitted = fittedSize(part);
        expect(fitted, `${item.id}: no measurable mesh`).not.toBeNull();
        // A quarter-turned part is long along Z instead of X.
        const turned = Math.abs(Math.sin(part.rotY ?? 0)) > 0.5;
        const halfX = (turned ? fitted!.d : fitted!.w) / 2;
        const halfZ = (turned ? fitted!.w : fitted!.d) / 2;
        const reach = Math.max(Math.abs(part.x ?? 0) + halfX, Math.abs(part.z ?? 0) + halfZ);
        expect(reach, `${item.id} overflows its footprint`).toBeLessThanOrEqual(limit);
      }
    }
  });

  it("gives every decoration a footprint to scale against", () => {
    for (const item of DECOR) {
      for (const part of DECOR_PROP[item.id]) {
        expect(part.footprint, `${item.id} needs a footprint`).toBeGreaterThan(0);
      }
    }
  });

  it("does not sell two decorations that render as the same thing", () => {
    const signature = DECOR.map((item) =>
      DECOR_PROP[item.id]
        .map((p) => p.node)
        .sort()
        .join("+"),
    );
    expect(new Set(signature).size, "two shop items share a model").toBe(signature.length);
  });

  it("renders every decoration at a sane size on the farm", () => {
    // A cell is 1 unit. Nothing should end up invisible or tower over the farm.
    for (const item of DECOR) {
      for (const part of DECOR_PROP[item.id]) {
        const fitted = fittedSize(part);
        expect(fitted, `${item.id}: no measurable mesh`).not.toBeNull();
        expect(fitted!.h, `${item.id} is too small to see`).toBeGreaterThan(0.015);
        expect(fitted!.h, `${item.id} towers over the farm`).toBeLessThanOrEqual(2.6);
        // A bigger footprint earns a bigger model; the old flat 1.7 cap
        // predates decorations that legitimately cover more than one cell.
        const span = Math.max(fitted!.w, fitted!.d);
        const allowed = (item.size ?? 1) + 0.6;
        expect(span, `${item.id} is wider than its footprint allows`).toBeLessThanOrEqual(allowed);
      }
    }
  });

  it("falls back to a real mesh for an unknown kind", () => {
    const parts = getDecorProp("does-not-exist");
    expect(parts).toHaveLength(1);
    expect(PACK_NODES.has(parts[0].node)).toBe(true);
  });

  it("every crop has a grown model", () => {
    for (const crop of CROPS) expect(CROP_PROP[crop.id], crop.id).toBeDefined();
  });

  it("every species has a model in the pack and a rendered height", () => {
    for (const species of ANIMAL_SPECIES) {
      const node = ANIMAL_PROP[species.id];
      expect(node, `species ${species.id} has no model`).toBeDefined();
      expect(PACK_NODES.has(node), `${species.id} -> ${node}`).toBe(true);
      expect(ANIMAL_HEIGHT[species.id], `${species.id} has no height`).toBeGreaterThan(0);
    }
  });

  it("keeps the animals in believable proportion to each other", () => {
    // A chicken must not out-size a cow on the farm.
    expect(ANIMAL_HEIGHT.kip).toBeLessThan(ANIMAL_HEIGHT.varken);
    expect(ANIMAL_HEIGHT.varken).toBeLessThan(ANIMAL_HEIGHT.koe);
  });
});
