// Build tool: extracts only the props the game needs from the purchased
// "Cartoon Farm Islands" Exteriors.glb into a small public/models/farm-props.glb.
// Usage: node scripts/extract-farm-props.mjs <path-to-Exteriors.glb>

import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, quantize } from "@gltf-transform/functions";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Props to keep, by exact node name in the source file.
const KEEP = [
  // Soil bed for tilled fields
  "Isl_1_Garden_1",
  // Crops (mapped to game crops in src/ui/farm/three/props.ts)
  "Isl_1_Carrot_2", // wortel
  "Isl_2_Flowers_1", // tulp
  "Isl_1_Turnip_1", // aardappel
  "Isl_3_Tomato_Bush_2", // tomaat (full)
  "Isl_3_Tomato_Bush_1", // tomaat (young) / generic mid stage
  "Isl_2_Corn_1", // mais
  "Isl_4_Wheat_Ear_1", // banaan stand-in until better art
  "Isl_10_Bush_1", // koffie bush
  // Growth stages
  "Isl_3_Plant_1", // sprout
  "Isl_3_Plant_2", // young plant
  // Animals
  "Isl_1_Chicken_1", // kip
  "Isl_5_Cow_1", // koe
  "Isl_6_Pig_1", // varken
  // Decor around the meadow
  "Isl_1_House_1",
  "Isl_8_Windmill_1",
  "Isl_5_Tree_1",
  "Isl_1_Cart_1",
  "Isl_4_Stand_1",
  "Isl_9_Well_1",
  // Decoration shop (mapped to DECOR in src/game/economy.ts)
  "Isl_5_Stone_1", // steen
  "Isl_9_Path_1", // pad
  "Isl_6_Plant_1", // plant
  "Isl_5_Bush_1", // struik
  "Isl_9_Garden_with_Flowers_1", // bloemen
  "Isl_5_Fence_1", // hek
  "Isl_1_Pumpkin_1", // pompoen
  "Isl_1_Barrel_1", // vat
  "Isl_9_Watering_can_1", // gieter
  "Isl_9_Bench_1", // bank
  "Isl_10_Table_1", // tafel
  "Isl_10_Stool_1", // tafel (second part)
  "Isl_7_Lamp_1", // lamp
  "Isl_4_Haystack_1", // hooiberg
  "Isl_7_Bridge_1", // brug
  "Isl_6_Lake_1", // vijver
  "Isl_9_Tree_1", // boomgaard
  "Isl_10_Beehouse_1", // bijenkorf
  "Isl_9_Barn_1", // schuur
  "Isl_8_Tractor_1", // tractor
  // Chimney smoke — the pack ships low-poly clouds that match the art style
  "Isl_8_Cloud_1",
  "Isl_8_Cloud_2",
  "Isl_8_Cloud_3",
];

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/extract-farm-props.mjs <Exteriors.glb>");
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../public/models/farm-props.glb");

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(src);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

const found = new Set();
for (const island of [...scene.listChildren()]) {
  for (const node of [...island.listChildren()]) {
    const name = node.getName();
    if (KEEP.includes(name)) {
      found.add(name);
      // Bake the full world transform (island rotation/scale included) into
      // the node before reparenting — otherwise props end up lying on their
      // side once the island parent is gone.
      node.setMatrix(node.getWorldMatrix());
      island.removeChild(node);
      scene.addChild(node);
    }
  }
  scene.removeChild(island); // drop the rest of the island
  island.dispose();
}

const missing = KEEP.filter((n) => !found.has(n));
if (missing.length > 0) {
  console.error(`missing nodes: ${missing.join(", ")}`);
  process.exit(1);
}

await doc.transform(prune(), quantize());
await io.write(out, doc);
console.log(`wrote ${out} with ${found.size} props`);
