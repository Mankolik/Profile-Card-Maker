(function (root) {
  "use strict";
  const M = root.CardModel;
  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shapePath(ctx, x, y, size, shape) {
    ctx.beginPath();
    if (shape === "rounded") {
      rounded(ctx, x, y, size, size, size * 0.15);
      return;
    }
    if (shape === "hexagon") {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + size / 2 + (Math.cos(a) * size) / 2,
          py = y + size / 2 + (Math.sin(a) * size) / 2;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      return;
    }
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  }
  function font(s, size) {
    return {
      bold: `800 ${size}px Arial, sans-serif`,
      clean: `500 ${size}px Arial, sans-serif`,
      wide: `900 ${size}px "Arial Black", Arial, sans-serif`,
      mono: `700 ${size}px "Courier New", monospace`,
      serif: `500 ${size}px Georgia, serif`,
    }[s.font];
  }
  function fitted(ctx, s, text, width, start) {
    let size = start;
    while (size > 18) {
      ctx.font = font(s, size);
      if (ctx.measureText(text).width <= width) break;
      size -= 2;
    }
    return size;
  }
  function background(ctx, s, w, h) {
    const g = ctx.createRadialGradient(
      w * 0.72,
      h * 0.16,
      0,
      w * 0.5,
      h * 0.5,
      Math.max(w, h),
    );
    g.addColorStop(
      0,
      s.style === "glow"
        ? s.accent + "77"
        : s.style === "synthwave"
          ? "#40205e"
          : s.style === "holo"
            ? "#394655"
            : s.style === "noir"
              ? "#444444"
              : "#232329",
    );
    g.addColorStop(1, "#08080d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (s.style === "holo") {
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 5; i++) {
        const sheen = ctx.createLinearGradient(
          i * w * 0.32 - 600,
          0,
          i * w * 0.32 + 400,
          h,
        );
        sheen.addColorStop(0, "#00000000");
        sheen.addColorStop(0.4, "#8b85ff");
        sheen.addColorStop(0.52, "#b4ffe4");
        sheen.addColorStop(0.65, "#ffb9ea");
        sheen.addColorStop(1, "#00000000");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
    if (s.style === "synthwave") {
      ctx.save();
      ctx.strokeStyle = s.accent + "55";
      ctx.lineWidth = 2;
      const horizon = h * 0.65;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 35, horizon);
        ctx.lineTo(w / 2 + i * w * 0.23, h);
        ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const y = horizon + (h - horizon) * (i / 8) ** 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (s.style === "noir") {
      ctx.save();
      ctx.globalAlpha = 0.055;
      ctx.fillStyle = "#fff";
      ctx.translate(w * 0.3, -h * 0.2);
      ctx.rotate(0.4);
      for (let i = 0; i < 12; i++) ctx.fillRect(i * 120, 0, 46, h * 1.5);
      ctx.restore();
    }
    if (s.style === "holo" || s.style === "noir") {
      ctx.strokeStyle = s.style === "holo" ? "#c5d9f055" : s.accent + "66";
      ctx.lineWidth = 2;
      rounded(ctx, 24, 24, w - 48, h - 48, 20);
      ctx.stroke();
    }
  }
  function render(canvas, s, photo, scale = 1) {
    const l = M.layout(s.format),
      { w, h, x, y, size } = l;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    background(ctx, s, w, h);
    if (s.style === "glow" || s.style === "holo") {
      ctx.save();
      ctx.shadowColor = s.accent;
      ctx.shadowBlur = 60;
      ctx.fillStyle = s.accent;
      ctx.globalAlpha = 0.5;
      shapePath(ctx, x - 5, y - 5, size + 10, s.shape);
      ctx.fill();
      ctx.restore();
    }
    if (s.style !== "minimal") {
      let rim = s.accent;
      if (s.style === "holo") {
        rim = ctx.createLinearGradient(x, y, x + size, y + size);
        ["#afffe5", "#a9a1ff", "#ffbcea", "#c0fff4"].forEach((c, i) =>
          rim.addColorStop(i / 3, c),
        );
      }
      ctx.fillStyle = rim;
      shapePath(ctx, x - 8, y - 8, size + 16, s.shape);
      ctx.fill();
    }
    ctx.save();
    shapePath(ctx, x, y, size, s.shape);
    ctx.clip();
    ctx.fillStyle = "#202026";
    ctx.fillRect(x, y, size, size);
    if (photo) {
      const r = M.cover(
        photo.width,
        photo.height,
        x,
        y,
        size,
        size,
        s.zoom / 100,
        s.posX,
        s.pos,
      );
      ctx.drawImage(photo, r.x, r.y, r.w, r.h);
    } else {
      const g = ctx.createLinearGradient(x, y, x + size, y + size);
      g.addColorStop(0, s.accent + "55");
      g.addColorStop(1, "#19191f");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, size, size);
      // Initials are a usable photo-free avatar, not an upload placeholder.
      const initials = (s.name.trim() || "Your Name")
        .split(/\s+/)
        .slice(0, 2)
        .map((v) => Array.from(v)[0])
        .join("")
        .toUpperCase();
      ctx.font = font(s, size * 0.28);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffffd9";
      ctx.fillText(initials, x + size / 2, y + size / 2, size * 0.8);
    }
    const shade = ctx.createLinearGradient(0, y + size * 0.6, 0, y + size);
    shade.addColorStop(0, "#00000000");
    shade.addColorStop(1, "#00000033");
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, size, size);
    ctx.restore();
    if (s.badge.trim()) {
      const text = s.badge.trim().toUpperCase();
      fitted(ctx, { font: "mono" }, text, l.textWidth, 22);
      const bw = Math.min(l.textWidth, ctx.measureText(text).width + 36);
      ctx.fillStyle = s.accent + "25";
      rounded(ctx, l.textX - bw / 2, l.badgeY, bw, 38, 19);
      ctx.fill();
      ctx.strokeStyle = s.accent + "99";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fafaff";
      ctx.fillText(text, l.textX, l.badgeY + 19, bw - 24);
    }
    const name = s.name.trim() || "Your Name";
    fitted(ctx, s, name, l.textWidth, s.format === "banner" ? 68 : 76);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f5f7";
    ctx.fillText(name, l.textX, l.nameY, l.textWidth);
    if (s.style !== "minimal") {
      ctx.fillStyle = s.accent;
      rounded(ctx, l.textX - 45, l.nameY + 49, 90, 5, 2.5);
      ctx.fill();
    }
    ctx.font = `400 ${l.bioSize}px Arial, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#d0d0da";
    const lines = M.wrapText(
      s.bio.trim() || "Main character energy.",
      l.textWidth - 40,
      (t) => ctx.measureText(t).width,
      l.bioLines,
    );
    lines.forEach((line, i) =>
      ctx.fillText(line, l.textX, l.bioY + i * (l.bioSize + 11)),
    );
    if (s.handle.trim()) {
      const handle = s.handle.trim().startsWith("@")
        ? s.handle.trim()
        : "@" + s.handle.trim();
      ctx.font = '500 25px "Courier New", monospace';
      ctx.fillStyle = "#d0d0da";
      ctx.textBaseline = "middle";
      ctx.fillText(handle, l.textX, l.handleY, l.textWidth);
    }
    if (s.texture) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = "#fff";
      let seed = 73;
      for (let i = 0; i < 3000; i++) {
        seed = (seed * 16807) % 2147483647;
        const gx = seed % w;
        seed = (seed * 16807) % 2147483647;
        ctx.fillRect(gx, seed % h, 1.2, 1.2);
      }
      ctx.restore();
    }
    return l;
  }
  // Pixel grades work on Safari too: no reliance on CanvasRenderingContext2D.filter.
  function grade(image, s) {
    if (!image) return null;
    const c = document.createElement("canvas"),
      ratio = Math.min(1, 1800 / Math.max(image.width, image.height));
    c.width = Math.max(1, Math.round(image.width * ratio));
    c.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, c.width, c.height);
    if (s.filter === "original" && s.brightness === 100) return c;
    const pixels = ctx.getImageData(0, 0, c.width, c.height),
      d = pixels.data,
      b = s.brightness / 100;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i],
        g = d[i + 1],
        blue = d[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * blue;
      if (s.filter === "mono") r = g = blue = lum;
      if (s.filter === "warm") {
        r = r * 1.12 + 8;
        g = g * 1.02 + 3;
        blue *= 0.85;
      }
      if (s.filter === "cool") {
        r *= 0.87;
        g *= 1.03;
        blue = blue * 1.12 + 6;
      }
      if (s.filter === "vivid") {
        r = lum + (r - lum) * 1.45;
        g = lum + (g - lum) * 1.45;
        blue = lum + (blue - lum) * 1.45;
      }
      d[i] = r * b;
      d[i + 1] = g * b;
      d[i + 2] = blue * b;
    }
    ctx.putImageData(pixels, 0, 0);
    return c;
  }
  root.CardRenderer = { render, grade };
})(globalThis);
