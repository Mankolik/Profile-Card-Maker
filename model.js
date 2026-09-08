/* Shared, DOM-free state and geometry. Also loaded by Node's regression tests. */
(function (root) {
  "use strict";
  const FORMATS = Object.freeze({
    square: [1080, 1080],
    portrait: [1080, 1350],
    story: [1080, 1920],
    banner: [1500, 600],
  });
  const DEFAULTS = Object.freeze({
    name: "",
    bio: "",
    handle: "",
    badge: "",
    style: "classic",
    font: "bold",
    accent: "#e50914",
    shape: "circle",
    filter: "original",
    zoom: 100,
    posX: 0,
    pos: 0,
    brightness: 100,
    texture: true,
    format: "square",
    photo: null,
  });
  const PRESETS = [
    {
      name: "Original",
      style: "classic",
      accent: "#e50914",
      font: "bold",
      shape: "circle",
      filter: "original",
      background: "linear-gradient(135deg,#681019,#151519)",
    },
    {
      name: "Afterglow",
      style: "glow",
      accent: "#7a5cff",
      font: "clean",
      shape: "circle",
      filter: "original",
      background: "radial-gradient(ellipse at top,#8b64ff,#191225)",
    },
    {
      name: "Hologram",
      style: "holo",
      accent: "#80ffe2",
      font: "wide",
      shape: "rounded",
      filter: "cool",
      background: "linear-gradient(125deg,#344e64,#9776b1,#a0d5c9,#554582)",
    },
    {
      name: "Midnight FM",
      style: "synthwave",
      accent: "#ff57c8",
      font: "mono",
      shape: "hexagon",
      filter: "vivid",
      background: "linear-gradient(160deg,#271744,#c34c9e,#1c254b)",
    },
    {
      name: "Silver screen",
      style: "noir",
      accent: "#e4c693",
      font: "serif",
      shape: "rounded",
      filter: "mono",
      background: "linear-gradient(135deg,#777,#161616)",
    },
    {
      name: "Less is more",
      style: "minimal",
      accent: "#ffffff",
      font: "clean",
      shape: "circle",
      filter: "original",
      background: "linear-gradient(135deg,#393940,#141417)",
    },
  ];
  const ENUMS = {
    style: PRESETS.map((p) => p.style),
    font: ["bold", "clean", "wide", "mono", "serif"],
    shape: ["circle", "rounded", "hexagon"],
    filter: ["original", "mono", "warm", "cool", "vivid"],
    format: Object.keys(FORMATS),
  };
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Invalid card settings.");
    const s = { ...DEFAULTS };
    for (const [key, limit] of Object.entries({
      name: 40,
      bio: 140,
      handle: 32,
      badge: 24,
    }))
      if (typeof raw[key] === "string") s[key] = raw[key].slice(0, limit);
    for (const [key, values] of Object.entries(ENUMS))
      if (values.includes(raw[key])) s[key] = raw[key];
    for (const [key, min, max] of [
      ["zoom", 100, 300],
      ["posX", -100, 100],
      ["pos", -100, 100],
      ["brightness", 50, 150],
    ])
      if (typeof raw[key] === "number" && Number.isFinite(raw[key]))
        s[key] = Math.max(min, Math.min(max, raw[key]));
    if (typeof raw.accent === "string" && /^#[0-9a-f]{6}$/i.test(raw.accent))
      s.accent = raw.accent.toLowerCase();
    if (typeof raw.texture === "boolean") s.texture = raw.texture;
    if (raw.photo != null) {
      if (
        typeof raw.photo !== "string" ||
        raw.photo.length > 8_000_000 ||
        !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(raw.photo)
      )
        throw new Error(
          "Project photo must be an embedded JPG, PNG, or WEBP image.",
        );
      s.photo = raw.photo;
    }
    return s;
  }
  function readProject(text) {
    const data = JSON.parse(text);
    if (data?.app !== "profile-card-maker" || data.version !== 1)
      throw new Error("Choose a Profile Card Maker project (version 1).");
    return normalize(data.card);
  }
  function project(state) {
    return JSON.stringify(
      { app: "profile-card-maker", version: 1, card: normalize(state) },
      null,
      2,
    );
  }
  function layout(format) {
    const [w, h] = FORMATS[format] || FORMATS.square;
    if (format === "banner")
      return {
        w,
        h,
        x: 94,
        y: 94,
        size: 412,
        textX: 975,
        nameY: 232,
        textWidth: 820,
        bioY: 310,
        handleY: 474,
        badgeY: 112,
        bioSize: 28,
        bioLines: 3,
      };
    const story = format === "story",
      portrait = format === "portrait";
    return {
      w,
      h,
      x: 245,
      y: story ? 340 : portrait ? 160 : 78,
      size: 590,
      textX: 540,
      nameY: story ? 1120 : portrait ? 870 : 755,
      textWidth: 840,
      bioY: story ? 1230 : portrait ? 980 : 854,
      handleY: story ? 1530 : portrait ? 1200 : 1016,
      badgeY: story ? 245 : portrait ? 102 : 34,
      bioSize: 32,
      bioLines: 3,
    };
  }
  function cover(iw, ih, x, y, w, h, zoom, offsetX, offsetY) {
    const scale = Math.max(w / iw, h / ih) * zoom,
      dw = iw * scale,
      dh = ih * scale;
    const moveX = Math.max(0, (dw - w) / 2),
      moveY = Math.max(0, (dh - h) / 2);
    return {
      x:
        x +
        (w - dw) / 2 +
        (Math.max(-100, Math.min(100, offsetX)) / 100) * moveX,
      y:
        y +
        (h - dh) / 2 +
        (Math.max(-100, Math.min(100, offsetY)) / 100) * moveY,
      w: dw,
      h: dh,
      moveX,
      moveY,
    };
  }
  function wrapText(text, width, measure, maxLines = 3) {
    const lines = [];
    let line = "";
    for (const word of text.trim().split(/\s+/).filter(Boolean)) {
      if (line && measure(line + " " + word) <= width) {
        line += " " + word;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const char of Array.from(word)) {
        if (line && measure(line + char) > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let end = lines[maxLines - 1];
      while (end && measure(end + "…") > width)
        end = Array.from(end).slice(0, -1).join("");
      lines[maxLines - 1] = end + "…";
    }
    return lines;
  }
  class History {
    constructor(initial, limit = 50) {
      this.items = [{ ...initial }];
      this.index = 0;
      this.limit = limit;
    }
    push(state) {
      if (JSON.stringify(this.items[this.index]) === JSON.stringify(state))
        return;
      this.items.splice(this.index + 1);
      this.items.push({ ...state });
      if (this.items.length > this.limit) this.items.shift();
      this.index = this.items.length - 1;
    }
    undo() {
      if (this.index > 0) this.index--;
      return { ...this.items[this.index] };
    }
    redo() {
      if (this.index < this.items.length - 1) this.index++;
      return { ...this.items[this.index] };
    }
    get canUndo() {
      return this.index > 0;
    }
    get canRedo() {
      return this.index < this.items.length - 1;
    }
  }
  const api = {
    FORMATS,
    DEFAULTS,
    PRESETS,
    normalize,
    readProject,
    project,
    layout,
    cover,
    wrapText,
    History,
  };
  root.CardModel = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
