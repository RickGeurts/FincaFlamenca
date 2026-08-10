// Build tool: draws the app icons for the PWA manifest, so there is no binary
// asset to keep in sync by hand. Re-run after changing the design:
//   node scripts/make-icons.mjs
//
// Deliberately dependency-free — it rasterises into a pixel buffer and writes
// the PNG itself (zlib is built into Node).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../public/icons");

// ---------------------------------------------------------------------------
// PNG writing

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline is prefixed with filter byte 0 (none).
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The icon: a leaf on a warm green tile, matching the farm's palette.

const BACKDROP = [87, 185, 71]; // leaf-500
const LEAF = [247, 243, 226]; // cream
const VEIN = [87, 185, 71];

/** Smooth 0..1 coverage across an edge, for antialiasing. */
function edge(distance, softness = 1.2) {
  return Math.min(1, Math.max(0, 0.5 - distance / softness));
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  // Maskable icons get cropped to a circle on some launchers, so the artwork
  // stays inside the middle 80%.
  const radius = size * 0.22; // corner radius of the tile
  const leafR = size * 0.3;
  const leafOffset = size * 0.17;

  const put = (i, [r, g, b], a) => {
    rgba[i] = Math.round(rgba[i] * (1 - a) + r * a);
    rgba[i + 1] = Math.round(rgba[i + 1] * (1 - a) + g * a);
    rgba[i + 2] = Math.round(rgba[i + 2] * (1 - a) + b * a);
    rgba[i + 3] = Math.max(rgba[i + 3], Math.round(255 * a));
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // Rounded-square backdrop.
      const dx = Math.max(Math.abs(px - c) - (size / 2 - radius), 0);
      const dy = Math.max(Math.abs(py - c) - (size / 2 - radius), 0);
      const corner = Math.hypot(dx, dy) - radius;
      put(i, BACKDROP, edge(corner));

      // Leaf: where two circles overlap, turned 45° so it points up-right.
      const rx = (px - c) * Math.SQRT1_2 - (py - c) * Math.SQRT1_2;
      const ry = (px - c) * Math.SQRT1_2 + (py - c) * Math.SQRT1_2;
      const inA = Math.hypot(rx + leafOffset, ry) - leafR;
      const inB = Math.hypot(rx - leafOffset, ry) - leafR;
      const leaf = Math.min(edge(inA), edge(inB));
      put(i, LEAF, leaf);

      // A single vein down the middle of the leaf.
      const vein = Math.min(leaf, edge(Math.abs(ry) - size * 0.012));
      if (vein > 0) put(i, VEIN, vein * 0.55);
    }
  }
  return rgba;
}

mkdirSync(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  const file = resolve(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, drawIcon(size)));
  console.log(`wrote ${file}`);
}
