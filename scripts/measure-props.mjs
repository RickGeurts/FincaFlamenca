// Print the world-space bounding-box size of every prop in farm-props.glb,
// so scene target sizes can be chosen from data instead of guesswork.
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(process.argv[2] ?? "public/models/farm-props.glb");
const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

function transformPoint(m, [x, y, z]) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

for (const node of scene.listChildren()) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (n) => {
    const mesh = n.getMesh();
    if (mesh) {
      const m = n.getWorldMatrix();
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute("POSITION");
        if (!pos) continue;
        const pMin = pos.getMin([]);
        const pMax = pos.getMax([]);
        for (const corner of [
          [pMin[0], pMin[1], pMin[2]], [pMax[0], pMin[1], pMin[2]],
          [pMin[0], pMax[1], pMin[2]], [pMin[0], pMin[1], pMax[2]],
          [pMax[0], pMax[1], pMin[2]], [pMax[0], pMin[1], pMax[2]],
          [pMin[0], pMax[1], pMax[2]], [pMax[0], pMax[1], pMax[2]],
        ]) {
          const p = transformPoint(m, corner);
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], p[i]);
            max[i] = Math.max(max[i], p[i]);
          }
        }
      }
    }
    n.listChildren().forEach(visit);
  };
  visit(node);
  const size = max.map((v, i) => (v - min[i]).toFixed(2));
  console.log(
    `${node.getName().padEnd(24)} w=${size[0]} h=${size[1]} d=${size[2]}`,
  );
}
