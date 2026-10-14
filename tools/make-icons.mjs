// Draws the app icons (a rocks glass of amber with ice and a citrus wheel, on dark bar wood) and writes them as PNGs,
// with no dependencies. Run from the repo root: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const TOP = hex("#3A1F16"), BOTTOM = hex("#120D0B");
const GLASS = hex("#F7EBDD"), INSIDE = hex("#4A3128"), AMBER_TOP = hex("#F7B547"), AMBER_BOTTOM = hex("#C8701A");
const ICE = hex("#EAF6F8"), ICE_IN = hex("#FAD08A"), CORAL = hex("#FF6A3D"), PULP = hex("#FFC2A8"), NEON = hex("#FF4F8B");

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
/* A square of half-size h centred on (cx, cy), turned by `deg` degrees. Returns how far in from the edge (or -1). */
function inSquare(x, y, cx, cy, h, deg) {
  const a = -deg * Math.PI / 180, dx = x - cx, dy = y - cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a), ry = dx * Math.sin(a) + dy * Math.cos(a);
  const m = Math.max(Math.abs(rx), Math.abs(ry));
  return m <= h ? h - m : -1;
}

// The glass: wider at the top, from y 0.32 to 0.80.
const G_TOP = 0.32, G_BOT = 0.80, WALL = 0.03, BASE = 0.06, LIQUID = 0.52;
const left = y => 0.24 + 0.06 * (y - G_TOP) / (G_BOT - G_TOP);
const right = y => 0.76 - 0.06 * (y - G_TOP) / (G_BOT - G_TOP);

/* Colour at a point in the unit square. `k` shrinks the artwork toward the centre (for maskable icons). */
function shade(u, v, k) {
  let c = mix(TOP, BOTTOM, v);
  const x = 0.5 + (u - 0.5) / k, y = 0.5 + (v - 0.5) / k;
  // A soft neon glow behind the glass.
  const glow = Math.max(0, 1 - Math.hypot(x - 0.5, y - 0.58) / 0.42);
  c = mix(c, NEON, glow * glow * 0.28);
  const inGlass = y >= G_TOP && y <= G_BOT && x >= left(y) && x <= right(y);
  const inInside = y >= G_TOP && y <= G_BOT - BASE && x >= left(y) + WALL && x <= right(y) - WALL;
  if (inGlass && !inInside) c = GLASS;
  if (inInside) {
    c = y >= LIQUID ? mix(AMBER_TOP, AMBER_BOTTOM, (y - LIQUID) / (G_BOT - BASE - LIQUID)) : INSIDE;
    for (const [cx, cy, deg] of [[0.42, 0.53, 14], [0.585, 0.49, -18]]) {
      const e = inSquare(x, y, cx, cy, 0.075, deg);
      if (e >= 0) c = e < 0.012 ? [255, 255, 255] : y >= LIQUID ? ICE_IN : ICE;
    }
    // A highlight down the left side of the glass.
    if (x > left(y) + WALL + 0.02 && x < left(y) + WALL + 0.04 && y > G_TOP + 0.05 && y < G_BOT - BASE - 0.05) c = mix(c, [255, 255, 255], 0.35);
  }
  // The citrus wheel sitting on the rim.
  if (inCircle(x, y, 0.73, 0.31, 0.12)) {
    c = CORAL;
    if (inCircle(x, y, 0.73, 0.31, 0.095)) {
      c = PULP;
      const ang = Math.atan2(y - 0.31, x - 0.73);
      if (Math.abs(Math.sin(ang * 4)) < 0.12) c = [255, 240, 230];
      if (inCircle(x, y, 0.73, 0.31, 0.018)) c = [255, 240, 230];
    }
  }
  return c;
}

function draw(size, k) {
  const S = 4, px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = shade((i + (sx + 0.5) / S) / size, (j + (sy + 0.5) / S) / size, k);
      r += c[0]; g += c[1]; b += c[2];
    }
    const o = (j * size + i) * 4, n = S * S;
    px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n; px[o + 3] = 255;
  }
  return png(size, px);
}

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
  head[8] = 8; head[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon-192.png", draw(192, 1));
writeFileSync("icons/icon-512.png", draw(512, 1));
writeFileSync("icons/apple-touch-icon.png", draw(180, 1));
writeFileSync("icons/icon-maskable-512.png", draw(512, 0.78)); // artwork kept inside the maskable safe zone
console.log("Icons written to icons/");
