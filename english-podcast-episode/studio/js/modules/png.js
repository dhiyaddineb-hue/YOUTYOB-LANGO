export function drawExplainer(canvas, card) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = card.color || "#0f766e";
  ctx.fillRect(0, 0, 18, h);
  ctx.fillRect(w - 18, 0, 18, h);

  ctx.fillStyle = "#1c1917";
  ctx.font = `700 ${Math.round(h * 0.16)}px Fraunces, serif`;
  ctx.textAlign = "center";
  ctx.fillText(card.en, w / 2, h * 0.34);

  ctx.fillStyle = "#0f766e";
  ctx.font = `500 ${Math.round(h * 0.055)}px IBM Plex Mono, monospace`;
  ctx.fillText(card.ipa || "", w / 2, h * 0.46);

  ctx.fillStyle = "#44403c";
  ctx.font = `600 ${Math.round(h * 0.08)}px "Noto Naskh Arabic", serif`;
  ctx.fillText(card.ar, w / 2, h * 0.62);

  ctx.fillStyle = "#78716c";
  ctx.font = `500 ${Math.round(h * 0.05)}px Outfit, sans-serif`;
  ctx.fillText(card.ex || "", w / 2, h * 0.78);

  ctx.fillStyle = "#d4a017";
  ctx.font = `600 ${Math.round(h * 0.032)}px Outfit, sans-serif`;
  ctx.fillText("ENGLISH STEP BY STEP", w / 2, h * 0.9);
}

export function downloadCanvas(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }, "image/png");
}
