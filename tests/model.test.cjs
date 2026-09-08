const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../model.js");

test("photo crop covers its frame at every pan extreme and aspect ratio", () => {
  for (const [iw, ih] of [
    [100, 100],
    [4000, 500],
    [500, 4000],
    [4032, 3024],
  ])
    for (const zoom of [1, 1.01, 1.5, 3])
      for (const dx of [-100, 0, 100])
        for (const dy of [-100, 0, 100]) {
          const r = M.cover(iw, ih, 20, 40, 590, 590, zoom, dx, dy);
          assert.ok(r.x <= 20 + 1e-8);
          assert.ok(r.y <= 40 + 1e-8);
          assert.ok(r.x + r.w >= 610 - 1e-8);
          assert.ok(r.y + r.h >= 630 - 1e-8);
        }
});
test("portable project round-trip preserves image, Unicode, and all edits", () => {
  const card = {
    ...M.DEFAULTS,
    name: "Michał 🚀",
    bio: "A story\nwith a new line.",
    badge: "LIMITED EDITION",
    handle: "@michal",
    photo: "data:image/png;base64,AAAA",
    format: "story",
    style: "holo",
    pos: -60,
    zoom: 200,
  };
  assert.deepEqual(M.readProject(M.project(card)), card);
});
test("import refuses other formats, executable URLs, malformed photos and future versions", () => {
  for (const data of [
    {},
    null,
    { app: "profile-card-maker", version: 2, card: {} },
    {
      app: "profile-card-maker",
      version: 1,
      card: { photo: "https://example.com/photo.png" },
    },
    {
      app: "profile-card-maker",
      version: 1,
      card: { photo: "data:image/svg+xml;base64,AAAA" },
    },
  ])
    assert.throws(() => M.readProject(JSON.stringify(data)));
  assert.throws(() => M.readProject("{broken json"));
});
test("import validates enums, clamps controls, limits text and excludes unknown fields", () => {
  const s = M.normalize({
    zoom: 999,
    posX: -1000,
    pos: Infinity,
    brightness: 0,
    name: "a".repeat(100),
    style: "bad",
    accent: "#fff;bad",
    texture: "false",
    extra: "value",
  });
  assert.equal(s.zoom, 300);
  assert.equal(s.posX, -100);
  assert.equal(s.pos, 0);
  assert.equal(s.brightness, 50);
  assert.equal(s.name.length, 40);
  assert.equal(s.style, "classic");
  assert.equal(s.accent, "#e50914");
  assert.equal(s.texture, true);
  assert.ok(!("extra" in s));
});
test("undo/redo restores entire card and a new edit clears the redo branch", () => {
  const history = new M.History(M.DEFAULTS),
    photo = { ...M.DEFAULTS, photo: "data:image/png;base64,AAAA" },
    styled = { ...photo, style: "holo" };
  history.push(photo);
  history.push(styled);
  assert.deepEqual(history.undo(), photo);
  assert.deepEqual(history.undo(), M.DEFAULTS);
  assert.deepEqual(history.redo(), photo);
  history.push({ ...photo, name: "New branch" });
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.undo(), photo);
});
test("history is bounded and duplicate states do not consume undo steps", () => {
  const h = new M.History(M.DEFAULTS, 3);
  h.push(M.DEFAULTS);
  assert.equal(h.canUndo, false);
  for (let n = 0; n < 20; n++) h.push({ ...M.DEFAULTS, name: String(n) });
  assert.equal(h.items.length, 3);
  assert.equal(h.undo().name, "18");
  assert.equal(h.undo().name, "17");
  assert.equal(h.canUndo, false);
});
test("long unbroken Unicode bios wrap within width and get a visible ellipsis", () => {
  const measure = (s) => Array.from(s).length * 10;
  for (const bio of [
    "x".repeat(140),
    "🚀".repeat(70),
    "one two three four five six seven eight nine ten",
  ]) {
    const lines = M.wrapText(bio, 100, measure, 3);
    assert.ok(lines.length <= 3);
    assert.ok(lines.every((l) => measure(l) <= 100));
    assert.ok(lines.at(-1).endsWith("…"));
    assert.ok(lines.every((l) => !/[\uD800-\uDBFF]$/.test(l)));
  }
  assert.deepEqual(M.wrapText("one two", 100, measure, 3), ["one two"]);
});
test("all layouts keep photo, text column and badges within the output", () => {
  for (const format of Object.keys(M.FORMATS)) {
    const l = M.layout(format);
    assert.ok(l.x >= 0 && l.y >= 0);
    assert.ok(l.x + l.size <= l.w && l.y + l.size <= l.h);
    assert.ok(l.textX - l.textWidth / 2 >= 0);
    assert.ok(l.textX + l.textWidth / 2 <= l.w);
    assert.ok(l.handleY + 20 < l.h);
    assert.ok(l.bioY + l.bioLines * (l.bioSize + 11) < l.handleY);
    assert.ok(l.badgeY > 0);
  }
});
