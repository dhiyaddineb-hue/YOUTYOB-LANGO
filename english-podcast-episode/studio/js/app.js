import { $, $$, fmt } from "./modules/utils.js";
import { boot, persist, asset } from "./modules/store.js";
import { EpisodePlayer, bindTransport } from "./modules/player.js";
import { composeThumbnail, loadPlate, runAnalysis } from "./modules/thumbnails.js";
import { drawExplainer, downloadCanvas } from "./modules/png.js";
import { toSrt, toVtt, toHyperframes, youtubeCopy, saveText } from "./modules/export.js";

const state = await boot();
let player;

const routes = [
  ["dashboard", "لوحة"],
  ["create", "إنشاء"],
  ["episode", "الحلقة"],
  ["characters", "شخصيات"],
  ["voices", "أصوات"],
  ["captions", "كابشن"],
  ["thumbnails", "صور مصغرة"],
  ["png", "بطاقات PNG"],
  ["clips", "مقاطع"],
  ["export", "تصدير"],
];

function route() {
  const id = (location.hash.replace("#/", "") || "dashboard");
  $$(".view").forEach((v) => v.classList.toggle("on", v.id === `view-${id}`));
  $$("nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === id));
  if (id === "episode" && player) player.draw(player.t);
}

function fillDashboard() {
  $("#stat-duration").textContent = fmt(state.episode.duration);
  $("#stat-speakers").textContent = state.episode.cast.length;
  $("#stat-scenes").textContent = state.episode.scenes.length;
  $("#stat-ctr").textContent = `${bestCtr()}%`;
  const list = $("#scene-table");
  list.innerHTML = state.episode.scenes.map((s) =>
    `<tr><td>${s.label}</td><td>${s.type}</td><td>${fmt(s.start)}–${fmt(s.end)}</td></tr>`
  ).join("");
}

function bestCtr() {
  if (!state.history.length) return "—";
  return Math.max(...state.history.map((h) => h.predictedCtr)).toFixed(1);
}

function fillCreate() {
  const box = $("#format-box");
  box.innerHTML = state.formats.formats.map((f) => `
    <button class="choice ${state.project.format === f.id ? "on" : ""}" data-format="${f.id}">
      <b>${f.name} · ${f.nameEn}</b>
      <small>${f.bestFor} · ${f.speakers} أصوات · ${Math.round(f.defaultDuration / 60)} د</small>
    </button>
  `).join("");
  box.onclick = (e) => {
    const btn = e.target.closest("[data-format]");
    if (!btn) return;
    state.project.format = btn.dataset.format;
    persist(state);
    fillCreate();
  };
  const styles = $("#style-box");
  styles.innerHTML = state.formats.imageStyles.map((s) => `
    <button class="choice ${state.project.imageStyle === s.id ? "on" : ""}" data-style="${s.id}">
      <b>${s.name}</b><small>${s.nameEn}</small>
    </button>
  `).join("");
  styles.onclick = (e) => {
    const btn = e.target.closest("[data-style]");
    if (!btn) return;
    state.project.imageStyle = btn.dataset.style;
    persist(state);
    fillCreate();
    if (player) { player.style = btn.dataset.style; player.draw(player.t); }
  };
}

function fillCharacters() {
  $("#cast-grid").innerHTML = state.characters.map((c) => `
    <article class="person">
      <img src="${asset(c.styles[state.project.imageStyle] || c.styles.realistic)}" alt="${c.nameEn}">
      <div class="meta">
        <b><i class="swatch" style="background:${c.color}"></i> ${c.name} · ${c.nameEn}</b>
        <p class="muted">${c.bio}</p>
      </div>
    </article>
  `).join("");
}

function fillVoices() {
  $("#voice-table").innerHTML = state.voices.map((v) =>
    `<tr><td>${v.label}</td><td>${v.language}</td><td>${v.useCase}</td><td>${v.sample}</td></tr>`
  ).join("");
}

function fillCaptions() {
  const rows = [];
  for (const scene of state.episode.scenes) {
    for (const cue of scene.cues || []) rows.push(cue);
  }
  $("#caption-table").innerHTML = rows.map((c) =>
    `<tr><td>${fmt(c.start)}</td><td>${c.speaker}</td><td>${c.en}</td><td>${c.ar}</td></tr>`
  ).join("");
}

function fillClips() {
  $("#clip-list").innerHTML = state.clips.queries.map((q) => `
    <div class="clip-row">
      <div>
        <b>${q.phrase}</b>
        <p class="muted">${q.use} · ≤ ${q.maxSeconds}s</p>
      </div>
      <div>
        ${state.clips.sources.map((s) =>
          `<a class="btn ghost" target="_blank" rel="noreferrer" href="${s.search.replace("{q}", encodeURIComponent(q.phrase))}">${s.name}</a>`
        ).join(" ")}
      </div>
    </div>
  `).join("");
  $("#fair-use").innerHTML = state.clips.fairUse.map((x) => `<li>${x}</li>`).join("");
}

function fillHistory() {
  const box = $("#history-table");
  const sorted = [...state.history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  box.innerHTML = sorted.map((h) => `
    <tr>
      <td>${h.variant}</td>
      <td>${h.overlay}</td>
      <td><b>${h.predictedCtr}%</b></td>
      <td>${h.overall}</td>
      <td>${new Date(h.createdAt).toLocaleString("ar")}</td>
    </tr>
  `).join("");
  const max = Math.max(...state.history.map((h) => h.predictedCtr), 1);
  $("#ctr-bars").innerHTML = sorted.map((h) => `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span>${h.variant}</span><b>${h.predictedCtr}%</b>
      </div>
      <div class="score"><i style="width:${(h.predictedCtr / max) * 100}%"></i></div>
    </div>
  `).join("");
}

async function setupThumbLab() {
  const canvas = $("#thumb-canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const plates = [
    { id: "maya", src: "assets/images/thumbnails/plate-maya-curious.jpg", label: "وجه مايا" },
    { id: "sami", src: "assets/images/characters/sami-realistic.jpg", label: "سامي" },
    { id: "studio", src: "assets/images/scenes/studio-wide.jpg", label: "الاستوديو" },
  ];
  $("#plate-pick").innerHTML = plates.map((p, i) =>
    `<button class="choice ${i === 0 ? "on" : ""}" data-plate="${p.src}">${p.label}</button>`
  ).join("");
  let current = plates[0].src;
  const overlay = $("#overlay-text");
  const preview = async () => {
    try {
      const img = await loadPlate(current);
      composeThumbnail(canvas, { plate: img, overlay: overlay.value, color: "#f5d56e" });
    } catch { /* plate missing is fine */ }
  };
  $("#plate-pick").onclick = (e) => {
    const b = e.target.closest("[data-plate]");
    if (!b) return;
    current = b.dataset.plate;
    $$("#plate-pick .choice").forEach((x) => x.classList.toggle("on", x === b));
    preview();
  };
  overlay.addEventListener("input", preview);
  preview();

  $("#analyze-btn").onclick = async () => {
    const result = await runAnalysis({
      plateSrc: current,
      overlay: overlay.value,
      title: state.episode.youtube.title,
      meta: {
        variant: overlay.value || "untitled",
        hasFace: current.includes("maya") || current.includes("sami") || current.includes("omar"),
        emotion: $("#emotion").value,
        curiosityGap: $("#gap").checked,
        color: "#f5d56e",
        align: "left",
      },
      canvas,
    });
    state.history.unshift(result);
    persist(state);
    paintResult(result);
    fillHistory();
    $("#stat-ctr").textContent = `${bestCtr()}%`;
  };
}

function paintResult(r) {
  $("#ctr-number").textContent = `${r.predictedCtr}%`;
  $("#ctr-band").textContent = r.band;
  $("#ctr-notes").innerHTML = r.notes.map((n) => `<li>${n}</li>`).join("");
  $("#ctr-scores").innerHTML = Object.entries(r.scores).map(([k, v]) =>
    `<div><div class="muted">${k}</div><div class="score"><i style="width:${v}%"></i></div></div>`
  ).join("");
}

function setupPng() {
  const canvas = $("#png-canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const fields = ["png-en", "png-ipa", "png-ar", "png-ex"].map((id) => $(`#${id}`));
  const paint = () => drawExplainer(canvas, {
    en: fields[0].value,
    ipa: fields[1].value,
    ar: fields[2].value,
    ex: fields[3].value,
    color: "#0f766e",
  });
  fields.forEach((f) => f.addEventListener("input", paint));
  paint();
  $("#png-download").onclick = () => downloadCanvas(canvas, `${fields[0].value || "card"}.png`);
  $("#png-preset").onclick = () => {
    const cards = state.episode.scenes.find((s) => s.type === "vocab")?.cards || [];
    const card = cards[Math.floor(Math.random() * cards.length)];
    if (!card) return;
    fields[0].value = card.en;
    fields[1].value = card.ipa;
    fields[2].value = card.ar;
    fields[3].value = card.ex;
    paint();
  };
}

function setupExport() {
  $("#dl-json").onclick = () => saveText("episode.json", JSON.stringify(state.episode, null, 2), "application/json");
  $("#dl-srt-en").onclick = () => saveText("episode-en.srt", toSrt(state.episode, "en"));
  $("#dl-srt-ar").onclick = () => saveText("episode-ar.srt", toSrt(state.episode, "ar"));
  $("#dl-vtt").onclick = () => saveText("episode.vtt", toVtt(state.episode));
  $("#dl-hf").onclick = () => saveText("ep-01.hyperframes.html", toHyperframes(state.episode), "text/html");
  $("#dl-yt").onclick = () => saveText("youtube.txt", youtubeCopy(state.episode));
  $("#dl-history").onclick = () => saveText("thumbnail-history.json", JSON.stringify({ analyses: state.history }, null, 2), "application/json");
}

function setupPlayer() {
  player = new EpisodePlayer({
    stage: $("#stage"),
    episode: state.episode,
    characters: state.characters,
    lexicon: state.lexicon,
    style: state.project.imageStyle,
  });
  bindTransport(player, {
    playBtn: $("#play-btn"),
    range: $("#seek"),
    read: $("#time-read"),
  });
  $("#safe-btn").onclick = () => $("#stage").classList.toggle("show-safe");
  const tl = $("#tracks");
  const dur = state.episode.duration;
  tl.innerHTML = state.episode.scenes.map((s) => {
    const left = (s.start / dur) * 100;
    const width = ((s.end - s.start) / dur) * 100;
    const color = s.type === "dialogue" ? "#0284c7" : s.type === "host" || s.type === "explain" ? "#0f766e" : "#d4a017";
    return `<div class="tl-row"><span>${s.label}</span>
      <div class="track"><i class="block" style="left:${left}%;width:${width}%;background:${color}">${s.type}</i>
      <b class="playhead" data-ph></b></div></div>`;
  }).join("");
  player.onTick = (t) => {
    $("#seek").value = t;
    $("#time-read").textContent = `${fmt(t)} / ${fmt(dur)}`;
    $$("[data-ph]").forEach((ph) => { ph.style.left = `${(t / dur) * 100}%`; });
  };
}

fillDashboard();
fillCreate();
fillCharacters();
fillVoices();
fillCaptions();
fillClips();
fillHistory();
setupPlayer();
await setupThumbLab();
setupPng();
setupExport();
window.addEventListener("hashchange", route);
route();

if (state.history[0]) paintResult(state.history[0]);
