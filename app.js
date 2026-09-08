/* No services, tracking, runtime dependencies, or remote assets. */
(function () {
  "use strict";
  const M = CardModel,
    R = CardRenderer,
    $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "profile-card-maker:draft:v1";
  const fields = [
    "name",
    "bio",
    "handle",
    "badge",
    "style",
    "font",
    "shape",
    "filter",
    "zoom",
    "posX",
    "pos",
    "brightness",
    "texture",
  ];
  const numeric = new Set(["zoom", "posX", "pos", "brightness"]);
  let state = { ...M.DEFAULTS },
    history,
    historyTimer,
    saveTimer,
    toastTimer,
    frame,
    renderVersion = 0,
    uploadVersion = 0;
  let decodedSource = null,
    decodedImage = null,
    gradedKey = null,
    gradedPhoto = null;
  let drag = null;
  const bios = [
    "Main character energy, background character budget.",
    "Professionally unavailable until further notice.",
    "Powered by snacks and questionable decisions.",
    "I came, I saw, I forgot why I came.",
    "Currently accepting compliments and pizza.",
    "Too glam to give a damn. Occasionally.",
    "Probably late, definitely worth it.",
    "Fluent in sarcasm and unnecessary side quests.",
    "Low battery, high standards.",
    "Do not disturb unless you have gossip.",
    "An adult, technically.",
    "Here for a good time and a suspiciously long nap.",
    "Plot armor pending approval.",
    "My hobbies include overthinking and opening tabs.",
    "Certified expert in making simple things complicated.",
    "Limited edition. Questionable condition.",
    "Running on caffeine and cinematic delusions.",
    "Side quest enthusiast. Final boss procrastinator.",
  ];
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => ($("toast").hidden = true), 4200);
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, M.project(state));
      $("draftStatus").textContent = "Draft saved on this device";
    } catch {
      $("draftStatus").textContent = "Draft not saved — use Save project";
      toast(
        "Browser storage is unavailable or full. Use Save project to keep this card.",
      );
    }
  }
  function scheduleSave() {
    $("draftStatus").textContent = "Saving draft…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 800);
  }
  function flushHistory() {
    clearTimeout(historyTimer);
    history.push(state);
    updateHistory();
  }
  function updateHistory() {
    $("undo").disabled = !history.canUndo;
    $("redo").disabled = !history.canRedo;
  }
  function sync() {
    for (const id of fields) {
      if (id === "texture") $(id).checked = state[id];
      else if (String($(id).value) !== String(state[id]))
        $(id).value = state[id];
    }
    $("customAccent").value = state.accent;
    document
      .querySelectorAll("[data-color]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.color === state.accent),
        ),
      );
    document.querySelectorAll("[data-preset]").forEach((b) => {
      const p = M.PRESETS[Number(b.dataset.preset)];
      b.setAttribute(
        "aria-pressed",
        String(
          ["style", "accent", "font", "shape", "filter"].every(
            (k) => state[k] === p[k],
          ),
        ),
      );
    });
    document
      .querySelectorAll("[data-format]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.format === state.format),
        ),
      );
    $("bioCount").textContent = state.bio.length + " / 140";
    $("zoomText").textContent = state.zoom + "%";
    $("brightnessText").textContent = state.brightness + "%";
    $("posXText").textContent =
      state.posX === 0
        ? "Center"
        : (state.posX < 0 ? "Left " : "Right ") +
          Math.abs(Math.round(state.posX));
    $("posText").textContent =
      state.pos === 0
        ? "Center"
        : (state.pos < 0 ? "Up " : "Down ") + Math.abs(Math.round(state.pos));
    $("removePhoto").disabled = !state.photo;
    $("uploadLabel").textContent = state.photo
      ? "Replace photo"
      : "Drop a photo or browse";
    $("canvas").setAttribute(
      "aria-label",
      `Profile card for ${state.name.trim() || "Your Name"}. ${state.bio.trim() || "Main character energy."} ${state.handle} ${state.badge}`,
    );
    $("canvas").style.touchAction = state.photo ? "none" : "pan-y";
    const [w, h] = M.FORMATS[state.format],
      q = Number($("quality").value);
    $("dimensions").textContent = `${w * q} × ${h * q}`;
    fitPreview();
    updateHistory();
  }
  function fitPreview() {
    const box = document.querySelector(".preview-space"),
      [w, h] = M.FORMATS[state.format];
    const width = Math.min(box.clientWidth, (box.clientHeight * w) / h);
    $("previewWrap").style.width = width + "px";
    $("previewWrap").style.height = (width * h) / w + "px";
    $("previewWrap").style.aspectRatio = w + "/" + h;
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(
          new Error("This image could not be opened. Try JPG, PNG, or WEBP."),
        );
      img.src = src;
    });
  }
  async function photoFor(snapshot) {
    if (!snapshot.photo) return null;
    const source = snapshot.photo;
    if (decodedSource !== source) {
      const img = await loadImage(source);
      if (img.width * img.height > 40_000_000)
        throw new Error("Image is too large. Choose one under 40 megapixels.");
      decodedImage = img;
      decodedSource = source;
      gradedKey = null;
    }
    const key = snapshot.filter + ":" + snapshot.brightness;
    if (gradedKey !== key) {
      gradedPhoto = R.grade(decodedImage, snapshot);
      gradedKey = key;
    }
    return gradedPhoto;
  }
  function requestRender() {
    cancelAnimationFrame(frame);
    const version = ++renderVersion;
    const snapshot = { ...state };
    frame = requestAnimationFrame(async () => {
      try {
        const photo = await photoFor(snapshot);
        if (version === renderVersion) R.render($("canvas"), snapshot, photo);
      } catch (e) {
        if (version === renderVersion) {
          R.render($("canvas"), snapshot, null);
          toast(e.message);
        }
      }
    });
  }
  function change(patch, { continuous = false } = {}) {
    state = M.normalize({ ...state, ...patch });
    sync();
    requestRender();
    scheduleSave();
    clearTimeout(historyTimer);
    if (continuous) historyTimer = setTimeout(flushHistory, 450);
    else flushHistory();
  }
  function restore(next) {
    clearTimeout(historyTimer);
    uploadVersion++;
    state = next;
    sync();
    requestRender();
    scheduleSave();
  }
  function undo() {
    flushHistory();
    restore(history.undo());
  }
  function redo() {
    flushHistory();
    restore(history.redo());
  }
  for (const [index, p] of M.PRESETS.entries()) {
    const b = document.createElement("button");
    b.className = "preset";
    b.dataset.preset = index;
    b.setAttribute("aria-pressed", "false");
    const swatch = document.createElement("span");
    swatch.className = "preset-preview";
    swatch.style.setProperty("--preset", p.background);
    swatch.setAttribute("aria-hidden", "true");
    b.append(swatch, document.createTextNode(p.name));
    b.addEventListener("click", () => {
      flushHistory();
      const { style, accent, font, shape, filter } = p;
      change({ style, accent, font, shape, filter });
    });
    $("presets").append(b);
  }
  for (const [color, name] of [
    ["#e50914", "Red"],
    ["#7a5cff", "Purple"],
    ["#00a8ff", "Blue"],
    ["#00c896", "Green"],
    ["#f1b63b", "Gold"],
    ["#ffffff", "White"],
  ]) {
    const b = document.createElement("button");
    b.className = "swatch";
    b.dataset.color = color;
    b.style.background = color;
    b.setAttribute("aria-label", name);
    b.addEventListener("click", () => {
      flushHistory();
      change({ accent: color });
    });
    $("colors").append(b);
  }
  const colorLabel = document.createElement("label");
  colorLabel.className = "custom-color";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.id = "customAccent";
  colorInput.setAttribute("aria-label", "Custom accent color");
  colorLabel.append(colorInput);
  $("colors").append(colorLabel);
  colorInput.addEventListener("input", () =>
    change({ accent: colorInput.value }, { continuous: true }),
  );
  colorInput.addEventListener("change", flushHistory);
  for (const id of fields) {
    $(id).addEventListener("input", () =>
      change(
        {
          [id]:
            id === "texture"
              ? $(id).checked
              : numeric.has(id)
                ? Number($(id).value)
                : $(id).value,
        },
        { continuous: true },
      ),
    );
    $(id).addEventListener("change", flushHistory);
  }
  document.querySelectorAll("[data-format]").forEach((b) =>
    b.addEventListener("click", () => {
      flushHistory();
      change({ format: b.dataset.format });
    }),
  );
  $("rollBio").addEventListener("click", () => {
    flushHistory();
    const options = bios.filter((b) => b !== state.bio);
    change({ bio: options[Math.floor(Math.random() * options.length)] });
  });
  $("shuffle").addEventListener("click", () => {
    flushHistory();
    const options = M.PRESETS.filter((p) => p.style !== state.style);
    const p = options[Math.floor(Math.random() * options.length)];
    const { style, accent, font, shape, filter } = p;
    change({ style, accent, font, shape, filter });
    toast("New look. Same you. Undo brings the previous look back.");
  });
  $("centerPhoto").addEventListener("click", () => {
    flushHistory();
    change({ zoom: 100, posX: 0, pos: 0, brightness: 100, filter: "original" });
  });
  $("removePhoto").addEventListener("click", () => {
    uploadVersion++;
    flushHistory();
    change({ photo: null });
    $("photo").value = "";
  });
  $("reset").addEventListener("click", () => {
    uploadVersion++;
    flushHistory();
    change({ ...M.DEFAULTS });
    $("photo").value = "";
    toast("Fresh canvas. You can undo this.");
  });
  $("undo").addEventListener("click", undo);
  $("redo").addEventListener("click", redo);
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.target.matches('input,textarea,[contenteditable="true"]')) return;
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
  });
  async function upload(file) {
    if (!file) return;
    const version = ++uploadVersion;
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG, or WEBP image.");
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 15 MB.");
      const url = URL.createObjectURL(file);
      let img;
      try {
        img = await loadImage(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (img.width * img.height > 40_000_000)
        throw new Error("Choose a photo under 40 megapixels.");
      // Store one bounded image so history shares the same string and project files remain portable.
      const c = document.createElement("canvas"),
        ratio = Math.min(1, 1800 / Math.max(img.width, img.height));
      c.width = Math.max(1, Math.round(img.width * ratio));
      c.height = Math.max(1, Math.round(img.height * ratio));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const photo = c.toDataURL("image/webp", 0.92);
      if (version !== uploadVersion) return;
      flushHistory();
      change({ photo, zoom: 100, posX: 0, pos: 0 });
      toast("Photo added. Drag it in the preview to reframe.");
    } catch (e) {
      if (version === uploadVersion) toast(e.message);
    } finally {
      if (version === uploadVersion) $("photo").value = "";
    }
  }
  $("photo").addEventListener("change", (e) => upload(e.target.files[0]));
  for (const type of ["dragenter", "dragover"])
    $("dropzone").addEventListener(type, (e) => {
      e.preventDefault();
      $("dropzone").classList.add("dragover");
    });
  $("dropzone").addEventListener("dragleave", () =>
    $("dropzone").classList.remove("dragover"),
  );
  $("dropzone").addEventListener("drop", (e) => {
    e.preventDefault();
    $("dropzone").classList.remove("dragover");
    upload(e.dataTransfer.files[0]);
  });
  document.addEventListener("paste", (e) => {
    const file = Array.from(e.clipboardData?.items || [])
      .find((i) => i.kind === "file" && i.type.startsWith("image/"))
      ?.getAsFile();
    if (file) {
      e.preventDefault();
      upload(file);
    }
  });
  const canvas = $("canvas");
  canvas.addEventListener("pointerdown", (e) => {
    if (
      !state.photo ||
      !decodedImage ||
      decodedSource !== state.photo ||
      e.button !== 0 ||
      drag
    )
      return;
    const rect = canvas.getBoundingClientRect(),
      l = M.layout(state.format),
      px = ((e.clientX - rect.left) * l.w) / rect.width,
      py = ((e.clientY - rect.top) * l.h) / rect.height;
    if (px < l.x || px > l.x + l.size || py < l.y || py > l.y + l.size) return;
    flushHistory();
    const r = M.cover(
      decodedImage.width,
      decodedImage.height,
      l.x,
      l.y,
      l.size,
      l.size,
      state.zoom / 100,
      state.posX,
      state.pos,
    );
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      posX: state.posX,
      pos: state.pos,
      scale: l.w / rect.width,
      moveX: r.moveX,
      moveY: r.moveY,
    };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
    $("previewWrap").style.transform = "";
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) {
      if (e.pointerId !== drag.id) return;
      change(
        {
          posX: drag.moveX
            ? Math.round(
                drag.posX +
                  (((e.clientX - drag.x) * drag.scale) / drag.moveX) * 100,
              )
            : 0,
          pos: drag.moveY
            ? Math.round(
                drag.pos +
                  (((e.clientY - drag.y) * drag.scale) / drag.moveY) * 100,
              )
            : 0,
        },
        { continuous: true },
      );
      return;
    }
    if (
      !$("tilt").checked ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      e.pointerType !== "mouse"
    )
      return;
    const r = canvas.getBoundingClientRect();
    $("previewWrap").style.transform =
      `rotateX(${(-(e.clientY - r.top - r.height / 2) / r.height) * 10}deg) rotateY(${((e.clientX - r.left - r.width / 2) / r.width) * 10}deg)`;
  });
  function stopDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    canvas.classList.remove("dragging");
    flushHistory();
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    canvas.addEventListener(type, stopDrag),
  );
  canvas.addEventListener(
    "pointerleave",
    () => ($("previewWrap").style.transform = ""),
  );
  $("tilt").addEventListener(
    "change",
    () => ($("previewWrap").style.transform = ""),
  );
  function download(blob, filename) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
  function filename(s) {
    return (
      (s.name
        .trim()
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "profile") +
      "-" +
      s.format
    );
  }
  async function png(snapshot, quality) {
    const photo = await photoFor(snapshot),
      out = document.createElement("canvas");
    R.render(out, snapshot, photo, quality);
    return new Promise((resolve, reject) =>
      out.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error("Could not create PNG. Try standard resolution."),
              ),
        "image/png",
      ),
    );
  }
  $("save").addEventListener("click", async () => {
    const button = $("save"),
      snapshot = { ...state },
      quality = Number($("quality").value);
    button.disabled = true;
    try {
      const blob = await png(snapshot, quality),
        file = new File([blob], filename(snapshot) + ".png", {
          type: "image/png",
        });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "My profile card" });
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      download(blob, file.name);
      toast("PNG ready. Your card, full resolution.");
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  });
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    $("copyImage").disabled = true;
    $("copyImage").title =
      "Image clipboard unavailable in this browser. Use Save / Share PNG.";
  }
  $("copyImage").addEventListener("click", async () => {
    const button = $("copyImage");
    button.disabled = true;
    try {
      const imagePromise = png({ ...state }, Number($("quality").value));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": imagePromise }),
      ]);
      toast("Image copied. Paste it into your next message.");
    } catch {
      toast("Could not copy the image. Use Save / Share PNG instead.");
    } finally {
      button.disabled = false;
    }
  });
  $("quality").addEventListener("change", sync);
  $("saveProject").addEventListener("click", () => {
    flushHistory();
    download(
      new Blob([M.project(state)], { type: "application/json" }),
      filename(state) + ".card.json",
    );
    toast("Editable project saved, including your photo.");
  });
  $("importProject").addEventListener("click", () => $("projectFile").click());
  $("projectFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const version = ++uploadVersion;
    try {
      if (file.size > 9_000_000)
        throw new Error("Project is too large (9 MB maximum).");
      const next = M.readProject(await file.text());
      if (next.photo) await photoFor(next);
      if (version !== uploadVersion) return;
      flushHistory();
      change(next);
      toast("Project opened. Your previous card is one undo away.");
    } catch (err) {
      if (version === uploadVersion) toast(err.message);
    } finally {
      $("projectFile").value = "";
    }
  });
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = M.readProject(saved);
      $("draftStatus").textContent = "Draft restored";
    }
  } catch {
    $("draftStatus").textContent = "Could not restore draft";
  }
  history = new M.History(state);
  sync();
  requestRender();
  new ResizeObserver(fitPreview).observe(
    document.querySelector(".preview-space"),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && saveTimer) {
      persist();
      saveTimer = null;
    }
  });
})();
