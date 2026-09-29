const WEIGHTS = {
  face: 0.16,
  emotion: 0.12,
  contrast: 0.12,
  text: 0.12,
  gap: 0.12,
  titleCombo: 0.1,
  mobile: 0.08,
  safe: 0.06,
  brand: 0.06,
  clutter: 0.06,
};

const EMOTION = {
  curiosity: 92,
  shock: 88,
  delight: 84,
  authority: 76,
  warmth: 72,
  neutral: 42,
};

export function scoreDesign(meta, pixels = null) {
  const words = (meta.overlay || "").trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const text = wordCount === 0 ? 55
    : wordCount <= 4 ? 96
    : wordCount <= 6 ? 70
    : 38;

  const scores = {
    face: meta.hasFace ? 93 : 26,
    emotion: EMOTION[meta.emotion] ?? 50,
    contrast: pixels ? pixels.contrast : (meta.complementary ? 84 : 58),
    text,
    gap: meta.curiosityGap ? 91 : 36,
    titleCombo: meta.repeatsTitle ? 32 : 88,
    mobile: (meta.fontPx || 80) >= 72 && wordCount <= 4 ? 86 : 54,
    safe: meta.safeZone ? 90 : 40,
    brand: meta.brandConsistent ? 86 : 48,
    clutter: pixels ? pixels.clutter : 74,
  };

  if (pixels) {
    scores.contrast = clamp(Math.round(pixels.contrast));
    scores.clutter = clamp(Math.round(pixels.clutter));
    if (pixels.colorPop > 0) {
      scores.contrast = clamp(Math.round(scores.contrast * 0.7 + pixels.colorPop * 0.3));
    }
  }

  let overall = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) overall += scores[k] * w;
  overall = Math.round(overall);

  const predictedCtr = Number(mapCtr(overall).toFixed(1));
  const band = predictedCtr >= 8 ? "exceptional"
    : predictedCtr >= 6 ? "strong-for-education"
    : predictedCtr >= 4 ? "healthy"
    : predictedCtr >= 2.5 ? "weak"
    : "failing";

  return {
    scores,
    overall,
    predictedCtr,
    band,
    notes: notesFor(meta, scores, wordCount),
  };
}

export function analyzeImage(img, box = { x: 0, y: 0, w: 1, h: 1 }) {
  const canvas = document.createElement("canvas");
  const w = 160;
  const h = 90;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  let sum2 = 0;
  let sat = 0;
  let edges = 0;
  const n = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += y;
    sum2 += y * y;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    sat += mx ? (mx - mn) / mx : 0;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const j = (y * w + x + 1) * 4;
      const d = Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]);
      if (d > 80) edges += 1;
    }
  }
  const mean = sum / n;
  const variance = sum2 / n - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));
  const contrast = clamp((std / 70) * 100);
  const colorPop = clamp((sat / n) * 140);
  const clutter = clamp(100 - (edges / (w * h)) * 900);
  return { mean, std, contrast, colorPop, clutter };
}

function mapCtr(score) {
  // Education niche: 1.6% → 11%
  const t = Math.min(1, Math.max(0, (score - 20) / 80));
  return 1.6 + t * t * 9.4;
}

function notesFor(meta, scores, wordCount) {
  const notes = [];
  if (!meta.hasFace) notes.push("أضف وجهًا كبيرًا واحدًا. الوجوه تربح أول 200 مللي ثانية.");
  if (!meta.curiosityGap) notes.push("اصنع فجوة فضول: أظهر رد الفعل لا الجواب.");
  if (meta.repeatsTitle) notes.push("الصورة المصغرة تكرر العنوان. غيّر النص ليكمّله.");
  if (wordCount > 4) notes.push("اختصر النص إلى 4 كلمات أو أقل.");
  if ((meta.fontPx || 0) < 72) notes.push("كبّر الخط. اختبره بعرض 160 بكسل.");
  if (!meta.safeZone) notes.push("أبعد النص عن الركن السفلي الأيمن (شارة المدة).");
  if (scores.contrast < 70) notes.push("ارفع التباين: تيل/خردل أو أصفر على كحلي.");
  if (scores.clutter < 60) notes.push("قلّل العناصر. عنصران أو ثلاثة فقط.");
  if (!notes.length) notes.push("لوحة قوية. اختبرها مقابل متغير ثانٍ ولا تغيّر الهوية.");
  return notes;
}

function clamp(n) { return Math.max(0, Math.min(100, n)); }
