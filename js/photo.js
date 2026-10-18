/* Photos: taken with the in-app camera or picked from the gallery, then shrunk on the phone into two JPEGs: a full one
   to open (up to 1200 px, about 150 to 250 KB) and a small one for lists (360 px, about 20 to 30 KB). Both are data
   URLs, stored in their own Firestore documents. */
import { el } from "./ui.js";
import { openCamera } from "./camera.js";

const FULL = { px: 1200, q: 0.78 }, THUMB = { px: 360, q: 0.72 };

/* Opens the camera or the gallery and resolves with the chosen File, or null if cancelled.
   The camera is the in-app viewfinder; the phone's camera app is only a fallback where that can't run. */
export async function pickImage({ camera = false } = {}) {
  if (camera) {
    const shot = await openCamera();
    if (shot !== "unavailable") return shot;
  }
  return new Promise(resolve => {
    const input = el("input", { type: "file", accept: "image/*", hidden: true });
    if (camera) input.setAttribute("capture", "environment");
    let done = false;
    const finish = f => { if (done) return; done = true; input.remove(); resolve(f); };
    input.addEventListener("change", () => finish(input.files && input.files[0] || null));
    input.addEventListener("cancel", () => finish(null));
    document.body.append(input);
    input.click();
  });
}

/* Decodes with the photo's rotation applied, so portrait shots come out upright. Big camera photos (50+ megapixels on
   some phones) are shrunk while decoding: unpacking one at full size needs hundreds of MB, which on Android can fail
   with "low memory" (Lunker League 0.2.1). Falls back to an <img> where createImageBitmap is missing. */
async function decode(file, longEdge) {
  if ("createImageBitmap" in self) {
    const short = await shortSide(file);
    // Shrinking by width alone keeps the shape whichever way the phone was held.
    const opts = { imageOrientation: "from-image" };
    if (!short || short > longEdge) Object.assign(opts, { resizeWidth: longEdge, resizeQuality: "high" });
    try { return await createImageBitmap(file, opts); } catch {}
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

/* The shorter side of a JPEG in pixels, read from its header without decoding it. Null if unknown. */
async function shortSide(file) {
  try {
    const v = new DataView(await file.slice(0, 512 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return null;
    let p = 2;
    while (p + 9 < v.byteLength) {
      const m = v.getUint16(p), len = v.getUint16(p + 2);
      if (m >= 0xFFC0 && m <= 0xFFCF && ![0xFFC4, 0xFFC8, 0xFFCC].includes(m)) return Math.min(v.getUint16(p + 5), v.getUint16(p + 7));
      if ((m & 0xFF00) !== 0xFF00) return null;
      p += 2 + len;
    }
  } catch {}
  return null;
}

function draw(src, { px, q }) {
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, px / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", q);
  c.width = 0; c.height = 0; // frees the pixels straight away
  return url;
}

/* -> { photo, thumb } as data URLs. Throws if the file isn't an image the browser can read. */
export async function shrinkPhoto(file) {
  const src = await decode(file, FULL.px * 4 / 3);
  const out = { photo: draw(src, FULL), thumb: draw(src, THUMB) };
  if (src.close) src.close();
  return out;
}

export const dataBytes = s => Math.round((s.length - s.indexOf(",") - 1) * 3 / 4);
