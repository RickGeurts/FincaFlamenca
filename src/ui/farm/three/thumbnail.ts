// Little pictures of the real thing, for the shop.
//
// The shop used to label everything with an emoji, which says "a house" but not
// *which* house — and the pack's house is not the emoji's house. So each row
// now shows the actual model, rendered once and kept.
//
// Rendering happens in a single offscreen canvas rather than a <Canvas> per
// row: a browser only grants a handful of WebGL contexts, and a category of
// eight items would spend most of them. One renderer draws every preview in
// turn and hands back a PNG, so the shop itself is plain images that scroll
// and cache like any other picture.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_URL } from "./props";
import { buildAnimalProp, buildCropProp, buildDecorProp } from "./build";

export type ThumbKind = "decor" | "animal" | "crop";

/** Pixels rendered. Shown far smaller, so it stays sharp on a phone screen. */
const SIZE = 256;

/**
 * Where the camera looks from. Off to one side and above, so an object reads
 * as solid; straight on, a house is a rectangle.
 */
const VIEW = new THREE.Vector3(0.62, 0.78, 1).normalize();
export const FOV = 28;
/** Breathing room around the object, so nothing touches the edge. */
const MARGIN = 1.12;
/** Smallest thing worth framing, so a flat path is not shot from inside it. */
const MIN_RADIUS = 0.05;

export interface Framing {
  distance: number;
  near: number;
  far: number;
}

/**
 * How far back to stand, and where to put the clipping planes.
 *
 * Framing the bounding *sphere* rather than the box means the object fits
 * whichever way round it is — no preview can come out with its roof cut off.
 */
export function framing(radius: number): Framing {
  const r = Math.max(radius, MIN_RADIUS);
  const distance = (r / Math.sin((FOV / 2) * (Math.PI / 180))) * MARGIN;
  return {
    // Both planes clear the object by its own radius again, so nothing is
    // sliced away by the near plane or lost beyond the far one.
    near: Math.max(0.01, distance - r * 2),
    far: distance + r * 2,
    distance,
  };
}

const cache = new Map<string, string>();
let pack: Promise<THREE.Object3D> | null = null;
let studio: Studio | null = null;
let broken = false;

interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/**
 * Hand over the models the farm has already unpacked, rather than fetching and
 * parsing a few megabytes all over again. Called by the scene once it is up.
 */
export function providePack(scene: THREE.Object3D): void {
  if (!pack) pack = Promise.resolve(scene);
}

/** The pack, borrowed from the farm if it is up, otherwise loaded here. */
function loadPack(): Promise<THREE.Object3D> {
  if (!pack) {
    pack = new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
  return pack;
}

function getStudio(): Studio | null {
  if (broken) return null;
  if (studio) return studio;
  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      // Without this the drawing buffer may be wiped before it can be read
      // back, which shows up as blank thumbnails on some phones.
      preserveDrawingBuffer: true,
    });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearAlpha(0);
    // The same colour handling the farm's canvas uses, or the previews come
    // out a different shade of green from the farm they belong to.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    // Matching the farm's own lighting, for the same reason.
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(6, 12, 5);
    scene.add(sun);

    studio = { renderer, scene, camera: new THREE.PerspectiveCamera(FOV, 1, 0.01, 100) };
    return studio;
  } catch {
    // No WebGL (or no context to spare). The shop falls back to its emoji.
    broken = true;
    return null;
  }
}

function build(pack: THREE.Object3D, kind: ThumbKind, id: string): THREE.Object3D {
  if (kind === "animal") return buildAnimalProp(pack, id);
  if (kind === "crop") return buildCropProp(pack, id);
  return buildDecorProp(pack, id);
}

/**
 * Frame the object and take its picture.
 *
 * Every preview is framed to fill, so a pebble and a barn are equally legible.
 * The row already says how big a thing is where that matters — a pen prints its
 * size — and a pebble rendered to scale beside a windmill would be a speck.
 */
function shoot(object: THREE.Object3D, into: Studio): string | null {
  const { renderer, scene, camera } = into;
  const sphere = new THREE.Box3()
    .setFromObject(object)
    .getBoundingSphere(new THREE.Sphere());
  const view = framing(sphere.radius);

  camera.position.copy(sphere.center).addScaledVector(VIEW, view.distance);
  camera.lookAt(sphere.center);
  camera.near = view.near;
  camera.far = view.far;
  camera.updateProjectionMatrix();

  scene.add(object);
  renderer.render(scene, camera);
  // Clones share their geometry and material with the pack the farm draws
  // from, so the object is only detached here — never disposed.
  scene.remove(object);

  // A picture of nothing is worse than the emoji it replaces: an empty grey
  // square tells her the shop is broken. So check something was actually drawn
  // rather than trusting the render, which fails quietly when it fails at all.
  if (!drewAnything(renderer)) return null;
  return renderer.domElement.toDataURL("image/png");
}

/** Did any pixel come out solid enough to see? */
function drewAnything(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const pixels = new Uint8Array(SIZE * SIZE * 4);
    gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let painted = 0;
    // Every fourth byte is the alpha; the rest is colour we do not care about.
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 8) painted++;
    }
    return painted > SIZE * SIZE * 0.005;
  } catch {
    // If the pixels cannot be read, assume the render was fine — better a
    // possible blank than no previews at all.
    return true;
  }
}

/** A picture of this item, made on first ask and remembered afterwards. */
export async function thumbnailFor(kind: ThumbKind, id: string): Promise<string | null> {
  const key = `${kind}:${id}`;
  const kept = cache.get(key);
  if (kept) return kept;
  if (broken) return null;

  try {
    const [loaded, into] = await Promise.all([loadPack(), Promise.resolve(getStudio())]);
    if (!into) return null;
    const url = shoot(build(loaded, kind, id), into);
    if (url) cache.set(key, url);
    return url;
  } catch {
    // A missing model is not worth breaking a shop over.
    return null;
  }
}

/** The picture if it is already made, so a reopened shop draws it at once. */
export function thumbnailIfReady(kind: ThumbKind, id: string): string | null {
  return cache.get(`${kind}:${id}`) ?? null;
}
