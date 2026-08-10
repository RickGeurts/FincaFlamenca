// Building a prop out of the pack: cloning a named node, standing it on the
// ground and sizing it to fit.
//
// This lives apart from the scene because two places need it now — the farm
// draws with it, and the shop renders its little previews with it. Sharing the
// code is what guarantees the thing she sees in the shop is the thing that
// lands on her farm.

import * as THREE from "three";
import { ANIMAL_HEIGHT, ANIMAL_PROP, CROP_PROP, DEFAULT_ANIMAL_HEIGHT, PROP, getDecorProp, type DecorPart } from "./props";

export interface FitOpts {
  /** Max height in world units. */
  height?: number;
  /** Max footprint (largest of width/depth) in world units. */
  footprint?: number;
}

/** Clone a named node from the pack, grounded at origin and fitted to size. */
export function fitProp(pack: THREE.Object3D, name: string, fit: FitOpts): THREE.Group {
  const group = new THREE.Group();
  const source = pack.getObjectByName(name);
  if (!source) return group;

  const clone = source.clone(true);
  clone.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });

  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  clone.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));

  const candidates: number[] = [];
  if (fit.height) candidates.push(fit.height / (size.y || 1));
  if (fit.footprint) candidates.push(fit.footprint / (Math.max(size.x, size.z) || 1));
  group.scale.setScalar(candidates.length > 0 ? Math.min(...candidates) : 1);
  group.add(clone);
  return group;
}

/** Assemble every part of a decoration into one object, laid out as authored. */
export function buildDecorProp(pack: THREE.Object3D, kind: string): THREE.Group {
  const group = new THREE.Group();
  for (const part of getDecorProp(kind)) {
    group.add(placePart(pack, part));
  }
  return group;
}

function placePart(pack: THREE.Object3D, part: DecorPart): THREE.Group {
  const model = fitProp(pack, part.node, { height: part.height, footprint: part.footprint });
  model.position.set(part.x ?? 0, 0, part.z ?? 0);
  model.rotation.y = part.rotY ?? 0;
  return model;
}

/** The animal as it stands in a pen — same size relationship as on the farm. */
export function buildAnimalProp(pack: THREE.Object3D, speciesId: string): THREE.Group {
  return fitProp(pack, ANIMAL_PROP[speciesId] ?? PROP.tree, {
    height: ANIMAL_HEIGHT[speciesId] ?? DEFAULT_ANIMAL_HEIGHT,
    footprint: 1.0,
  });
}

/** A crop at full growth: what she is really buying a seed for. */
export function buildCropProp(pack: THREE.Object3D, cropId: string): THREE.Group {
  return fitProp(pack, CROP_PROP[cropId] ?? PROP.young, { height: 0.6, footprint: 0.8 });
}
