/* Shrinks a photo from the camera or gallery into two JPEGs: a full one to open (up to 1200 px, about 150 to 250 KB)
   and a small one for lists (360 px, about 20 to 30 KB). Both are data URLs, stored in their own Firestore documents. */
const FULL = { px: 1200, q: 0.78 }, THUMB = { px: 360, q: 0.72 };

async function decode(file) {
  // createImageBitmap honours the photo's rotation in current browsers; fall back to an <img> where it's missing.
  if ("createImageBitmap" in self) {
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

function draw(src, { px, q }) {
  const w = src.width, h = src.height, k = Math.min(1, px / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}

/* -> { photo, thumb } as data URLs. Throws if the file isn't an image the browser can read. */
export async function shrinkPhoto(file) {
  const src = await decode(file);
  const out = { photo: draw(src, FULL), thumb: draw(src, THUMB) };
  if (src.close) src.close();
  return out;
}

export const dataBytes = s => Math.round((s.length - s.indexOf(",") - 1) * 3 / 4);
