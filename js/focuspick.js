/* The photo part of a form, and "Adjust thumbnail" (from Lunker League): take the photo with the in-app camera or pick
   one from the gallery, then slide the square that lists and the feed show along the photo. Used by the log form and
   Make it. */
import { el, fill, icon, openSheet, closeSheet } from "./ui.js";
import { focusAt, frameRect, isCentred, focusStyle } from "./thumbfocus.js";
import { pickImage, shrinkPhoto } from "./photo.js";

/* The photo with the square drawn on it. Tap or drag to move the square; the preview shows the thumbnail as it will look.
   src: the small copy (the whole photo). done(focus) gets { x, y }, or null for the middle. */
export function pickFocus(src, current, done) {
  let focus = current && !isCentred(current) ? { ...current } : null;
  openSheet(box => {
    const photo = el("img", { src, alt: "Your photo", draggable: "false" });
    const frame = el("div", { class: "focus-frame", "aria-hidden": "true" });
    const area = el("div", { class: "focus-area" }, photo, frame);
    const preview = el("img", { class: "log-thumb", src, alt: "Thumbnail preview" });
    const aspect = () => (photo.naturalWidth && photo.naturalHeight ? photo.naturalWidth / photo.naturalHeight : 1);
    const draw = () => {
      const r = frameRect(focus, aspect());
      frame.style.cssText = `left:${r.left * 100}%;top:${r.top * 100}%;width:${r.w * 100}%;height:${r.h * 100}%`;
      preview.style.objectPosition = focus ? `${focus.x}% ${focus.y}%` : "";
    };
    const move = e => {
      const b = photo.getBoundingClientRect();
      const f = focusAt((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, aspect());
      focus = isCentred(f) ? null : f;
      draw();
    };
    let dragging = false;
    area.addEventListener("pointerdown", e => { dragging = true; area.setPointerCapture(e.pointerId); move(e); });
    area.addEventListener("pointermove", e => { if (dragging) move(e); });
    area.addEventListener("pointerup", () => { dragging = false; });
    area.addEventListener("pointercancel", () => { dragging = false; });
    photo.addEventListener("load", draw);
    box.append(el("div", { class: "stack" },
      el("h2", { text: "Adjust thumbnail" }),
      el("p", { class: "hint", text: "Tap or drag on your drink. The square is what shows in lists and the feed." }),
      area,
      el("div", { class: "row focus-preview" }, preview, el("span", { class: "muted small", text: "How it looks in the feed" })),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Middle", onclick: () => { focus = null; draw(); } }),
        el("button", { class: "btn primary", type: "button", text: "Done", onclick: () => { closeSheet(); done(focus); } }))));
    if (photo.complete) draw();
  });
}

/* st: { pics, thumb, focus }, changed as the person goes. pics: undefined = unchanged, null = no photo,
   { photo, thumb } = a new photo. thumb: the small copy shown (set it later with draw() when an old one loads).
   focus: where the square sits, or null for the middle. changed() runs after each change. */
export function photoField(st, changed = () => {}) {
  // The photo area itself opens the camera too (the same as the Camera button), or retakes the photo.
  const area = el("button", { type: "button", class: "photo-pick", onclick: () => take(true) });
  const thumbRow = el("div", { class: "row focus-preview" });
  const msg = el("p", { class: "msg", role: "status" });
  const draw = () => {
    area.setAttribute("aria-label", st.thumb ? "Retake the photo with the camera" : "Take a photo with the camera");
    fill(area, st.thumb
      ? el("img", { src: st.thumb, alt: "Your photo" })
      : el("div", { class: "photo-empty" }, el("span", { html: icon.camera }), el("span", { text: "Tap to take a photo of your drink" })));
    fill(thumbRow, st.thumb ? [
      el("img", { class: "log-thumb", src: st.thumb, alt: "Thumbnail", style: focusStyle(st) }),
      el("div", { class: "grow stack-tight" }, el("span", { class: "muted small", text: "How it shows in lists and the feed" }),
        el("div", { class: "row" },
          el("button", { class: "btn small", type: "button", text: "🎯 Adjust thumbnail",
            onclick: () => pickFocus(st.thumb, st.focus, f => { st.focus = f; draw(); changed(); }) }),
          el("button", { class: "btn small", type: "button", text: "Remove",
            onclick: () => { st.pics = null; st.thumb = null; st.focus = null; draw(); changed(); } })))] : []);
  };
  const take = async camera => {
    const file = await pickImage({ camera });
    if (!file) return;
    msg.className = "msg ok"; msg.textContent = "Preparing photo…";
    try {
      st.pics = await shrinkPhoto(file);
      st.thumb = st.pics.thumb; st.focus = null;
      msg.textContent = "";
      draw(); changed();
    } catch (e) {
      console.warn(e);
      msg.className = "msg err"; msg.textContent = "That photo couldn't be read. Try another one.";
    }
  };
  draw();
  const node = el("div", { class: "stack" }, area,
    el("div", { class: "row" },
      el("button", { class: "btn", type: "button", html: icon.camera, onclick: () => take(true) }, "Camera"),
      el("button", { class: "btn", type: "button", html: icon.image, onclick: () => take(false) }, "Gallery")),
    thumbRow, msg,
    el("p", { class: "hint", text: "The camera opens right here in the app. You can also take it with your phone's camera app and pick it with Gallery." }));
  return { node, draw };
}
