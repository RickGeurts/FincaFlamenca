// The 3D farm: a low-poly island diorama rendered with react-three-fiber,
// tilted top-down like the reference render. Game logic stays outside — this
// component only draws state and reports taps.
//
// Prop scaling is data-driven: every model is normalized against BOTH a max
// height and a max footprint (smallest wins), because the pack mixes tall
// (windmill) and wide (market stand) models. Measure with
// scripts/measure-props.mjs before changing targets.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, MapControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STRINGS } from "../../../content/strings.es";
import { getCropDef, getSpeciesDef } from "../../../game/economy";
import { roamBound, stepWalkers, type Walker } from "../../../game/pen";
import { fitProp, type FitOpts } from "./build";
import { providePack } from "./thumbnail";
import * as crops from "../../../game/crops";
import {
  canDropOn,
  isPen,
  specOf,
  type DecorItem,
  type FarmState,
  type Tile,
} from "../../../game/farm";
import {
  UNIT_SPEC,
  animalKey,
  centerWorld,
  decorKey,
  worldToAnchor,
  type ObjectSpec,
  type Placement,
  type Quarter,
} from "../../../game/placement";
import type { Animal } from "../../../game/animals";
import { formatDuration } from "../../../utils/time";
import { TEX } from "../../assets";
import {
  ANIMAL_HEIGHT,
  ANIMAL_PROP,
  CROP_PROP,
  DEFAULT_ANIMAL_HEIGHT,
  MODEL_URL,
  PROP,
  getDecorProp,
  CHIMNEYS,
  SAILS,
  type Chimney,
  type Sails,
  type DecorPart,
} from "./props";

useGLTF.preload(MODEL_URL);

export interface FloatingCoin {
  key: number;
  tileId: string;
  amount: number;
}

interface Props {
  farm: FarmState;
  now: number;
  coins: FloatingCoin[];
  /** Ploughing mode: taps on grass turn it into farmland. */
  tilling: boolean;
  /**
   * Show the camera's own turn/zoom cluster. Optional and on by default, so
   * every existing caller keeps exactly the behaviour it had.
   */
  showControls?: boolean;
  onMoveObject: (objectId: string, col: number, row: number) => void;
  onRotateObject: (objectId: string, rot: Quarter) => void;
  onDeleteObject: (objectId: string) => void;
  onTileTap: (tile: Tile) => void;
  onAnimalTap: (animal: Animal) => void;
  onDecorTap: (item: DecorItem) => void;
}

const TILE = 1;
const MIN_ZOOM = 5;
const MAX_ZOOM = 30;
/** Clicks that moved further than this many pixels are drags, not taps. */
const TAP_SLOP_PX = 6;
/** Tilt limits: never fully top-down, never low enough to see under the island. */
const MIN_POLAR = 0.28;
const MAX_POLAR = 1.25;
/** One tap on a rotate button swings the camera an eighth of the way around. */
const ROTATE_STEP = Math.PI / 4;
const ROTATE_MS = 320;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function FarmScene({
  farm,
  now,
  coins,
  tilling,
  showControls = true,
  onMoveObject,
  onRotateObject,
  onDeleteObject,
  onTileTap,
  onAnimalTap,
  onDecorTap,
}: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const spin = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (spin.current !== null) cancelAnimationFrame(spin.current);
    },
    [],
  );

  /** Orbit the camera around the island, eased so the farm glides instead of snapping. */
  const rotateBy = (radians: number) => {
    const c = controls.current;
    if (!c) return;
    if (spin.current !== null) cancelAnimationFrame(spin.current);
    let startedAt: number | null = null;
    let applied = 0;
    const step = (stamp: number) => {
      if (startedAt === null) startedAt = stamp;
      const t = Math.min((stamp - startedAt) / ROTATE_MS, 1);
      const target = radians * (1 - Math.pow(1 - t, 3));
      const camera = c.object;
      const offset = camera.position.clone().sub(c.target).applyAxisAngle(Y_AXIS, target - applied);
      applied = target;
      camera.position.copy(c.target.clone().add(offset));
      c.update();
      spin.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    spin.current = requestAnimationFrame(step);
  };

  const zoomBy = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    const camera = c.object;
    const offset = camera.position.clone().sub(c.target);
    const length = THREE.MathUtils.clamp(offset.length() * factor, MIN_ZOOM, MAX_ZOOM);
    camera.position.copy(c.target.clone().add(offset.normalize().multiplyScalar(length)));
    c.update();
  };

  const specs = useMemo(() => specOf(farm), [farm]);
  const canDrop = (id: string, col: number, row: number) => canDropOn(farm, id, col, row);

  // The bin only exists while something is held, and lights up when the
  // object is over it. Hit-testing is done against its real screen rect.
  const binRef = useRef<HTMLDivElement>(null);
  const [carrying, setCarrying] = useState(false);
  const [overBin, setOverBin] = useState(false);

  const host: DragHost = useMemo(
    () => ({
      isOverBin: (ev) => {
        const el = binRef.current;
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        // A little larger than the button, so it is easy to hit with a thumb.
        return Math.hypot(dx, dy) <= r.width / 2 + 16;
      },
      onDragChange: (id, isOverBin) => {
        setCarrying(id !== null);
        setOverBin(isOverBin);
      },
    }),
    [],
  );

  const movableProps = {
    host,
    canDrop,
    onMove: onMoveObject,
    onRotate: onRotateObject,
    onDelete: onDeleteObject,
  };

  return (
    // The scene owns the whole screen now; the farm's controls float on top of
    // it rather than sitting in a box above a stack of buttons.
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-farm-100">
      <Canvas
        shadows
        dpr={[1, 2]}
        // Framed for the whole island. The meadow grew from a 5 x 6 patch to
        // the full 7 x 8, so standing where the old camera stood would put her
        // nose against the grass.
        camera={{ position: [0, 16.5, 15.4], fov: 36 }}
      >
        <MapControls
          ref={controls}
          makeDefault
          target={[0, -0.4, 0]}
          minDistance={MIN_ZOOM}
          maxDistance={MAX_ZOOM}
          minPolarAngle={MIN_POLAR}
          maxPolarAngle={MAX_POLAR}
          screenSpacePanning={false}
          // While arranging, one finger drags objects — the camera moves with
          // the buttons, two fingers, or a right-drag instead.
          enablePan
        />
        <ambientLight intensity={1.1} />
        <directionalLight
          position={[6, 12, 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
        />
        <Suspense
          fallback={
            <Html center>
              <span className="font-bold text-farm-700">{STRINGS.loading}</span>
            </Html>
          }
        >
          <SharePack />
          <Island farm={farm} />
          {farm.tiles.map((tile, i) => (
            <TileCell
              key={tile.id}
              tile={tile}
              index={i}
              farm={farm}
              now={now}
              tilling={tilling}
              coins={coins.filter((c) => c.tileId === tile.id)}
              onTap={() => onTileTap(tile)}
            />
          ))}

          {farm.decor.map((item, i) => {
            const id = decorKey(item.id);
            const place = farm.placements[id];
            if (!place) return null;
            const penSize = isPen(item.kind) ? specs(id).w : 0;
            return (
              <Movable
                key={id}
                id={id}
                place={place}
                spec={specs(id)}
                onTap={() => onDecorTap(item)}
                {...movableProps}
              >
                {penSize > 0 && <PenField size={penSize} />}
                <SpawnAnimation delay={0.05 + i * 0.06}>
                  <DecorModel kind={item.kind} />
                </SpawnAnimation>
                {penSize > 0 && (
                  <PenAnimals
                    animals={farm.animals.filter((a) => a.penId === item.id)}
                    size={penSize}
                    onTap={onAnimalTap}
                    host={host}
                    canDrop={canDrop}
                    onMove={onMoveObject}
                    onDelete={onDeleteObject}
                  />
                )}
              </Movable>
            );
          })}

          {farm.animals.map((animal, i) => {
            const id = animalKey(animal.id);
            const place = farm.placements[id];
            // Penned animals are drawn by their pen, roaming loose inside it.
            if (!place || animal.penId) return null;
            return (
              <Movable
                key={id}
                id={id}
                place={place}
                spec={specs(id)}
                onTap={() => onAnimalTap(animal)}
                {...movableProps}
              >
                <AnimalProp animal={animal} index={i} />
              </Movable>
            );
          })}
        </Suspense>
      </Canvas>

      {/*
        Turning and zooming the camera. They sit above the tool dock and out of
        the way of the village rail along the bottom, and stay hidden until she
        asks for them — the farm is nicer to look at without buttons on it.
      */}
      {showControls && (
        <div className="animate-fade-up absolute bottom-40 left-3.5 z-10 flex flex-col gap-2 rounded-[22px] bg-farm-50/92 p-2.5 shadow-[0_10px_26px_rgba(90,50,10,.24)]">
          <div className="flex gap-2">
            <button
              onClick={() => rotateBy(-ROTATE_STEP)}
              aria-label={STRINGS.rotateLeft}
              className="h-11 w-11 rounded-xl bg-white text-xl font-black text-farm-700 shadow-sm active:bg-farm-100"
            >
              ↺
            </button>
            <button
              onClick={() => rotateBy(ROTATE_STEP)}
              aria-label={STRINGS.rotateRight}
              className="h-11 w-11 rounded-xl bg-white text-xl font-black text-farm-700 shadow-sm active:bg-farm-100"
            >
              ↻
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => zoomBy(0.8)}
              aria-label={STRINGS.zoomIn}
              className="h-11 w-11 rounded-xl bg-white text-xl font-black text-farm-700 shadow-sm active:bg-farm-100"
            >
              +
            </button>
            <button
              onClick={() => zoomBy(1.25)}
              aria-label={STRINGS.zoomOut}
              className="h-11 w-11 rounded-xl bg-white text-xl font-black text-farm-700 shadow-sm active:bg-farm-100"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/*
        The bin only exists while something is held: it rises from the bottom
        of the farm, and swells when the object is over it. Dropping there
        removes the object, which is why there is no delete button in a
        toolbar any more.
      */}
      <div
        ref={binRef}
        aria-hidden={!carrying}
        className={`pointer-events-none absolute bottom-4 left-1/2 z-10 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          carrying ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
        } ${overBin ? "scale-125 bg-rose-500" : "scale-100 bg-white/95"}`}
      >
        <span className={`text-2xl ${overBin ? "grayscale-0" : ""}`}>🗑️</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prop loading helpers

/**
 * Lends the loaded pack to the shop's preview renderer.
 *
 * The models are a few megabytes; downloading and unpacking them a second time
 * just to draw thumbnails would be a noticeable pause on a phone. The farm has
 * them already, and a shop only ever opens on top of the farm.
 */
function SharePack() {
  const gltf = useGLTF(MODEL_URL);
  useEffect(() => providePack(gltf.scene), [gltf.scene]);
  return null;
}

/**
 * Clone a named node from the pack, grounded at origin and fitted to size.
 *
 * The fitting itself lives in build.ts, because the shop's previews are made
 * the same way — that shared code is what keeps a shop picture honest about
 * what will land on the farm.
 */
function useProp(name: string, fit: FitOpts) {
  const gltf = useGLTF(MODEL_URL);
  const { height, footprint } = fit;
  return useMemo(
    () => fitProp(gltf.scene, name, { height, footprint }),
    [gltf.scene, name, height, footprint],
  );
}

/** Wilted look: same shape, dried-out color. */
function useWiltedProp(name: string, height: number) {
  const base = useProp(name, { height, footprint: 0.8 });
  return useMemo(() => {
    const clone = base.clone(true);
    const dried = new THREE.MeshStandardMaterial({ color: "#a89a72" });
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = dried;
    });
    return clone;
  }, [base]);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Springy scale-in on mount (staggered), used for beds, crops and decor. */
function SpawnAnimation({
  children,
  delay = 0,
  drop = 0,
}: {
  children: React.ReactNode;
  delay?: number;
  drop?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (start.current === null) start.current = clock.elapsedTime + delay;
    const t = Math.min(Math.max((clock.elapsedTime - start.current) / 0.5, 0), 1);
    const eased = easeOutBack(t);
    group.current.scale.setScalar(Math.max(0.0001, eased));
    group.current.position.y = drop * (1 - t);
    group.current.visible = t > 0;
  });
  return <group ref={group}>{children}</group>;
}

/** True for real taps; false when the pointer dragged (pan/zoom gesture). */
function isTap(e: ThreeEvent<MouseEvent>): boolean {
  return e.delta <= TAP_SLOP_PX;
}

// ---------------------------------------------------------------------------
// Moving objects around the grid

/** The island's ground plane; drags are projected onto it to find a cell. */
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Freshly turned earth, drawn rather than loaded: parallel furrows with a lit
 * crest and a shadowed trough, plus scattered clods. The flat dirt sprite read
 * as a brown square from the game's camera angle; ridges are what say
 * "ploughed". Browns match the island's own soil layers.
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Fade the texture out towards its border: a stack of ever-smaller rounded
 * rectangles, each adding a slice of opacity, so a pixel's alpha rises with
 * its distance from the edge. `feather` is how far the fade reaches, in px.
 */
function applyEdgeFade(
  ctx: CanvasRenderingContext2D,
  size: number,
  radius: number,
  feather: number,
) {
  const mask = document.createElement("canvas");
  mask.width = size;
  mask.height = size;
  const m = mask.getContext("2d")!;
  const steps = Math.max(1, Math.round(feather));
  m.globalCompositeOperation = "lighter";
  m.fillStyle = `rgba(255,255,255,${1 / steps})`;
  for (let i = 0; i < steps; i++) {
    const inset = (i / steps) * feather;
    roundedRectPath(m, inset, inset, size - inset * 2, size - inset * 2, radius);
    m.fill();
  }
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

const soilTextures = new Map<string, THREE.CanvasTexture>();

function getSoilTexture(radius: number, feather: number): THREE.CanvasTexture {
  const key = `${radius}:${feather}`;
  const cached = soilTextures.get(key);
  if (cached) return cached;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#8a6242";
  ctx.fillRect(0, 0, size, size);

  const furrows = 7;
  const band = size / furrows;
  for (let i = 0; i < furrows; i++) {
    const top = i * band;
    const gradient = ctx.createLinearGradient(0, top, 0, top + band);
    gradient.addColorStop(0, "rgba(60, 38, 22, 0.55)"); // trough
    gradient.addColorStop(0.42, "rgba(168, 126, 88, 0.45)"); // crest, sunlit
    gradient.addColorStop(0.62, "rgba(140, 100, 66, 0.25)");
    gradient.addColorStop(1, "rgba(60, 38, 22, 0.55)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top, size, band);
  }

  // Clods of earth. A fixed sequence, so the field looks the same every load.
  let seed = 20260810;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.6 + rand() * 2.2;
    const dark = rand() > 0.5;
    ctx.fillStyle = dark ? "rgba(54, 34, 20, 0.35)" : "rgba(186, 145, 104, 0.32)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  applyEdgeFade(ctx, size, radius, feather);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  soilTextures.set(key, texture);
  return texture;
}

/** The ploughed earth, corners eased. */
const PLOT_TEXTURE = { radius: 34, feather: 3 };
/** Loose earth feathering out around the plot. */
const PLOT_SKIRT_TEXTURE = { radius: 56, feather: 40 };
/**
 * A plot covers most of its cell but not all of it, so a band of grass stays
 * between neighbouring plots and the field reads as tilled beds rather than
 * one brown slab. The skirt stays inside the cell too, or it would close the
 * gap back up.
 */
const PLOT_SCALE = 0.8;
const PLOT_SKIRT_SCALE = 0.94;

/** Seconds for the plough to cross a plot. */
const PLOUGH_TIME = 0.6;

/** A soft puff of turned-up earth, kicked out ahead of the plough. */
let dustTexture: THREE.CanvasTexture | null = null;

function getDustTexture(): THREE.CanvasTexture {
  if (dustTexture) return dustTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(214, 182, 143, 0.85)");
  gradient.addColorStop(0.45, "rgba(190, 156, 118, 0.45)");
  gradient.addColorStop(1, "rgba(190, 156, 118, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  dustTexture = texture;
  return texture;
}

/** Where on the island the pointer is, as a grid anchor for the given shape. */
function pointerToAnchor(
  ev: PointerEvent,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  spec: ObjectSpec,
  rot: Placement["rot"],
  scratch: { raycaster: THREE.Raycaster; ndc: THREE.Vector2; hit: THREE.Vector3 },
): { col: number; row: number } | null {
  const rect = canvas.getBoundingClientRect();
  scratch.ndc.set(
    ((ev.clientX - rect.left) / rect.width) * 2 - 1,
    -((ev.clientY - rect.top) / rect.height) * 2 + 1,
  );
  scratch.raycaster.setFromCamera(scratch.ndc, camera);
  if (!scratch.raycaster.ray.intersectPlane(GROUND, scratch.hit)) return null;
  return worldToAnchor(scratch.hit.x, scratch.hit.z, spec, rot);
}

const newScratch = () => ({
  raycaster: new THREE.Raycaster(),
  ndc: new THREE.Vector2(),
  hit: new THREE.Vector3(),
});

/** Hold this long to pick something up; a shorter press is a tap. */
const HOLD_MS = 300;
/** Move further than this before the hold lands and it was a camera pan. */
const HOLD_SLOP_PX = 10;

export interface DragHost {
  /** True while the pointer is over the delete bin. */
  isOverBin: (ev: PointerEvent) => boolean;
  onDragChange: (id: string | null, overBin: boolean) => void;
}

interface HoldToDragOpts {
  id: string;
  spec: ObjectSpec;
  rot: Quarter;
  host: DragHost;
  canDrop: (id: string, col: number, row: number) => boolean;
  /** Live cell under the object, or null to leave it where it is. */
  onCell: (cell: { col: number; row: number } | null) => void;
  /** Live twist in radians while two fingers are down; null when not twisting. */
  onTwist?: (radians: number | null) => void;
  onPick: () => void;
  onDrop: (
    cell: { col: number; row: number } | null,
    opts: { overBin: boolean; twist: number | null },
  ) => void;
}

/**
 * Press and hold to pick an object up, then drag it. A quick tap falls through
 * to the object's own tap handler, and a press that slides straight away is
 * left to the camera, so panning still works anywhere on the farm.
 *
 * With the object held, putting a second finger down twists it: the angle
 * between the two fingers drives the rotation, which snaps to a quarter turn
 * on release. That replaces the old rotate buttons.
 */
function useHoldToDrag({
  id,
  spec,
  rot,
  host,
  canDrop,
  onCell,
  onTwist,
  onPick,
  onDrop,
}: HoldToDragOpts) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const [dragging, setDragging] = useState(false);
  const detach = useRef<(() => void) | null>(null);
  /** Set while a hold happened, so the release doesn't also count as a tap. */
  const held = useRef(false);
  /**
   * When the current press started, for as long as it is still on its way to
   * becoming a hold. The object reads this to strain upward while she presses,
   * so the wait has something to show for it; cleared the moment it comes free
   * or the press is abandoned.
   */
  const pullFrom = useRef<number | null>(null);

  useEffect(() => () => detach.current?.(), []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;
    const scratch = newScratch();
    const pointers = new Map<number, { x: number; y: number }>();
    pointers.set(e.nativeEvent.pointerId, { x: startX, y: startY });

    let picked = false;
    let target: { col: number; row: number } | null = null;
    let overBin = false;
    let twistFrom: number | null = null;
    let twist: number | null = null;

    pullFrom.current = performance.now();

    const timer = window.setTimeout(() => {
      picked = true;
      held.current = true;
      // It is off the ground now; the carry animation takes over the lift.
      pullFrom.current = null;
      setDragging(true);
      // Only now does the camera let go — a hold that never lands leaves
      // panning untouched.
      if (controls) controls.enabled = false;
      host.onDragChange(id, false);
      onPick();
    }, HOLD_MS);

    const angleBetween = () => {
      const [a, b] = [...pointers.values()];
      return Math.atan2(b.y - a.y, b.x - a.x);
    };

    const onMove = (ev: PointerEvent) => {
      if (pointers.has(ev.pointerId)) {
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }

      if (!picked) {
        const slid = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (slid > HOLD_SLOP_PX) detachAll();
        return;
      }

      if (pointers.size >= 2) {
        // Two fingers: twist in place rather than move.
        const angle = angleBetween();
        if (twistFrom === null) twistFrom = angle;
        twist = angle - twistFrom;
        onTwist?.(twist);
        return;
      }

      const nowOverBin = host.isOverBin(ev);
      if (nowOverBin !== overBin) {
        overBin = nowOverBin;
        host.onDragChange(id, overBin);
      }
      if (overBin) return;

      const cell = pointerToAnchor(ev, camera, gl.domElement, spec, rot, scratch);
      if (!cell) return;
      if (target && cell.col === target.col && cell.row === target.row) return;
      if (!canDrop(id, cell.col, cell.row)) return;
      target = cell;
      onCell(cell);
    };

    const onExtraDown = (ev: PointerEvent) => {
      if (picked && pointers.size < 2) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    };

    const onUp = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (picked && pointers.size >= 1) {
        // A twisting finger lifted; keep holding, re-baseline the twist.
        twistFrom = null;
        return;
      }
      detachAll();
      if (picked) onDrop(target, { overBin, twist });
    };

    const detachAll = () => {
      window.clearTimeout(timer);
      // A press that slid away or lifted early: let it sink back down.
      pullFrom.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onExtraDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (controls) controls.enabled = true;
      if (picked) {
        setDragging(false);
        host.onDragChange(null, false);
      }
      detach.current = null;
    };

    const onCancel = () => {
      const wasPicked = picked;
      detachAll();
      if (wasPicked) onDrop(null, { overBin: false, twist: null });
    };

    detach.current = detachAll;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onExtraDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  /** True when the release followed a hold, so it must not open a word card. */
  const consumeTapSuppression = () => {
    const wasHeld = held.current;
    held.current = false;
    return wasHeld;
  };

  return { onPointerDown, dragging, consumeTapSuppression, pullFrom };
}

/** How high a picked-up object floats, and how much bigger it looks up there. */
const CARRY_HEIGHT = 0.45;
const CARRY_GROW = 0.09;
/** Seconds of squash-and-stretch after an object touches down. */
const LAND_TIME = 0.42;
/**
 * The strain before an object comes loose. While she holds a finger down it
 * rises a fraction of the way and squats against the ground, so the wait to
 * pick something up is visibly doing something instead of nothing at all.
 */
const PULL_LIFT = 0.24;
const PULL_SQUASH = 0.07;
/** How hard it shivers at full strain, just before it lets go. */
const PULL_SHIVER = 0.007;

/** Frame-rate independent ease toward a target: fast at first, then settling. */
function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * Math.min(1, rate * dt);
}

/** A square outline: four lines on the cell's own borders. */
function cellFrame(half: number, thickness: number): THREE.ShapeGeometry {
  const inner = half - thickness;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-inner, -inner);
  hole.lineTo(-inner, inner);
  hole.lineTo(inner, inner);
  hole.lineTo(inner, -inner);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

/**
 * Matches the crop tiles exactly (they are drawn at TILE * 0.98), so the
 * outline lands on the grid lines instead of hovering inside them.
 */
const CELL_FRAME = cellFrame((TILE * 0.98) / 2, 0.045);

interface MovableProps {
  id: string;
  place: Placement;
  spec: ObjectSpec;
  host: DragHost;
  canDrop: (id: string, col: number, row: number) => boolean;
  onMove: (id: string, col: number, row: number) => void;
  onRotate: (id: string, rot: Quarter) => void;
  onDelete: (id: string) => void;
  onTap: () => void;
  children: React.ReactNode;
}

/**
 * Puts its children on a grid cell and lets the player pick them up with a
 * press and hold. There is no layout mode: a tap still opens the word card,
 * a hold lifts the object, and a second finger twists it.
 */
function Movable({
  id,
  place,
  spec,
  host,
  canDrop,
  onMove,
  onRotate,
  onDelete,
  onTap,
  children,
}: MovableProps) {
  const [dragCell, setDragCell] = useState<{ col: number; row: number } | null>(null);
  const [pulseOnLand, setPulseOnLand] = useState(false);

  const cell = dragCell ?? place;
  const { x, z } = centerWorld({ ...cell, rot: place.rot }, spec);

  // The group jumps straight to the new cell so the drop marker is honest;
  // the object itself is handed the leftover distance and eases across it.
  const lag = useRef({ x: 0, z: 0 });
  const from = useRef({ x, z });
  if (from.current.x !== x || from.current.z !== z) {
    lag.current.x += from.current.x - x;
    lag.current.z += from.current.z - z;
    from.current = { x, z };
  }

  // Rotation eases toward the stored quarter turn, except while two fingers
  // are twisting it, when the fingers drive it directly.
  const spinner = useRef<THREE.Group>(null);
  const angle = useRef((-place.rot * Math.PI) / 2);
  const targetAngle = useRef((-place.rot * Math.PI) / 2);
  const lastRot = useRef(place.rot);
  const twist = useRef<number | null>(null);
  if (lastRot.current !== place.rot) {
    let quarters = place.rot - lastRot.current;
    if (quarters > 2) quarters -= 4;
    if (quarters < -2) quarters += 4;
    targetAngle.current += (-quarters * Math.PI) / 2;
    lastRot.current = place.rot;
  }
  /** Where the twist started from, so the gesture is relative. */
  const twistBase = useRef(0);

  useFrame((_, delta) => {
    const g = spinner.current;
    if (!g) return;
    if (twist.current !== null) {
      g.rotation.y = twistBase.current - twist.current;
      return;
    }
    if (Math.abs(targetAngle.current - angle.current) < 0.0005) {
      if (g.rotation.y !== targetAngle.current) {
        angle.current = targetAngle.current;
        g.rotation.y = targetAngle.current;
      }
      return;
    }
    angle.current = approach(angle.current, targetAngle.current, 13, Math.min(delta, 1 / 30));
    g.rotation.y = angle.current;
  });

  const { onPointerDown, dragging, consumeTapSuppression, pullFrom } = useHoldToDrag({
    id,
    spec,
    rot: place.rot,
    host,
    canDrop,
    onPick: () => {
      setPulseOnLand(false);
      twistBase.current = angle.current;
    },
    onCell: (next) => setDragCell(next),
    onTwist: (radians) => {
      twist.current = radians;
    },
    onDrop: (target, { overBin, twist: finalTwist }) => {
      if (overBin) {
        setDragCell(null);
        twist.current = null;
        onDelete(id);
        return;
      }

      if (finalTwist !== null) {
        // Snap the gesture to the nearest quarter turn and let the ease settle
        // the last few degrees.
        const turned = twistBase.current - finalTwist;
        const quarters = Math.round(-turned / (Math.PI / 2));
        angle.current = turned;
        twist.current = null;
        onRotate(id, (((quarters % 4) + 4) % 4) as Quarter);
      }

      const moved =
        target !== null && (target.col !== place.col || target.row !== place.row);
      setPulseOnLand(moved);
      if (moved) onMove(id, target.col, target.row);
      setDragCell(null);
    },
  });

  return (
    <group
      position={[x, 0, z]}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        // A release that followed a hold is the end of a drag, not a tap.
        if (consumeTapSuppression()) return;
        e.stopPropagation();
        if (isTap(e)) onTap();
      }}
    >
      {dragging && (
        <Marker selected dragging size={place.rot % 2 === 1 ? spec.h : spec.w} />
      )}
      {/* Spin sits inside the carry group so the cell outlines never rotate. */}
      <Carry held={dragging} lag={lag} pullFrom={pullFrom} pulseOnLand={pulseOnLand}>
        <group ref={spinner} rotation={[0, angle.current, 0]}>
          {children}
        </group>
      </Carry>
    </group>
  );
}

/**
 * The feel of moving something: it lifts off the ground when picked up, floats
 * and sways while carried, eases into each new cell instead of teleporting,
 * then lands with a squash and a ripple in the grass.
 *
 * All of it runs off refs in one frame loop — picking an object up must never
 * re-render the scene.
 */
function Carry({
  held,
  lag,
  pullFrom,
  pulseOnLand,
  children,
}: {
  held: boolean;
  /** Distance still to travel after the parent jumped to a new cell. */
  lag: React.MutableRefObject<{ x: number; z: number }>;
  /** When the press began, while it is still short of a hold; else null. */
  pullFrom: React.MutableRefObject<number | null>;
  pulseOnLand: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const rippleMat = useRef<THREE.MeshBasicMaterial>(null);

  const lift = useRef(0);
  const falling = useRef(false);
  const wasHeld = useRef(false);
  const sinceLanding = useRef(-1);
  const rippling = useRef(false);
  const atRest = useRef(true);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);

    if (wasHeld.current && !held) falling.current = true;
    wasHeld.current = held;

    // The impact is timed to the moment it actually touches down, not to the
    // moment the finger lifted.
    if (falling.current && lift.current < 0.03) {
      falling.current = false;
      sinceLanding.current = 0;
      rippling.current = pulseOnLand;
    }
    if (sinceLanding.current >= 0) sinceLanding.current += dt;

    // How far into the press she is, before it becomes a hold. Eased so the
    // object answers her finger immediately and then strains more slowly.
    const pulling = !held && pullFrom.current !== null;
    const pullRaw = pulling ? Math.min(1, (performance.now() - pullFrom.current!) / HOLD_MS) : 0;
    const pull = 1 - (1 - pullRaw) * (1 - pullRaw);

    const settled =
      !held &&
      !pulling &&
      lift.current < 0.001 &&
      Math.abs(lag.current.x) < 0.001 &&
      Math.abs(lag.current.z) < 0.001 &&
      (sinceLanding.current < 0 || sinceLanding.current >= LAND_TIME);

    if (settled) {
      if (!atRest.current) {
        g.position.set(0, 0, 0);
        g.rotation.z = 0;
        g.scale.set(1, 1, 1);
        if (ripple.current) ripple.current.visible = false;
        lift.current = 0;
        lag.current.x = 0;
        lag.current.z = 0;
        sinceLanding.current = -1;
        rippling.current = false;
        atRest.current = true;
      }
      return;
    }
    atRest.current = false;

    // Off the ground quickly, back down a little quicker. A press that has not
    // become a hold yet only gets part of the way up, and carries on from there
    // rather than restarting, so coming loose is one continuous movement.
    const target = held ? 1 : pulling ? PULL_LIFT * pull : 0;
    lift.current = approach(lift.current, target, held ? 14 : pulling ? 16 : 20, dt);
    lag.current.x = approach(lag.current.x, 0, 22, dt);
    lag.current.z = approach(lag.current.z, 0, 22, dt);

    const hover = held ? Math.sin(clock.elapsedTime * 6) * 0.022 : 0;
    // Straining harder the longer she holds, until it gives.
    const shiver = pulling ? Math.sin(clock.elapsedTime * 40) * PULL_SHIVER * pull : 0;
    g.position.set(lag.current.x, CARRY_HEIGHT * lift.current + hover + shiver, lag.current.z);
    g.rotation.z = Math.sin(clock.elapsedTime * 4) * 0.05 * lift.current;

    // Squash on impact, overshoot into a stretch, then settle.
    let squash = 0;
    const t = sinceLanding.current;
    if (t >= 0 && t < LAND_TIME) {
      const p = t / LAND_TIME;
      squash = Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.2;
    }
    // The squat while straining reads the same way as the squash on landing —
    // wider and shorter — so the two share the shaping below.
    const strain = squash + (pulling ? PULL_SQUASH * pull : 0);
    const grow = 1 + CARRY_GROW * lift.current;
    g.scale.set(grow * (1 + strain * 0.6), grow * (1 - strain), grow * (1 + strain * 0.6));

    if (ripple.current && rippleMat.current) {
      const active = rippling.current && t >= 0 && t < LAND_TIME;
      ripple.current.visible = active;
      if (active) {
        const p = t / LAND_TIME;
        // Starts exactly on the cell borders, then swells outward as it fades.
        const size = 1 + p * 0.5;
        ripple.current.scale.set(size, size, size);
        rippleMat.current.opacity = (1 - p) * 0.55;
      }
    }
  });

  return (
    <>
      <mesh
        ref={ripple}
        visible={false}
        position={[0, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={CELL_FRAME}
      >
        <meshBasicMaterial ref={rippleMat} color="#ffffff" transparent depthWrite={false} />
      </mesh>
      <group ref={group}>{children}</group>
    </>
  );
}

/** Shown only in layout mode: this object can be dragged; this one is selected. */
function Marker({
  selected,
  dragging,
  size = 1,
}: {
  selected: boolean;
  dragging: boolean;
  /** Footprint width in cells — a pasture outlines all of its cells. */
  size?: number;
}) {
  return (
    <mesh
      position={[0, 0.09, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[size, size, 1]}
      geometry={CELL_FRAME}
    >
      <meshBasicMaterial
        color={dragging ? "#f59e0b" : selected ? "#22c55e" : "#ffffff"}
        transparent
        opacity={dragging || selected ? 0.95 : 0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Pens: grass underfoot, and animals that walk around inside

/** Deterministic per-animal jitter, so a herd doesn't move in lockstep. */
function hashUnit(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * The grass inside a pen, in a slightly different green so the pen reads as
 * its own field rather than part of the crop grid.
 */
function PenField({ size }: { size: number }) {
  return (
    <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size - 0.06, size - 0.06]} />
      <meshStandardMaterial color="#7fd96b" />
    </mesh>
  );
}

/**
 * Animals living in a pen ignore the grid entirely: each walks to a random
 * spot, pauses, and picks another. They are pushed apart from each other and
 * kept a body's width clear of the fence, so nothing ever clips.
 */
function PenAnimals({
  animals,
  size,
  onTap,
  host,
  canDrop,
  onMove,
  onDelete,
}: {
  animals: Animal[];
  size: number;
  onTap: (animal: Animal) => void;
  host: DragHost;
  canDrop: (id: string, col: number, row: number) => boolean;
  onMove: (id: string, col: number, row: number) => void;
  onDelete: (id: string) => void;
}) {
  const groups = useRef(new Map<string, THREE.Group>());
  // Keyed by animal id and kept across renders. The scene re-renders every
  // second (the crop clock), and rebuilding this would reset every animal to
  // its starting spot mid-stride — which is exactly why they used to stand
  // still: the reset landed before the opening pause had run out.
  const walkers = useRef(new Map<string, Walker>());

  const bornAt = (animal: Animal): Walker => {
    const radius = getSpeciesDef(animal.speciesId).radius;
    const limit = Math.max(0.05, size / 2 - radius - 0.12);
    const ax = (hashUnit(animal.id, 1) * 2 - 1) * limit;
    const az = (hashUnit(animal.id, 2) * 2 - 1) * limit;
    return {
      x: ax,
      z: az,
      tx: ax,
      tz: az,
      angle: hashUnit(animal.id, 3) * Math.PI * 2,
      radius,
      // A cow ambles; a chicken scurries.
      speed: 0.16 + (1 - radius) * 0.16 + hashUnit(animal.id, 4) * 0.05,
      // A short first pause only, so a new arrival sets off promptly.
      pause: hashUnit(animal.id, 5) * 0.8,
      blocked: 0,
    };
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    // Add arrivals, forget animals that left, keep everyone else walking.
    const present = new Set(animals.map((a) => a.id));
    for (const id of walkers.current.keys()) {
      if (!present.has(id)) walkers.current.delete(id);
    }
    const list: Walker[] = [];
    for (const animal of animals) {
      let w = walkers.current.get(animal.id);
      if (!w) {
        w = bornAt(animal);
        walkers.current.set(animal.id, w);
      }
      list.push(w);
    }

    // Steering, avoiding and pushing apart all live in game/pen, so what she
    // sees on screen is the very thing the pen tests simulate. All this has to
    // supply is where an animal wanders off to next.
    stepWalkers(list, size, dt, (w, i) => {
      const bound = roamBound(size, w.radius);
      const seed = `${i}:${Math.round(w.x * 1000)}:${Math.round(w.z * 1000)}`;
      // A breather before setting off, so a pen looks like animals pottering
      // about rather than a set of dots on rails.
      w.pause = 0.6 + hashUnit(seed, 9) * 2.5;
      return {
        x: (hashUnit(seed, 7) * 2 - 1) * bound,
        z: (hashUnit(seed, 8) * 2 - 1) * bound,
      };
    });

    for (let i = 0; i < list.length; i++) {
      const group = groups.current.get(animals[i].id);
      if (group) {
        group.position.set(list[i].x, 0, list[i].z);
        group.rotation.y = list[i].angle;
      }
    }
  });

  return (
    <>
      {animals.map((animal, i) => (
        <PennedAnimal
          key={animal.id}
          animal={animal}
          index={i}
          host={host}
          canDrop={canDrop}
          onMove={onMove}
          onDelete={onDelete}
          onTap={() => onTap(animal)}
          bind={(g) => {
            if (g) groups.current.set(animal.id, g);
            else groups.current.delete(animal.id);
          }}
        />
      ))}
    </>
  );
}

/**
 * One animal in a pen. It gets its own hold-to-drag, because otherwise the
 * pointer falls through to the pen and drags the whole enclosure — there
 * would be no way to take an animal back out.
 */
function PennedAnimal({
  animal,
  index,
  host,
  canDrop,
  onMove,
  onDelete,
  onTap,
  bind,
}: {
  animal: Animal;
  index: number;
  host: DragHost;
  canDrop: (id: string, col: number, row: number) => boolean;
  onMove: (id: string, col: number, row: number) => void;
  onDelete: (id: string) => void;
  onTap: () => void;
  bind: (group: THREE.Group | null) => void;
}) {
  const id = animalKey(animal.id);
  const { onPointerDown, consumeTapSuppression } = useHoldToDrag({
    id,
    spec: UNIT_SPEC,
    rot: 0,
    host,
    canDrop,
    onPick: () => {},
    onCell: () => {},
    onDrop: (target, { overBin }) => {
      if (overBin) onDelete(id);
      else if (target) onMove(id, target.col, target.row);
    },
  });

  return (
    <group
      ref={bind}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (consumeTapSuppression()) return;
        e.stopPropagation();
        if (isTap(e)) onTap();
      }}
    >
      <AnimalProp animal={animal} index={index} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Turning windmill sails

/**
 * Splits a fitted model into "sails" and "everything else".
 *
 * The pack merges the whole windmill into one mesh, so the sails are separated
 * geometrically: a triangle joins the sails when its centre sits in the thin
 * disc around the hub, between the inner and outer radius. That is exactly the
 * band the six arms occupy, and it excludes the tower, which is well inside
 * the inner radius, and the roof, which is behind the disc.
 *
 * Returns null when the split finds nothing convincing, so a future change to
 * the art degrades to a still windmill rather than a mangled one.
 */
function splitSails(
  model: THREE.Group,
  sails: Sails,
): { still: THREE.Group; turning: THREE.Group; hub: THREE.Vector3 } | null {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const hub = new THREE.Vector3(
    centre.x,
    box.min.y + size.y * sails.fy,
    centre.z + size.y * sails.fz,
  );
  const inner = size.y * sails.fInner;
  const outer = size.y * sails.fOuter;
  const slice = size.y * sails.fSlice;

  const still = new THREE.Group();
  const turning = new THREE.Group();
  let sailTriangles = 0;

  model.updateWorldMatrix(true, true);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const mid = new THREE.Vector3();

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const count = index ? index.count : position.count;
    const at = (i: number) => (index ? index.getX(i) : i);

    const keep: number[] = [];
    const spin: number[] = [];
    for (let i = 0; i < count; i += 3) {
      const [i0, i1, i2] = [at(i), at(i + 1), at(i + 2)];
      a.fromBufferAttribute(position, i0).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(position, i1).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(position, i2).applyMatrix4(object.matrixWorld);
      mid.addVectors(a, b).add(c).divideScalar(3);

      const radius = Math.hypot(mid.x - hub.x, mid.y - hub.y);
      const alongAxle = Math.abs(mid.z - hub.z);
      const isSail = alongAxle < slice && radius > inner && radius < outer;
      (isSail ? spin : keep).push(i0, i1, i2);
    }
    sailTriangles += spin.length / 3;

    const clone = (indices: number[]) => {
      const part = geometry.clone();
      part.setIndex(indices);
      const mesh = new THREE.Mesh(part, object.material);
      mesh.applyMatrix4(object.matrixWorld);
      mesh.castShadow = true;
      return mesh;
    };
    if (keep.length > 0) still.add(clone(keep));
    if (spin.length > 0) turning.add(clone(spin));
  });

  // Six arms of a few hundred vertices; anything much smaller means the
  // measurements no longer match the art.
  if (sailTriangles < 20) return null;
  return { still, turning, hub };
}

/** A windmill whose sails turn, if the sails can be found in the mesh. */
function Windmill({ part, sails }: { part: DecorPart; sails: Sails }) {
  const model = useProp(part.node, { height: part.height, footprint: part.footprint });
  const split = useMemo(() => splitSails(model, sails), [model, sails]);
  const spinner = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (spinner.current) spinner.current.rotation.z = clock.elapsedTime * sails.speed * Math.PI * 2;
  });

  if (!split) return <primitive object={model} />;

  return (
    <group>
      <primitive object={split.still} />
      {/* Offset in, rotate, offset back out: the sails turn about their hub. */}
      <group position={split.hub} ref={spinner}>
        <group position={split.hub.clone().negate()}>
          <primitive object={split.turning} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Chimney smoke

/** Seconds for one puff to rise and fade. */
const PUFF_CYCLE = 5.5;
/** How far a puff climbs above the chimney. */
const PUFF_RISE = 0.8;
/** Sideways drift as it rises, so the column leans like real smoke. */
const PUFF_DRIFT = 0.26;
/** Size of a puff at the chimney, in world units. */
const PUFF_SIZE = 0.19;
/** How much bigger it gets on the way up. */
const PUFF_SPREAD = 0.85;
/**
 * Faintest of all: this drifts across the farm she is trying to look at, so it
 * reads as a hint of smoke rather than a cloud sitting on the view.
 */
const PUFF_OPACITY = 0.26;
/** Gone by this point in the climb, so no puff lingers over the fields. */
const PUFF_FADED_BY = 0.72;

/**
 * Smoke from the chimney, built from the pack's own cloud meshes so it sits in
 * the same art style as the rest of the farm.
 *
 * Each puff loops independently on a staggered phase: it rises, spreads, leans
 * with the breeze and fades out. The whole thing runs off refs in one frame
 * loop and never re-renders.
 */
function ChimneySmoke({ x, y, z }: { x: number; y: number; z: number }) {
  const clouds = [
    useProp(PROP.puffs[0], { footprint: PUFF_SIZE }),
    useProp(PROP.puffs[1], { footprint: PUFF_SIZE }),
    useProp(PROP.puffs[2], { footprint: PUFF_SIZE }),
  ];

  // One material per puff: they fade on their own schedule, and a shared
  // material would make them blink in unison.
  const puffs = useMemo(
    () =>
      clouds.map((cloud) => {
        const group = cloud.clone(true);
        const material = new THREE.MeshStandardMaterial({
          color: "#f6f3ec",
          transparent: true,
          depthWrite: false,
          roughness: 1,
        });
        group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.material = material;
            o.castShadow = false;
            o.receiveShadow = false;
          }
        });
        return { group, material };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    clouds,
  );

  useFrame(({ clock }) => {
    for (let i = 0; i < puffs.length; i++) {
      const { group, material } = puffs[i];
      const phase = ((clock.elapsedTime / PUFF_CYCLE + i / puffs.length) % 1 + 1) % 1;

      group.position.set(phase * PUFF_DRIFT, phase * PUFF_RISE, phase * PUFF_DRIFT * 0.35);
      // Small and dense at the chimney, wider and thinner on the way up.
      group.scale.setScalar(0.55 + phase * PUFF_SPREAD);
      group.rotation.y = phase * 1.2 + i;

      // Curls out of the stack quickly, then thins away well before the top of
      // its climb — a puff at full size AND full opacity is what blocks the view.
      const fade =
        phase < 0.18
          ? phase / 0.18
          : Math.max(0, 1 - (phase - 0.18) / (PUFF_FADED_BY - 0.18));
      material.opacity = fade ** 1.6 * PUFF_OPACITY;
      group.visible = material.opacity > 0.01;
    }
  });

  return (
    <group position={[x, y, z]}>
      {puffs.map((puff, i) => (
        <primitive key={i} object={puff.group} />
      ))}
    </group>
  );
}

/** Decor is tap-to-learn like everything else on the farm. */
function DecorModel({ kind }: { kind: string }) {
  const parts = getDecorProp(kind);
  const chimney = CHIMNEYS[kind];
  return (
    <group>
      {parts.map((part, i) => (
        <DecorPartModel key={i} part={part} sails={i === 0 ? SAILS[kind] : undefined} />
      ))}
      {chimney && <ChimneyOn part={parts[0]} chimney={chimney} />}
    </group>
  );
}

/**
 * Puts the smoke on top of the chimney. The chimney is stored as a fraction of
 * the model's own size, so it has to be measured against the fitted mesh —
 * hard-coding world units would drift the moment the house is resized.
 */
function ChimneyOn({ part, chimney }: { part: DecorPart; chimney: Chimney }) {
  const model = useProp(part.node, { height: part.height, footprint: part.footprint });
  const at = useMemo(() => {
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    return {
      x: (part.x ?? 0) + chimney.fx * size.x,
      // Just inside the stack, so the first puff appears to come out of it.
      y: size.y * 0.97,
      z: (part.z ?? 0) + chimney.fz * size.z,
    };
  }, [model, part, chimney]);

  return <ChimneySmoke x={at.x} y={at.y} z={at.z} />;
}

/** One mesh of a decoration. Its own component so each calls useProp once. */
function DecorPartModel({ part, sails }: { part: DecorPart; sails?: Sails }) {
  if (sails) {
    return (
      <group position={[part.x ?? 0, 0, part.z ?? 0]} rotation={[0, part.rotY ?? 0, 0]}>
        <Windmill part={part} sails={sails} />
      </group>
    );
  }
  return <StaticPartModel part={part} />;
}

function StaticPartModel({ part }: { part: DecorPart }) {
  const model = useProp(part.node, { height: part.height, footprint: part.footprint });
  return (
    <primitive
      object={model}
      position={[part.x ?? 0, 0, part.z ?? 0]}
      rotation={[0, part.rotY ?? 0, 0]}
    />
  );
}

// ---------------------------------------------------------------------------
// Ground

function gridOrigin(farm: FarmState): { x0: number; z0: number } {
  return { x0: -((farm.cols - 1) / 2) * TILE, z0: -((farm.rows - 1) / 2) * TILE };
}

function Island({ farm }: { farm: FarmState }) {
  const width = farm.cols * TILE + 2.8;
  const depth = farm.rows * TILE + 3.0;
  return (
    <group position={[0, 0, -0.2]}>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[width, 0.3, depth]} />
        <meshStandardMaterial color="#5ec95f" />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[width, 0.9, depth]} />
        <meshStandardMaterial color="#8a6242" />
      </mesh>
      <mesh position={[0, -1.35, 0]}>
        <boxGeometry args={[width * 0.94, 0.3, depth * 0.94]} />
        <meshStandardMaterial color="#77543a" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Tiles & crops

function TileCell({
  tile,
  index,
  farm,
  now,
  tilling,
  coins,
  onTap,
}: {
  tile: Tile;
  index: number;
  farm: FarmState;
  now: number;
  tilling: boolean;
  coins: FloatingCoin[];
  onTap: () => void;
}) {
  const { x0, z0 } = gridOrigin(farm);
  const x = x0 + (index % farm.cols) * TILE;
  const z = z0 + Math.floor(index / farm.cols) * TILE;
  const soil = useMemo(() => getSoilTexture(PLOT_TEXTURE.radius, PLOT_TEXTURE.feather), []);
  const skirt = useMemo(
    () => getSoilTexture(PLOT_SKIRT_TEXTURE.radius, PLOT_SKIRT_TEXTURE.feather),
    [],
  );
  const [hover, setHover] = useState(false);
  const field = tile.kind === "field";
  // Grass highlights only while ploughing; a field always answers taps.
  const lit = hover && (field ? !tilling : tilling);

  // The plough sweeps the earth in from one edge. It only runs when a tile
  // actually turns into farmland — fields already there on load start settled,
  // so opening the farm doesn't replay every plot she has ever ploughed.
  const sweep = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Mesh>(null);
  const progress = useRef(1);
  const settled = useRef(true);
  const wasField = useRef(field);
  if (wasField.current !== field) {
    if (field) progress.current = 0;
    wasField.current = field;
  }
  const ploughing = progress.current < 1;
  const swept = 1 - Math.pow(1 - progress.current, 3);

  useFrame((_, delta) => {
    const group = sweep.current;
    if (!group) return;

    if (progress.current >= 1) {
      if (!settled.current) {
        group.scale.x = 1;
        group.position.x = 0;
        if (dust.current) dust.current.visible = false;
        settled.current = true;
      }
      return;
    }
    settled.current = false;

    progress.current = Math.min(1, progress.current + Math.min(delta, 1 / 30) / PLOUGH_TIME);
    const t = 1 - Math.pow(1 - progress.current, 3);

    // Grow from the left edge rightwards, so the earth is revealed behind the
    // plough rather than fading in everywhere at once.
    group.scale.x = Math.max(0.001, t);
    group.position.x = -0.5 * (1 - t);

    const puff = dust.current;
    if (puff) {
      puff.visible = true;
      puff.position.x = -0.5 + t * TILE;
      const spread = 0.4 + t * 0.55;
      puff.scale.set(spread, spread, 1);
      (puff.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - t);
    }
  });

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        if (isTap(e)) onTap();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {/*
        A plot is earth laid on a raised bed of grass. Plain meadow draws no
        bed at all — the island's own surface is the grass — so an untouched
        farm is one unbroken field instead of a grid of waiting slots. Drawing
        a bed per cell also meant every cell edge met its neighbour's, and
        those seams showed as lines across the lawn.

        The grid comes back the moment she picks up the plough, because then
        the cells are what she is aiming at.
      */}
      {field || tilling ? (
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[TILE * 0.98, 0.06, TILE * 0.98]} />
          <meshStandardMaterial color={!field && lit ? "#8ade6f" : "#66cf62"} />
        </mesh>
      ) : (
        // Nothing to see, but the cell still has to answer a tap.
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE, TILE]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {field && (
        <>
          {/* Dust thrown up at the plough's leading edge. */}
          <mesh
            ref={dust}
            visible={ploughing}
            position={[0, 0.07, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[TILE, TILE]} />
            <meshBasicMaterial map={getDustTexture()} transparent depthWrite={false} />
          </mesh>

          {/*
            These two props mirror the frame loop's current value rather than a
            fixed start, so the scene re-rendering mid-sweep (the crop clock
            ticks every second) doesn't snap the plough back to the edge.
          */}
          <group ref={sweep} scale-x={Math.max(0.001, swept)} position-x={-0.5 * (1 - swept)}>
          {/*
            Loose earth feathering into the lawn, so a plot doesn't sit on the
            grass as a hard square. It stops short of the cell edge, leaving
            the grass between beds visible.
          */}
          <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[TILE * PLOT_SKIRT_SCALE, TILE * PLOT_SKIRT_SCALE]} />
            <meshBasicMaterial
              map={skirt}
              transparent
              depthWrite={false}
              color={lit ? "#ffd9ad" : "#ffffff"}
            />
          </mesh>
          {/* Smaller than the cell, so grass shows between neighbouring beds. */}
          <mesh position={[0, 0.064, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE * PLOT_SCALE, TILE * PLOT_SCALE]} />
            {/*
              alphaTest rather than transparency: the plot then draws in the
              opaque pass and writes depth, so it reliably covers the skirts of
              its neighbours instead of fighting them for sort order.
            */}
            <meshStandardMaterial
              map={soil}
              alphaTest={0.5}
              roughness={1}
              color={lit ? "#ffd9ad" : "#ffffff"}
            />
          </mesh>
          </group>
        </>
      )}

      {tile.crop && <CropProp tile={tile} now={now} />}

      {coins.map((coin) => (
        <Html key={coin.key} position={[0, 0.9, 0]} center zIndexRange={[10, 0]}>
          <span className="animate-coin-float pointer-events-none flex items-center gap-1">
            <img src={TEX.coin} alt="" className="h-6 w-6" />
            <span className="text-sm font-extrabold text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
              +{coin.amount}
            </span>
          </span>
        </Html>
      ))}
    </group>
  );
}

function CropProp({ tile, now }: { tile: Tile; now: number }) {
  const crop = tile.crop!;
  const def = getCropDef(crop.cropId);
  const state = crops.cropState(crop, def, now);
  const progress = crops.growthProgress(crop, def, now);

  const sprout = useProp(PROP.sprout, { height: 0.26, footprint: 0.5 });
  const young = useProp(PROP.young, { height: 0.42, footprint: 0.6 });
  const grown = useProp(CROP_PROP[def.id] ?? PROP.young, { height: 0.6, footprint: 0.8 });
  const wilted = useWiltedProp(CROP_PROP[def.id] ?? PROP.young, 0.45);

  const sway = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!sway.current) return;
    const t = clock.elapsedTime;
    if (state === "growing") {
      sway.current.rotation.z = Math.sin(t * 2 + tile.id.length) * 0.06;
      sway.current.position.y = 0;
    } else if (state === "ready") {
      sway.current.rotation.z = 0;
      sway.current.position.y = Math.abs(Math.sin(t * 3.2)) * 0.08;
    } else {
      sway.current.rotation.z = 0;
      sway.current.position.y = 0;
    }
  });

  const model =
    state === "wilted" ? wilted : state === "ready" ? grown : progress < 0.45 ? sprout : young;

  return (
    <group>
      <group ref={sway}>
        <SpawnAnimation drop={0.5}>
          <primitive object={model} position={[0, 0.06, 0]} />
        </SpawnAnimation>
      </group>
      {state === "growing" && (
        <Html position={[0, 0.75, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
            {formatDuration(crops.readyAt(crop, def) - now)}
          </span>
        </Html>
      )}
      {state === "wilted" && (
        <Html position={[0, 0.75, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span className="text-base">🥀</span>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Decor & animals

function AnimalProp({ animal, index }: { animal: Animal; index: number }) {
  const def = getSpeciesDef(animal.speciesId);
  const height = ANIMAL_HEIGHT[animal.speciesId] ?? DEFAULT_ANIMAL_HEIGHT;
  const model = useProp(ANIMAL_PROP[animal.speciesId] ?? PROP.tree, {
    height,
    footprint: 1.0,
  });
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bob.current) return;
    // A tiny idle hop so the animals feel alive.
    bob.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2 + index * 2)) * 0.04;
  });

  return (
    <group>
      <group ref={bob}>
        <SpawnAnimation delay={0.5 + index * 0.1}>
          <primitive object={model} rotation={[0, 0.5 - index * 0.4, 0]} />
        </SpawnAnimation>
      </group>
      <Html position={[0, height + 0.25, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-farm-700 shadow-sm">
          {animal.name ?? def.word}
        </span>
      </Html>
    </group>
  );
}
