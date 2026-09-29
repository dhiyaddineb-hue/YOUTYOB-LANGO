import { asset } from "./store.js";
import { analyzeImage, scoreDesign } from "./ctr.js";
import { uid } from "./utils.js";

export function composeThumbnail(canvas, { plate, overlay, color = "#f5d56e", align = "left" }) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(0, 0, w, h);
  if (plate?.complete) {
    const scale = Math.max(w / plate.width, h / plate.height);
    const dw = plate.width * scale;
    const dh = plate.height * scale;
    ctx.drawImage(plate, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  const grd = ctx.createLinearGradient(0, 0, w * 0.7, 0);
  grd.addColorStop(0, "rgba(12,10,8,0.55)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  if (overlay) {
    ctx.font = `800 ${Math.round(h * 0.16)}px Outfit, sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(12,10,8,0.85)";
    ctx.lineWidth = Math.round(h * 0.018);
    ctx.textAlign = align === "right" ? "right" : "left";
    ctx.textBaseline = "top";
    const x = align === "right" ? w * 0.92 : w * 0.07;
    const y = h * 0.12;
    wrap(ctx, overlay.toUpperCase(), x, y, w * 0.55, h * 0.17);
  }
}

function wrap(ctx, text, x, y, max, lh) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      strokeFill(ctx, line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) strokeFill(ctx, line, x, yy);
}

function strokeFill(ctx, text, x, y) {
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export function loadPlate(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = asset(src);
  });
}

export async function runAnalysis({ plateSrc, overlay, title, meta, canvas }) {
  const img = await loadPlate(plateSrc);
  if (canvas) composeThumbnail(canvas, { plate: img, overlay, color: meta.color, align: meta.align });
  const pixels = analyzeImage(canvas || img);
  const result = scoreDesign({
    overlay,
    title,
    hasFace: meta.hasFace,
    emotion: meta.emotion,
    curiosityGap: meta.curiosityGap,
    repeatsTitle: title && overlay && title.toLowerCase().includes(overlay.toLowerCase()),
    wordCount: overlay.trim().split(/\s+/).filter(Boolean).length,
    fontPx: 92,
    complementary: true,
    brandConsistent: true,
    safeZone: meta.align !== "br",
  }, pixels);
  return {
    id: uid("th"),
    createdAt: new Date().toISOString(),
    episodeId: "ep-01",
    variant: meta.variant || overlay,
    plate: plateSrc,
    title,
    overlay,
    ...meta,
    ...result,
  };
}
