import { $, fmt, paintKeywords } from "./utils.js";
import { asset } from "./store.js";

export class EpisodePlayer {
  constructor({ stage, episode, characters, lexicon, style = "realistic" }) {
    this.stage = stage;
    this.episode = episode;
    this.characters = Object.fromEntries(characters.map((c) => [c.id, c]));
    this.lexicon = lexicon;
    this.style = style;
    this.t = 0;
    this.playing = false;
    this.raf = 0;
    this.last = 0;
    this.spoken = new Set();
    this.audioEl = null;
    this.onTick = () => {};
    this.build();
  }

  build() {
    this.stage.innerHTML = `
      <div class="bg" data-el="bg"></div>
      <div class="veil"></div>
      <div class="safe"></div>
      <div class="chrome">
        <div class="series">
          <span>${this.episode.series}</span>
          <span class="ep-no">EP ${String(this.episode.number).padStart(2, "0")}</span>
        </div>
        <div data-el="body" class="hero"></div>
        <div class="rail">
          <div class="who-pill" data-el="who" hidden></div>
          <div class="cap" data-el="cap" hidden>
            <p class="en" data-el="en"></p>
            <p class="ar" data-el="ar"></p>
          </div>
        </div>
      </div>
    `;
    this.els = {
      bg: $('[data-el="bg"]', this.stage),
      body: $('[data-el="body"]', this.stage),
      who: $('[data-el="who"]', this.stage),
      cap: $('[data-el="cap"]', this.stage),
      en: $('[data-el="en"]', this.stage),
      ar: $('[data-el="ar"]', this.stage),
    };
    this.draw(0);
  }

  sceneAt(t) {
    return this.episode.scenes.find((s) => t >= s.start && t < s.end) || this.episode.scenes[0];
  }

  cueAt(scene, t) {
    return (scene.cues || []).find((c) => t >= c.start && t < c.end) || null;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.playing) return;
      this.t += (now - this.last) / 1000;
      this.last = now;
      if (this.t >= this.episode.duration) {
        this.t = this.episode.duration;
        this.pause();
      }
      this.draw(this.t);
      this.onTick(this.t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (this.audioEl) { this.audioEl.pause(); this.audioEl = null; }
  }

  seek(t) {
    this.t = Math.max(0, Math.min(this.episode.duration, t));
    this.spoken.clear();
    if (window.speechSynthesis) speechSynthesis.cancel();
    this.draw(this.t);
    this.onTick(this.t);
  }

  draw(t) {
    const scene = this.sceneAt(t);
    const cue = this.cueAt(scene, t);
    const visual = this.episode.visuals[scene.visual] || this.episode.visuals.studio;
    this.els.bg.style.backgroundImage = `url("${asset(visual)}")`;

    this.renderBody(scene, t);
    this.renderCaption(cue);

    if (this.playing && cue && !this.spoken.has(cue.id || cue.start)) {
      this.spoken.add(cue.id || cue.start);
      this.speak(cue);
    }
  }

  renderBody(scene, t) {
    const el = this.els.body;
    if (scene.type === "title") {
      el.className = "hero";
      el.innerHTML = `<h2>${this.episode.title}</h2><p>${this.episode.titleAr}</p>`;
      return;
    }
    if (scene.type === "host" || scene.type === "outro") {
      el.className = "hero";
      const next = scene.next ? `<p>${scene.next}</p>` : `<p>${this.episode.goal}</p>`;
      el.innerHTML = `<h2>${scene.type === "outro" ? "Your turn in the comments" : "Five sentences"}</h2>${next}`;
      return;
    }
    if (scene.type === "dialogue") {
      el.className = "faces";
      const active = this.cueAt(scene, t)?.speaker;
      el.innerHTML = ["maya", "sami", "omar"].map((id) => {
        const c = this.characters[id];
        if (!c) return "";
        const on = id === active ? "on" : "";
        return `<div class="face ${on}" style="--who:${c.color}">
          <img src="${asset(c.styles[this.style] || c.styles.realistic)}" alt="${c.nameEn}">
          <b>${c.nameEn}</b>
        </div>`;
      }).join("");
      return;
    }
    if (scene.type === "explain") {
      el.className = "hero";
      const cue = this.cueAt(scene, t);
      el.innerHTML = `<div class="phrase">${cue ? cue.en : ""}<div class="extra">${cue ? cue.ar : ""}</div></div>`;
      return;
    }
    if (scene.type === "vocab") {
      const card = (scene.cards || []).find((c) => t >= c.start && t < c.end) || scene.cards[0];
      el.className = "hero";
      el.innerHTML = `<article class="vocab-card">
        <p class="en">${card.en}</p>
        <p class="ipa">${card.ipa}</p>
        <p class="ar-mean">${card.ar}</p>
        <p class="ex">${card.ex}</p>
      </article>`;
      return;
    }
    if (scene.type === "drill") {
      const item = (scene.items || []).find((c) => t >= c.start && t < c.end) || scene.items[0];
      const mid = (item.start + item.end) / 2;
      const waiting = t > mid;
      el.className = "hero";
      el.innerHTML = `<article class="drill-card">
        ${waiting ? '<div class="ring"></div>' : ""}
        <p class="en" style="font-family:var(--font-display);font-size:clamp(22px,3vw,42px)">${item.prompt}</p>
        <p>${item.hint}</p>
        ${waiting ? '<span class="your-turn">Your turn · دورك الآن</span>' : ""}
      </article>`;
      return;
    }
    if (scene.type === "quiz") {
      const item = (scene.items || []).find((c) => t >= c.start && t < c.end) || scene.items[0];
      const shown = t >= item.reveal;
      el.className = "hero";
      el.innerHTML = `<article class="quiz-card">
        <p class="muted">${item.qAr}</p>
        <p class="en" style="font-family:var(--font-display);font-size:clamp(22px,3vw,40px)">${item.q}</p>
        ${shown ? `<p class="extra" style="color:var(--teal)">${item.a}</p><p>${item.aAr}</p>` : `<p class="muted">فكّر…</p>`}
      </article>`;
    }
  }

  renderCaption(cue) {
    if (!cue) {
      this.els.cap.hidden = true;
      this.els.who.hidden = true;
      return;
    }
    const who = this.characters[cue.speaker];
    this.els.cap.hidden = false;
    this.els.en.innerHTML = paintKeywords(cue.en, this.lexicon);
    this.els.ar.textContent = cue.ar;
    if (who) {
      this.els.who.hidden = false;
      this.els.who.textContent = who.nameEn;
      this.els.who.style.background = who.color;
      this.els.who.style.color = "#111";
    }
  }

  speak(cue) {
    if (!cue) return;
    if (this.audioEl) { this.audioEl.pause(); this.audioEl = null; }
    if (cue.audio) {
      const el = new Audio(asset(cue.audio));
      this.audioEl = el;
      el.play().catch(() => this.speakFallback(cue));
      return;
    }
    this.speakFallback(cue);
  }

  speakFallback(cue) {
    if (!window.speechSynthesis || !cue) return;
    const who = this.characters[cue.speaker];
    const text = who?.language === "ar" ? cue.ar : cue.en;
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = who?.language === "ar" ? "ar-SA" : "en-US";
    u.rate = 0.92;
    const voices = speechSynthesis.getVoices();
    const pick = voices.find((v) => {
      if (who?.language === "ar") return v.lang.startsWith("ar");
      if (who?.gender === "feminine") return v.lang.startsWith("en") && /female|samantha|victoria|zira/i.test(v.name);
      return v.lang.startsWith("en") && /male|david|daniel|alex/i.test(v.name);
    }) || voices.find((v) => v.lang.startsWith(who?.language === "ar" ? "ar" : "en"));
    if (pick) u.voice = pick;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
}

export function bindTransport(player, { playBtn, range, read }) {
  playBtn.addEventListener("click", () => {
    if (player.playing) { player.pause(); playBtn.textContent = "تشغيل"; }
    else { player.play(); playBtn.textContent = "إيقاف"; }
  });
  range.max = player.episode.duration;
  range.addEventListener("input", () => player.seek(Number(range.value)));
  player.onTick = (t) => {
    range.value = t;
    read.textContent = `${fmt(t)} / ${fmt(player.episode.duration)}`;
  };
  player.onTick(0);
}
