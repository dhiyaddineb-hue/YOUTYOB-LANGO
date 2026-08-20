import { download, srtStamp } from "./utils.js";

export function allCues(episode) {
  const rows = [];
  for (const scene of episode.scenes) {
    for (const cue of scene.cues || []) rows.push(cue);
    for (const card of scene.cards || []) {
      rows.push({ start: card.start, end: card.end, speaker: "sami", en: card.en, ar: `${card.ar} — ${card.ex}` });
    }
    for (const item of scene.items || []) {
      if (item.prompt) rows.push({ start: item.start, end: item.end, speaker: "sami", en: item.prompt, ar: item.hint || "" });
      if (item.q) rows.push({ start: item.start, end: item.end, speaker: "sami", en: item.q, ar: item.qAr || "" });
    }
  }
  return rows.sort((a, b) => a.start - b.start);
}

export function toSrt(episode, lang = "en") {
  return allCues(episode).map((c, i) => {
    const text = lang === "ar" ? c.ar : c.en;
    return `${i + 1}\n${srtStamp(c.start)} --> ${srtStamp(c.end)}\n${text}\n`;
  }).join("\n");
}

export function toVtt(episode) {
  const body = allCues(episode).map((c) => {
    const a = srtStamp(c.start).replace(",", ".");
    const b = srtStamp(c.end).replace(",", ".");
    return `${a} --> ${b}\n${c.en}\n${c.ar}\n`;
  }).join("\n");
  return `WEBVTT\n\n${body}`;
}

export function toHyperframes(episode) {
  const scenes = episode.scenes.map((s) => `
    <div class="scene clip" data-start="${s.start}" data-duration="${s.end - s.start}" data-track-index="0">
      <div class="scene-content">
        <p class="kicker">${episode.series} · ${s.label}</p>
        <h2>${s.label}</h2>
      </div>
    </div>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${episode.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
</head>
<body>
  <div id="stage" data-composition-id="${episode.id}" data-start="0" data-width="${episode.width}" data-height="${episode.height}" data-duration="${episode.duration}">
    ${scenes}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.set({}, {}, ${episode.duration});
    window.__timelines = window.__timelines || {};
    window.__timelines["${episode.id}"] = tl;
  </script>
</body>
</html>`;
}

export function youtubeCopy(episode) {
  const y = episode.youtube;
  return `${y.title}\n\n${y.description}\n\nTAGS\n${y.tags.join(", ")}`;
}

export function saveText(name, text, type) {
  download(name, text, type);
}
